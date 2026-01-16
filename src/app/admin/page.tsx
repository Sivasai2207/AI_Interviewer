"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAllOrganizations, getPlatformStats } from "@/lib/firebase/firestore";
import type { Organization, PlatformStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Building2,
    Users,
    UserCheck,
    ClipboardList,
    TrendingUp,
    Plus,
    ArrowRight,
    Loader2,
} from "lucide-react";

export default function PlatformDashboardPage() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [recentOrgs, setRecentOrgs] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [platformStats, organizations] = await Promise.all([
                getPlatformStats(),
                getAllOrganizations(),
            ]);
            setStats(platformStats);
            setRecentOrgs(organizations.slice(0, 5));
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
                    <h1 className="text-3xl font-bold">Platform Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of all organizations and global statistics
                    </p>
                </div>
                <Link href="/admin/organizations/new">
                    <Button className="btn-premium">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Organization
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Organizations"
                    value={stats?.totalOrganizations || 0}
                    subtitle={`${stats?.activeOrganizations || 0} active`}
                    icon={Building2}
                    trend={null}
                />
                <StatsCard
                    title="Total Students"
                    value={stats?.totalStudents || 0}
                    subtitle="Across all orgs"
                    icon={Users}
                    trend={null}
                />
                <StatsCard
                    title="Total Staff"
                    value={stats?.totalStaff || 0}
                    subtitle="Including admins"
                    icon={UserCheck}
                    trend={null}
                />
                <StatsCard
                    title="Total Interviews"
                    value={stats?.totalInterviews || 0}
                    subtitle="All time"
                    icon={ClipboardList}
                    trend={null}
                />
            </div>

            {/* Recent Organizations */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Organizations</CardTitle>
                    <Link href="/admin/organizations">
                        <Button variant="ghost" size="sm">
                            View All
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {recentOrgs.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>No organizations yet</p>
                            <Link href="/admin/organizations/new">
                                <Button variant="link" className="mt-2">
                                    Create your first organization
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentOrgs.map((org) => (
                                <div
                                    key={org.id}
                                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                            <Building2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{org.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                /{org.slug}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                {org.stats?.studentCount || 0} students
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {org.stats?.interviewCount || 0} interviews
                                            </p>
                                        </div>
                                        <StatusBadge status={org.status} />
                                        <Link href={`/admin/organizations/${org.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-3">
                <QuickActionCard
                    title="Create Organization"
                    description="Set up a new college or institution"
                    href="/admin/organizations/new"
                    icon={Building2}
                />
                <QuickActionCard
                    title="View Audit Logs"
                    description="Monitor platform activities"
                    href="/admin/audit-logs"
                    icon={ClipboardList}
                />
                <QuickActionCard
                    title="Manage Organizations"
                    description="View and manage all orgs"
                    href="/admin/organizations"
                    icon={TrendingUp}
                />
            </div>
        </div>
    );
}

function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
}: {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ElementType;
    trend: number | null;
}) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                </div>
                {trend !== null && (
                    <div className="mt-4 flex items-center gap-1 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">+{trend}%</span>
                        <span className="text-muted-foreground">from last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: "bg-green-500/10 text-green-500",
        suspended: "bg-yellow-500/10 text-yellow-500",
        deleted: "bg-red-500/10 text-red-500",
    };

    return (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status] || "bg-muted"}`}>
            {status}
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
