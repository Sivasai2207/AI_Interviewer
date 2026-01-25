import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { EVALUATOR_PROMPT, buildInterviewSystemPrompt, getExperienceMode } from "@/lib/gemini/prompts";

/**
 * POST /api/student/interview/generate-report
 * 
 * Fetches the interview transcript, sends it to Gemini for evaluation,
 * and saves the performance report to Firestore.
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const body = await request.json();
        const { interviewId, orgId } = body;

        if (!interviewId || !orgId) {
            return NextResponse.json({ error: "Missing interviewId or orgId" }, { status: 400 });
        }

        // 1. Fetch interview document
        const interviewRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("interviews")
            .doc(interviewId);

        const interviewDoc = await interviewRef.get();
        if (!interviewDoc.exists) {
            return NextResponse.json({ error: "Interview not found" }, { status: 404 });
        }

        const interview = interviewDoc.data()!;
        if (interview.uid !== uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 2. Fetch transcript
        const transcriptSnapshot = await interviewRef
            .collection("transcript")
            .orderBy("sequenceNumber", "asc")
            .get();

        const transcriptChunks = transcriptSnapshot.docs.map(doc => doc.data());

        if (transcriptChunks.length === 0) {
            return NextResponse.json({ error: "No transcript found" }, { status: 400 });
        }

        // 3. Build conversation JSON
        const conversationLog = transcriptChunks.map(chunk => ({
            speaker: chunk.speaker === "interviewer" ? "Tess (AI)" : "Candidate",
            text: chunk.text,
            timestamp: chunk.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));

        // 4. Fetch user's API key
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (!userData?.aiKeyEncrypted) {
            return NextResponse.json({ error: "API key not found" }, { status: 400 });
        }

        // Decrypt API key
        const { decryptApiKey } = await import("@/lib/utils/crypto");
        const apiKey = decryptApiKey(userData.aiKeyEncrypted);

        // 5. Build evaluation prompt
        const mode = getExperienceMode(parseInt(interview.jdYearsRequired || "0") || 0);
        const evaluationContext = `
${EVALUATOR_PROMPT}

--- INTERVIEW CONTEXT ---
Candidate: ${interview.resumeText?.split('\n')[0] || "Unknown"}
Role Applied: ${interview.roleApplied || "Software Developer"}
Experience Level: ${mode}
Duration: ${interview.durationMin} minutes
Has JD: ${interview.hasJD}

--- RESUME TEXT ---
${interview.resumeText || "[No resume provided]"}

${interview.hasJD && interview.jdText ? `--- JOB DESCRIPTION ---\n${interview.jdText}` : ""}

--- CONVERSATION TRANSCRIPT ---
${conversationLog.map(c => `[${c.speaker}]: ${c.text}`).join('\n\n')}

--- END TRANSCRIPT ---

Based on this interview, generate a comprehensive performance report in JSON format with the following structure:
{
  "overallScore": <0-100>,
  "breakdown": {
    "fundamentals": <0-100>,
    "projectDepth": <0-100>,
    "problemSolving": <0-100>,
    "systemDesign": <0-100>,
    "communication": <0-100>,
    "roleFit": <0-100>
  },
  "strengths": [{ "point": "...", "evidence": "..." }],
  "weaknesses": [{ "point": "...", "evidence": "..." }],
  "redFlags": ["..."],
  "missedOpportunities": ["..."],
  "actionPlan": {
    "sevenDay": ["..."],
    "thirtyDay": ["..."]
  },
  "practiceQuestions": ["..."],
  "verdict": "strong_hire" | "hire" | "lean_hire" | "lean_no" | "no",
  "feedback": "..."
}

Return ONLY valid JSON.
`;

        // 6. Call Gemini for evaluation
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-05-20",
            contents: evaluationContext,
        });

        const responseText = response.text || "";

        // Extract JSON from response
        let reportData;
        try {
            // Try to parse the response directly
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                reportData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found in response");
            }
        } catch (parseErr) {
            console.error("[GenerateReport] Failed to parse report JSON:", parseErr);
            // Create a fallback report
            reportData = {
                overallScore: 50,
                breakdown: {
                    fundamentals: 50,
                    projectDepth: 50,
                    problemSolving: 50,
                    systemDesign: 50,
                    communication: 50,
                    roleFit: 50,
                },
                strengths: [{ point: "Completed interview", evidence: "Participated in the full session" }],
                weaknesses: [{ point: "Report generation issue", evidence: "Could not parse AI evaluation" }],
                redFlags: [],
                missedOpportunities: [],
                actionPlan: { sevenDay: ["Review session"], thirtyDay: ["Practice more"] },
                practiceQuestions: [],
                verdict: "lean_no",
                feedback: "Report generation encountered an issue. Please review transcript manually.",
            };
        }

        // 7. Save report to Firestore
        await interviewRef.collection("report").add({
            ...reportData,
            generatedAt: FieldValue.serverTimestamp(),
            conversationLog,
        });

        // 8. Update interview status
        await interviewRef.update({
            status: "report_ready",
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[GenerateReport] Report generated for interview ${interviewId}`);

        return NextResponse.json({
            success: true,
            report: reportData,
        });

    } catch (error: any) {
        console.error("[GenerateReport] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate report" },
            { status: 500 }
        );
    }
}
