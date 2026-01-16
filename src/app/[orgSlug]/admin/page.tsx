"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import { getOrgStats, getOrgStudents, getOrgInterviews } from "@/lib/firebase/firestore";
import type { OrgStats, UserProfile, Interview } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    ClipboardList,
    TrendingUp,
    UserPlus,
    ArrowRight,
    Loader2,
    Calendar,
} from "lucide-react";

export default function OrgAdminDashboardPage() {
    const { organization, orgId, orgSlug } = useOrg();
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [recentStudents, setRecentStudents] = useState<UserProfile[]>([]);
    const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId) {
            loadDashboardData();
        }
    }, [orgId]);

    const loadDashboardData = async () => {
        try {
            const [orgStats, students, interviews] = await Promise.all([
                getOrgStats(orgId!),
                getOrgStudents(orgId!),
                getOrgInterviews(orgId!, 10),
            ]);
            setStats(orgStats);
            setRecentStudents(students.slice(0, 5));
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome to {organization?.name} Admin Portal
                    </p>
                </div>
                <Link href={`/${orgSlug}/admin/register`}>
                    <Button className="btn-premium">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Students
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Students"
                    value={stats?.studentCount || 0}
                    icon={Users}
                />
                <StatsCard
                    title="Total Staff"
                    value={stats?.staffCount || 0}
                    icon={Users}
                />
                <StatsCard
                    title="Interviews"
                    value={stats?.interviewCount || 0}
                    icon={ClipboardList}
                />
                <StatsCard
                    title="This Week"
                    value={stats?.interviewsThisWeek || 0}
                    icon={Calendar}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Students */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Students</CardTitle>
                        <Link href={`/${orgSlug}/admin/students`}>
                            <Button variant="ghost" size="sm">
                                View All
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentStudents.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>No students registered yet</p>
                                <Link href={`/${orgSlug}/admin/register`}>
                                    <Button variant="link" className="mt-2">
                                        Register students
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentStudents.map((student) => (
                                    <Link
                                        key={student.id}
                                        href={`/${orgSlug}/admin/students/${student.id}`}
                                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium">{student.displayName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {student.registrationNumber} • {student.department || "N/A"}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Interviews */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Interviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentInterviews.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <ClipboardList className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>No interviews yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentInterviews.map((interview) => (
                                    <div
                                        key={interview.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{interview.roleApplied}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {interview.mode} • {interview.durationMin}min
                                            </p>
                                        </div>
                                        <StatusBadge status={interview.status} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-3">
                <QuickActionCard
                    title="Register Students"
                    description="Add new students individually or in bulk"
                    href={`/${orgSlug}/admin/register`}
                    icon={UserPlus}
                />
                <QuickActionCard
                    title="View Students"
                    description="Browse and manage all students"
                    href={`/${orgSlug}/admin/students`}
                    icon={Users}
                />
                <QuickActionCard
                    title="Settings"
                    description="Configure organization settings"
                    href={`/${orgSlug}/admin/settings`}
                    icon={TrendingUp}
                />
            </div>
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
}: {
    title: string;
    value: number;
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
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status] || "bg-muted"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function QuickActionCard({
    title,
    description,
    href,
    icon: Icon,
}: {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
}) {
    return (
        <Link href={href}>
            <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold">{title}</h3>
                            <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
