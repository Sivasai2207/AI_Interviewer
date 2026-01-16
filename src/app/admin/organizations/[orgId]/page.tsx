"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    getOrganization,
    getOrgStats,
    updateOrganization,
    logPlatformAction,
    createImpersonationSession,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Organization, OrgStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Building2,
    ArrowLeft,
    Loader2,
    Users,
    UserCheck,
    ClipboardList,
    ExternalLink,
    Pause,
    Play,
    Eye,
    Settings,
    Calendar,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const orgId = params.orgId as string;

    const [org, setOrg] = useState<Organization | null>(null);
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (orgId) {
            loadOrganization();
        }
    }, [orgId]);

    const loadOrganization = async () => {
        try {
            const [orgData, orgStats] = await Promise.all([
                getOrganization(orgId),
                getOrgStats(orgId),
            ]);
            setOrg(orgData);
            setStats(orgStats);
        } catch (error) {
            console.error("Error loading organization:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!org || !user) return;
        setActionLoading("suspend");

        try {
            await updateOrganization(orgId, { status: "suspended" });
            await logPlatformAction({
                actorUid: user.uid,
                actorEmail: user.email || "",
                action: "ORG_SUSPENDED",
                targetOrgId: orgId,
                targetOrgName: org.name,
            });
            await loadOrganization();
        } catch (error) {
            console.error("Error suspending org:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReactivate = async () => {
        if (!org || !user) return;
        setActionLoading("reactivate");

        try {
            await updateOrganization(orgId, { status: "active" });
            await logPlatformAction({
                actorUid: user.uid,
                actorEmail: user.email || "",
                action: "ORG_REACTIVATED",
                targetOrgId: orgId,
                targetOrgName: org.name,
            });
            await loadOrganization();
        } catch (error) {
            console.error("Error reactivating org:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleImpersonate = async () => {
        if (!org || !user) return;
        setActionLoading("impersonate");

        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 2); // 2-hour session

            await createImpersonationSession({
                platformUid: user.uid,
                platformEmail: user.email || "",
                orgId: org.id,
                orgSlug: org.slug,
                orgName: org.name,
                targetRole: "super_admin",
                expiresAt: Timestamp.fromDate(expiresAt),
            });

            await logPlatformAction({
                actorUid: user.uid,
                actorEmail: user.email || "",
                action: "IMPERSONATE_STARTED",
                targetOrgId: orgId,
                targetOrgName: org.name,
            });

            // Redirect to org admin portal
            router.push(`/${org.slug}/admin`);
        } catch (error) {
            console.error("Error starting impersonation:", error);
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Organization not found</p>
                <Link href="/admin/organizations">
                    <Button variant="link" className="mt-2">
                        Back to Organizations
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/organizations">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{org.name}</h1>
                            <p className="text-muted-foreground">/{org.slug}</p>
                        </div>
                        <StatusBadge status={org.status} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleImpersonate}
                        disabled={actionLoading !== null || org.status !== "active"}
                    >
                        {actionLoading === "impersonate" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Eye className="mr-2 h-4 w-4" />
                        )}
                        Impersonate Admin
                    </Button>
                    <a
                        href={`/${org.slug}/login`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="outline">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Portal
                        </Button>
                    </a>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <StatsCard
                    title="Students"
                    value={stats?.studentCount || 0}
                    icon={Users}
                />
                <StatsCard
                    title="Staff"
                    value={stats?.staffCount || 0}
                    icon={UserCheck}
                />
                <StatsCard
                    title="Total Interviews"
                    value={stats?.interviewCount || 0}
                    icon={ClipboardList}
                />
                <StatsCard
                    title="This Week"
                    value={stats?.interviewsThisWeek || 0}
                    icon={Calendar}
                />
            </div>

            {/* Details */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <InfoRow label="Name" value={org.name} />
                        <InfoRow label="Slug" value={`/${org.slug}`} />
                        <InfoRow label="Status" value={org.status} />
                        <InfoRow
                            label="Created"
                            value={org.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                        />
                        <InfoRow
                            label="Super Admin"
                            value={org.superAdminEmail || "Not assigned"}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage this organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {org.status === "active" ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start text-yellow-600 hover:text-yellow-700"
                                onClick={handleSuspend}
                                disabled={actionLoading !== null}
                            >
                                {actionLoading === "suspend" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Pause className="mr-2 h-4 w-4" />
                                )}
                                Suspend Organization
                            </Button>
                        ) : org.status === "suspended" ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start text-green-600 hover:text-green-700"
                                onClick={handleReactivate}
                                disabled={actionLoading !== null}
                            >
                                {actionLoading === "reactivate" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="mr-2 h-4 w-4" />
                                )}
                                Reactivate Organization
                            </Button>
                        ) : null}
                        
                        <Button variant="outline" className="w-full justify-start" disabled>
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Settings (Coming Soon)
                        </Button>
                    </CardContent>
                </Card>
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

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between border-b pb-2 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: "bg-green-500/10 text-green-500 border-green-500/20",
        suspended: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        deleted: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
        <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
                styles[status] || "bg-muted"
            }`}
        >
            {status}
        </span>
    );
}
