"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { useInterviewStore } from "@/store";
import { getGeminiClient } from "@/lib/gemini/client";
import {
    getInterview,
    updateInterview,
    addInterviewEvent,
    addTranscriptChunk,
    saveInterviewReport,
} from "@/lib/firebase/firestore";
import {
    QuestionPanel,
    AnswerInput,
    TranscriptPanel,
    Timer,
    InterviewHeader,
} from "@/components/interview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import type { Interview, InterviewContext } from "@/types";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export default function InterviewRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { orgId, orgSlug } = useOrg();
    const interviewId = params.id as string;

    const {
        timer,
        currentQuestion,
        transcript,
        isEvaluatorMode,
        updateTimer,
        setCurrentQuestion,
        addToTranscript,
        setEvaluatorMode,
        reset: resetInterview,
    } = useInterviewStore();

    // Map store values to local variables for compatibility
    const isRecording = timer.isRunning;
    const timeRemaining = timer.remainingSeconds;
    const setRecording = (isRunning: boolean) => updateTimer({ isRunning });

    const [interview, setInterview] = useState<Interview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Load
    useEffect(() => {
        if (!user || !orgId) return;
        
        loadInterview();
        return () => resetInterview();
    }, [user, orgId, interviewId]);

    // Timer logic
    // Timer logic is handled in Timer component
    useEffect(() => {
        if (timeRemaining === 0 && !isEvaluatorMode && interview) {
             // Optional: handle side effects if timer hits 0 from store updates
             // But Timer component calls onTimeUp, so we might not need this useEffect at all
             // except for synchronization issues. 
             // Leaving it empty or relying on Timer component callback.
        }
    }, [timeRemaining, isEvaluatorMode, interview]);

    const loadInterview = async () => {
        try {
            const data = await getInterview(orgId!, interviewId);
            if (!data) throw new Error("Interview not found");
            
            if (data.status === "ended" || data.status === "report_ready") {
                router.push(`/${orgSlug}/student/report/${interviewId}`);
                return;
            }

            setInterview(data);
            updateTimer({ 
                totalSeconds: data.durationMin * 60,
                remainingSeconds: data.durationMin * 60 
            });

            // Initialize AI
            await initializeAI(data);
        } catch (err: any) {
            setError(err.message || "Failed to load interview");
        } finally {
            setIsLoading(false);
        }
    };

    const initializeAI = async (data: Interview) => {
        try {
            const client = getGeminiClient(GEMINI_API_KEY);
            const context: InterviewContext = {
                role: data.roleApplied,
                industry: data.targetIndustry,
                mode: data.mode,
                durationMin: data.durationMin,
                resumeText: data.resumeText,
                hasJD: data.hasJD,
                jdText: data.jdText,
                jdYears: data.jdYearsRequired,
            };

            const firstQuestion = await client.initializeInterview(context);
            setCurrentQuestion(firstQuestion);
            setRecording(true);
            
            // Log start event
            await addInterviewEvent(orgId!, interviewId, {
                type: "start",
                payload: { text: "Interview started" },
            });
            
            // Update status to live
            await updateInterview(orgId!, interviewId, { status: "live" });

        } catch (err) {
            console.error("AI Init Error:", err);
            setError("Failed to start AI Interviewer. Please check configuration.");
        }
    };

    const handleSubmitAnswer = async (answer: string) => {
        if (!interview || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Add user answer to transcript
            const candidateChunk = {
                speaker: "candidate" as const,
                text: answer,
                sequenceNumber: transcript.length + 1,
            };
            addToTranscript(candidateChunk);
            await addTranscriptChunk(orgId!, interviewId, candidateChunk);
            const client = getGeminiClient(GEMINI_API_KEY);
            const response = await client.sendMessage(answer, timeRemaining);

            // Check if AI switched to evaluator mode (triggered internally or by prompt)
            if (client.getIsEvaluatorMode()) {
                await handleEndInterview();
            } else {
                // Add AI question
                setCurrentQuestion(response);
                const interviewerChunk = {
                    speaker: "interviewer" as const,
                    text: response,
                    sequenceNumber: transcript.length + 2, // approximation, strictly should be transcript.length + 1 after previous add
                };
                addToTranscript(interviewerChunk);
                await addTranscriptChunk(orgId!, interviewId, interviewerChunk);
            }
        } catch (err) {
            console.error("Error sending message:", err);
            // Retry logic or error toast could go here
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleIDontKnow = () => {
        handleSubmitAnswer("I don't know the answer to this question. Can we move to the next one?");
    };

    const handleTimeUp = async () => {
        const client = getGeminiClient(GEMINI_API_KEY);
        try {
            const response = await client.switchToEvaluatorMode();
            // We might want to show this final message before ending
            await handleEndInterview();
        } catch (err) {
            console.error("Time up error:", err);
            await handleEndInterview();
        }
    };

    const handleEndInterview = async () => {
        if (isEvaluatorMode) return;
        setEvaluatorMode(true);
        setRecording(false);
        setIsSubmitting(true);

        try {
            const client = getGeminiClient(GEMINI_API_KEY);
            const context: InterviewContext = {
                role: interview!.roleApplied,
                industry: interview!.targetIndustry,
                mode: interview!.mode,
                durationMin: interview!.durationMin,
                resumeText: interview!.resumeText,
                hasJD: interview!.hasJD,
                jdText: interview!.jdText,
                jdYears: interview!.jdYearsRequired,
            };

            // Generate Report
            const reportRaw = await client.generateReport(context, transcript);
            
            await saveInterviewReport(orgId!, interviewId, {
                verdict: "hire", // Placeholder
                overallScore: 0, // Placeholder
                feedback: reportRaw,
                breakdown: {
                    fundamentals: 0,
                    projectDepth: 0,
                    problemSolving: 0,
                    systemDesign: 0,
                    communication: 0,
                    roleFit: 0
                },
                strengths: [],
                weaknesses: [],
                redFlags: [],
                missedOpportunities: [],
                actionPlan: { sevenDay: [], thirtyDay: [] },
                practiceQuestions: [],
            });

            await updateInterview(orgId!, interviewId, { status: "report_ready" });
            
            router.push(`/${orgSlug}/student/report/${interviewId}`);

        } catch (err) {
            console.error("End interview error:", err);
            setError("Failed to generate report. But your interview is saved.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center flex-col gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Preparing your interview room...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="max-w-md bg-destructive/5 border-destructive/20">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                        <h2 className="text-xl font-bold text-destructive">Connection Error</h2>
                        <p className="text-sm text-foreground">{error}</p>
                        <Button onClick={() => router.push(`/${orgSlug}/student`)}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl p-4 lg:p-8 h-[calc(100vh-4rem)] flex flex-col gap-4">
            <InterviewHeader
                role={interview!.roleApplied}
                mode={interview!.mode}
                industry={interview!.targetIndustry}
                onEndInterview={handleEndInterview}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Panel: Question & Input */}
                <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                    <QuestionPanel className="mb-6" />
                    
                    <AnswerInput
                        onSubmit={handleSubmitAnswer}
                        onIDontKnow={handleIDontKnow}
                        disabled={isEvaluatorMode || isSubmitting}
                        isSubmitting={isSubmitting}
                        className="mt-auto"
                    />
                </div>

                {/* Right Panel: Transcript & Info */}
                <div className="flex flex-col gap-4 min-h-0">
                    <TranscriptPanel className="flex-1" />
                    <Timer
                        onTimeUp={handleTimeUp}
                    />
                </div>
            </div>
        </div>
    );
}
