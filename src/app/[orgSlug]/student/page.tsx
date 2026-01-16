"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "../layout";
import { getStudentPerformanceStats, getUserInterviews } from "@/lib/firebase/firestore";
import type { StudentPerformanceStats, Interview } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    PlusCircle,
    ClipboardList,
    Target,
    TrendingUp,
    ArrowRight,
    Loader2,
    BookOpen,
} from "lucide-react";

export default function StudentDashboardPage() {
    const { user, userProfile } = useAuth();
    const { organization, orgId, orgSlug } = useOrg();
    const [stats, setStats] = useState<StudentPerformanceStats | null>(null);
    const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId && user?.uid) {
            loadDashboardData();
        }
    }, [orgId, user?.uid]);

    const loadDashboardData = async () => {
        try {
            const [performanceStats, interviews] = await Promise.all([
                getStudentPerformanceStats(orgId!, user!.uid),
                getUserInterviews(orgId!, user!.uid),
            ]);
            setStats(performanceStats);
            setRecentInterviews(interviews.slice(0, 5));
        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        Welcome, {userProfile?.displayName?.split(" ")[0] || "Student"}!
                    </h1>
                    <p className="text-muted-foreground">
                        Practice makes perfect. Start your mock interview journey.
                    </p>
                </div>
                <Link href={`/${orgSlug}/student/new-interview`}>
                    <Button className="btn-premium" size="lg">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Start New Interview
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Interviews"
                    value={stats?.totalInterviews || 0}
                    icon={ClipboardList}
                />
                <StatsCard
                    title="Completed"
                    value={stats?.completedInterviews || 0}
                    icon={Target}
                />
                <StatsCard
                    title="Average Score"
                    value={stats?.averageScore !== null ? `${stats.averageScore}%` : "N/A"}
                    icon={TrendingUp}
                />
                <Card className="bg-gradient-to-br from-primary to-blue-600 text-white">
                    <CardContent className="flex flex-col justify-center p-6 h-full">
                        <p className="text-sm opacity-90">Ready to improve?</p>
                        <p className="text-lg font-bold mt-1">Take another interview!</p>
                    </CardContent>
                </Card>
            </div>

            {/* Skill Progress */}
            {stats?.skillBreakdown && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Skills Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(stats.skillBreakdown).map(([skill, score]) => (
                                <div key={skill} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="capitalize">
                                            {skill.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <span className="font-medium">{score}%</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${
                                                score >= 70
                                                    ? "bg-green-500"
                                                    : score >= 50
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                            }`}
                                            style={{ width: `${score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Interviews */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentInterviews.length === 0 ? (
                        <div className="py-12 text-center">
                            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-4">
                                No interviews yet. Start your first one!
                            </p>
                            <Link href={`/${orgSlug}/student/new-interview`}>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Start Interview
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentInterviews.map((interview) => (
                                <Link
                                    key={interview.id}
                                    href={
                                        interview.status === "report_ready"
                                            ? `/${orgSlug}/student/report/${interview.id}`
                                            : interview.status === "live"
                                            ? `/${orgSlug}/student/room/${interview.id}`
                                            : "#"
                                    }
                                    className="flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50 hover:border-primary/50"
                                >
                                    <div>
                                        <p className="font-medium">{interview.roleApplied}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {interview.mode} • {interview.durationMin}min • {interview.targetIndustry}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <StatusBadge status={interview.status} />
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-muted/50">
                <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">💡 Interview Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Take interviews regularly to track improvement</li>
                        <li>• Review your reports to understand weak areas</li>
                        <li>• Practice different difficulty modes</li>
                        <li>• Upload your latest resume for relevant questions</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        created: "bg-gray-500/10 text-gray-500",
        live: "bg-blue-500/10 text-blue-500",
        ended: "bg-yellow-500/10 text-yellow-500",
        report_ready: "bg-green-500/10 text-green-500",
    };

    const labels: Record<string, string> = {
        created: "Not Started",
        live: "In Progress",
        ended: "Evaluating",
        report_ready: "View Report",
    };

    return (
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || "bg-muted"}`}>
            {labels[status] || status}
        </span>
    );
}
