"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "../../layout";
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
import { Card } from "@/components/ui/card";
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
        isRecording,
        currentQuestion,
        transcript,
        isEvaluatorMode,
        timeRemaining,
        setRecording,
        setCurrentQuestion,
        addTranscriptEntry,
        setEvaluatorMode,
        setTimeRemaining,
        decrementTime,
        resetInterview,
    } = useInterviewStore();

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
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording && !isEvaluatorMode && timeRemaining > 0) {
            interval = setInterval(() => {
                decrementTime();
            }, 1000);
        } else if (timeRemaining === 0 && !isEvaluatorMode) {
            handleTimeUp();
        }
        return () => clearInterval(interval);
    }, [isRecording, isEvaluatorMode, timeRemaining]);

    const loadInterview = async () => {
        try {
            const data = await getInterview(orgId!, interviewId);
            if (!data) throw new Error("Interview not found");
            
            if (data.status === "ended" || data.status === "report_ready") {
                router.push(`/${orgSlug}/student/report/${interviewId}`);
                return;
            }

            setInterview(data);
            setTimeRemaining(data.durationMin * 60);

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
                experience: data.yearsOfExperience,
                jdText: data.jobDescription,
                hasJD: !!data.jobDescription,
                mode: "voice", // or from data
            };

            const firstQuestion = await client.initializeInterview(context);
            setCurrentQuestion(firstQuestion);
            setRecording(true);
            
            // Log event
            await addInterviewEvent(orgId!, interviewId, {
                type: "start",
                description: "Interview started",
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
            addTranscriptEntry({ speaker: "candidate", text: answer, timestamp: Date.now() });
            await addTranscriptChunk(orgId!, interviewId, {
                speaker: "candidate",
                text: answer,
                timestamp: Date.now(),
            });

            const client = getGeminiClient(GEMINI_API_KEY);
            const response = await client.sendMessage(answer, timeRemaining);

            // Check if AI switched to evaluator mode (triggered internally or by prompt)
            if (client.getIsEvaluatorMode()) {
                await handleEndInterview();
            } else {
                // Add AI question
                setCurrentQuestion(response);
                addTranscriptEntry({ speaker: "interviewer", text: response, timestamp: Date.now() });
                await addTranscriptChunk(orgId!, interviewId, {
                    speaker: "interviewer",
                    text: response,
                    timestamp: Date.now(),
                });
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
                experience: interview!.yearsOfExperience,
                jdText: interview!.jobDescription,
                hasJD: !!interview!.jobDescription,
                mode: "voice",
            };

            // Generate Report
            const reportRaw = await client.generateReport(context, transcript);
            
            // Parse Report (Assuming JSON or Structure, but assuming Raw text for now or simple parse)
            // Ideally prompts.ts returns structured JSON. For now we save the raw report
            // or we try to parse it if we formatted the prompt that way.
            // Let's assume it's Markdown/Text for now and we save it.
            
            await saveInterviewReport(orgId!, interviewId, {
                interviewId,
                userId: user!.uid,
                score: 0, // Placeholder, usually parsed from report
                feedback: reportRaw,
                strengths: [],
                weaknesses: [],
                transcript: transcript,
                createdAt: new Date(),
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
                role={interview?.roleApplied || "Candidate"}
                status={isEvaluatorMode ? "Evaluator Mode" : "Live Interview"}
                timeRemaining={timeRemaining}
                onEndSession={handleEndInterview}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Panel: Question & Input */}
                <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                    <QuestionPanel
                        question={currentQuestion}
                        isTyping={isSubmitting} // AI thinking state
                    />
                    
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
                    <TranscriptPanel
                        transcript={transcript}
                        className="flex-1"
                    />
                    <Timer
                        seconds={timeRemaining}
                        totalSeconds={interview?.durationMin ? interview.durationMin * 60 : 900}
                    />
                </div>
            </div>
        </div>
    );
}
