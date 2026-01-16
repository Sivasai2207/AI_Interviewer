"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useOrg } from "../../../layout";
import {
    getUserProfile,
    getStudentPerformanceStats,
} from "@/lib/firebase/firestore";
import type { UserProfile, StudentPerformanceStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Loader2,
    Users,
    ClipboardList,
    TrendingUp,
    Target,
} from "lucide-react";

export default function StudentDetailPage() {
    const params = useParams();
    const { orgId, orgSlug } = useOrg();
    const studentId = params.id as string;

    const [student, setStudent] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<StudentPerformanceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId && studentId) {
            loadStudentData();
        }
    }, [orgId, studentId]);

    const loadStudentData = async () => {
        try {
            const [studentData, performanceStats] = await Promise.all([
                getUserProfile(studentId),
                getStudentPerformanceStats(orgId!, studentId),
            ]);
            setStudent(studentData);
            setStats(performanceStats);
        } catch (error) {
            console.error("Error loading student:", error);
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

    if (!student) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Student not found</p>
                <Link href={`/${orgSlug}/admin/students`}>
                    <Button variant="link" className="mt-2">
                        Back to Students
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/${orgSlug}/admin/students`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-2xl font-bold text-primary">
                            {student.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{student.displayName}</h1>
                        <p className="text-muted-foreground">{student.email}</p>
                    </div>
                </div>
            </div>

            {/* Info & Stats */}
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
                    title="Avg Score"
                    value={stats?.averageScore !== null ? `${stats.averageScore}%` : "N/A"}
                    icon={TrendingUp}
                />
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground">Registration</p>
                        <p className="text-xl font-bold">{student.registrationNumber}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {student.department || "No department"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Skill Breakdown */}
            {stats?.skillBreakdown && (
                <Card>
                    <CardHeader>
                        <CardTitle>Skill Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(stats.skillBreakdown).map(([skill, score]) => (
                                <div key={skill} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <span className="font-medium">{score}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Strengths</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.strengths && stats.strengths.length > 0 ? (
                            <ul className="space-y-2">
                                {stats.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground">No data yet</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Areas to Improve</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.weaknesses && stats.weaknesses.length > 0 ? (
                            <ul className="space-y-2">
                                {stats.weaknesses.map((w, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-red-500">•</span>
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground">No data yet</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Interviews */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats?.recentInterviews && stats.recentInterviews.length > 0 ? (
                        <div className="space-y-3">
                            {stats.recentInterviews.map((interview) => (
                                <div
                                    key={interview.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div>
                                        <p className="font-medium">{interview.roleApplied}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {interview.mode} • {interview.durationMin}min • {interview.targetIndustry}
                                        </p>
                                    </div>
                                    <StatusBadge status={interview.status} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            No interviews yet
                        </p>
                    )}
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

    return (
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || "bg-muted"}`}>
            {status.replace("_", " ")}
        </span>
    );
}
