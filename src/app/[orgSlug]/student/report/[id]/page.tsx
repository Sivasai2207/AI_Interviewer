"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import { getInterviewReport, getInterview, getTranscript } from "@/lib/firebase/firestore";
import type { InterviewReport, Interview, TranscriptChunk } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    CheckCircle,
    FileText,
    MessageSquare,
    ArrowLeft,
    Share2,
    Download,
} from "lucide-react";

export default function InterviewReportPage() {
    const params = useParams();
    const router = useRouter();
    const { orgId, orgSlug } = useOrg();
    const interviewId = params.id as string;

    const [report, setReport] = useState<InterviewReport | null>(null);
    const [interview, setInterview] = useState<Interview | null>(null);
    const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId && interviewId) {
            loadReport();
        }
    }, [orgId, interviewId]);

    const loadReport = async () => {
        try {
            const [reportData, interviewData, transcriptData] = await Promise.all([
                getInterviewReport(orgId!, interviewId),
                getInterview(orgId!, interviewId),
                getTranscript(orgId!, interviewId),
            ]);
            setReport(reportData);
            setInterview(interviewData);
            setTranscript(transcriptData);
        } catch (error) {
            console.error("Error loading report:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600 border-green-200 bg-green-50";
        if (score >= 60) return "text-yellow-600 border-yellow-200 bg-yellow-50";
        return "text-red-600 border-red-200 bg-red-50";
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-bold">Report Not Ready</h2>
                <p className="text-muted-foreground">The interview may still be in progress or processing.</p>
                <Link href={`/${orgSlug}/student`}>
                    <Button variant="link" className="mt-4">
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        );
    }

    // Attempt to parse feedback if it's JSON
    let parsedFeedback: any = null;
    try {
        parsedFeedback = report.feedback ? JSON.parse(report.feedback) : null;
    } catch {
        // Not JSON, treat as string
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/${orgSlug}/student`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Interview Report</h1>
                        <p className="text-muted-foreground">
                            {interview?.roleApplied} • {report.generatedAt ? new Date(report.generatedAt.toDate()).toLocaleDateString() : 'Date N/A'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Score Overview */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Overall Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                        <div className={`flex h-32 w-32 items-center justify-center rounded-full border-4 text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
                            {report.overallScore > 0 ? report.overallScore : "?"}
                        </div>
                        <p className="mt-4 text-center text-sm text-muted-foreground">
                            {report.overallScore >= 70 ? "Ready for Job" : "Needs Improvement"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Key Takeaways</CardTitle>
                        <CardDescription>Generated by AI Evaluator</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {parsedFeedback ? (
                                <>
                                    <div>
                                        <h4 className="font-semibold text-green-600 mb-2">Strengths</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                            {parsedFeedback.strengths?.map((s: string, i: number) => (
                                                <li key={i}>{s}</li>
                                            )) || <li>See detailed feedback below</li>}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-red-600 mb-2">Areas for Improvement</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                            {parsedFeedback.weaknesses?.map((s: string, i: number) => (
                                                <li key={i}>{s}</li>
                                            )) || <li>See detailed feedback below</li>}
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                                    {(report.feedback || "").slice(0, 500)}...
                                    <p className="text-xs mt-2 italic">(See full breakdown below)</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Feedback & Transcript */}
            <Tabs defaultValue="feedback" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="feedback">
                        <FileText className="mr-2 h-4 w-4" />
                        Detailed Feedback
                    </TabsTrigger>
                    <TabsTrigger value="transcript">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Transcript
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="feedback" className="mt-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="prose prose-slate max-w-none dark:prose-invert whitespace-pre-wrap">
                                {parsedFeedback?.detailed || report.feedback || "No feedback available."}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transcript" className="mt-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {transcript.length > 0 ? (
                                transcript.map((entry, index) => (
                                    <div
                                        key={index}
                                        className={`flex gap-4 p-4 rounded-lg ${
                                            entry.speaker === "interviewer"
                                                ? "bg-muted/50"
                                                : "bg-primary/5"
                                        }`}
                                    >
                                        <div className="flex-shrink-0 w-24">
                                            <span className={`text-xs font-bold uppercase ${
                                                entry.speaker === "interviewer"
                                                    ? "text-muted-foreground"
                                                    : "text-primary"
                                            }`}>
                                                {entry.speaker}
                                            </span>
                                        </div>
                                        <div className="flex-1 whitespace-pre-wrap text-sm">
                                            {entry.text}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center">No transcript available.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
