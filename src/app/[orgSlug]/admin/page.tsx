"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import { getOrgStats, getOrgStudents, getOrgInterviews } from "@/lib/firebase/firestore";
import type { OrgStats, UserProfile, Interview } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    ClipboardList,
    TrendingUp,
    UserPlus,
    ArrowRight,
    Loader2,
    Calendar,
    Sparkles,
    Briefcase,
    GraduationCap,
    Clock
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
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent pb-1">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1 flex items-center gap-2">
                        Welcome back to <span className="font-semibold text-foreground">{organization?.name}</span>
                        <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </p>
                </div>
                <div className="flex gap-3">
                     <Link href={`/${orgSlug}/admin/register`}>
                        <Button className="btn-premium shadow-lg hover:shadow-xl transition-all h-12 px-6 text-base">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Add Students
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                <StatsCard
                    title="Total Students"
                    value={stats?.studentCount || 0}
                    icon={Users}
                    trend="+12% from last month"
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    textColor="text-white"
                />
                <StatsCard
                    title="Total Faculty"
                    value={stats?.staffCount || 0}
                    icon={GraduationCap}
                    trend="Stable"
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    textColor="text-white"
                />
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Students */}
                <Card className="border-none shadow-lg h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                             <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Newest Students
                            </CardTitle>
                            <CardDescription>Recently joined members</CardDescription>
                        </div>
                        <Link href={`/${orgSlug}/admin/students`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                View All
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentStudents.length === 0 ? (
                            <div className="py-12 text-center bg-gray-50/50 rounded-lg border-dashed border-2 border-gray-100">
                                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-muted-foreground font-medium">No students registered yet</p>
                                <Link href={`/${orgSlug}/admin/register`}>
                                    <Button variant="link" className="mt-2 text-primary">
                                        Register your first student
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentStudents.map((student, i) => (
                                    <Link
                                        key={student.id}
                                        href={`/${orgSlug}/admin/students/${student.id}`}
                                        className="flex items-center justify-between rounded-xl bg-gray-50/80 p-4 transition-all hover:bg-white hover:shadow-md hover:scale-[1.01] group border border-transparent hover:border-gray-100 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {student.displayName?.[0]?.toUpperCase() || "S"}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{student.displayName}</p>
                                                <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-mono">{student.registrationNumber || "N/A"}</span>
                                                    <span>{student.department || "No Dept"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Interviews */}
                <Card className="border-none shadow-lg h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                             <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-indigo-600" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>Latest interview sessions</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentInterviews.length === 0 ? (
                             <div className="py-12 text-center bg-gray-50/50 rounded-lg border-dashed border-2 border-gray-100">
                                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <ClipboardList className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-muted-foreground font-medium">No interviews recorded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentInterviews.map((interview) => (
                                    <div
                                        key={interview.id}
                                        className="flex items-center justify-between rounded-xl bg-gray-50/80 p-4 transition-all hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Briefcase className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{interview.roleApplied}</p>
                                                <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                    <span>{interview.mode}</span>
                                                    <span>•</span>
                                                    <span>{interview.durationMin} min</span>
                                                </div>
                                            </div>
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
                    title="Register Users"
                    description="Onboard new students or faculty members"
                    href={`/${orgSlug}/admin/register`}
                    icon={UserPlus}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <QuickActionCard
                    title="Manage Directory"
                    description="View and manage student profiles"
                    href={`/${orgSlug}/admin/students`}
                    icon={Users}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <QuickActionCard
                    title="System Settings"
                    description="Configure organization preferences"
                    href={`/${orgSlug}/admin/settings`}
                    icon={TrendingUp}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
            </div>
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    color,
    textColor = "text-gray-900",
    fallbackColor
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    trend?: string;
    color: string;
    textColor?: string;
    fallbackColor?: string;
}) {
    // Determine gradient class, fallback to fallbackColor if emerald issues (generic fix logic, but assuming tailwind config is standard)
    const bgClass = color.includes("emerald") && !fallbackColor ? "bg-green-600" : color ?? fallbackColor;

    return (
        <Card className={`border-none shadow-lg overflow-hidden relative group`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 opacity-100 ${bgClass}`} />
            
            {/* Pattern overlay (optional) */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity" />

            <CardContent className="flex items-center justify-between p-6 relative z-10">
                <div>
                    <p className={`text-sm font-medium ${textColor} opacity-90`}>{title}</p>
                    <p className={`text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
                    {trend && (
                         <p className={`text-xs mt-2 ${textColor} opacity-75 font-medium flex items-center gap-1`}>
                            <TrendingUp className="h-3 w-3" /> {trend}
                        </p>
                    )}
                </div>
                <div className={`h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner`}>
                    <Icon className={`h-6 w-6 ${textColor}`} />
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        created: "bg-gray-100 text-gray-600 border-gray-200",
        live: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
        ended: "bg-yellow-100 text-yellow-700 border-yellow-200",
        report_ready: "bg-green-100 text-green-700 border-green-200",
    };

    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${styles[status] || "bg-gray-100 border-gray-100"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function QuickActionCard({
    title,
    description,
    href,
    icon: Icon,
    color,
    bg
}: {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
    color: string;
    bg: string;
}) {
    return (
        <Link href={href}>
            <Card className="transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer border-none shadow-md group h-full">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">{title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
