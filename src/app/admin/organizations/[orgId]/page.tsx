"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    getOrganization,
    getOrgStats,
    getOrgAdmins,
    getOrgStudents,
    updateOrganization,
    logPlatformAction,
    createImpersonationSession,
    updateUserProfile,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Organization, OrgStats, UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    Calendar,
    Trash2,
    UserPlus,
    MoreHorizontal,
    Key,
    Pencil,
    AlertTriangle,
    Copy,
    CheckCircle2,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const orgId = params?.orgId as string;

    const [org, setOrg] = useState<Organization | null>(null);
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [superAdmins, setSuperAdmins] = useState<UserProfile[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    
    // Dialog states
    const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
    const [showEditAdminDialog, setShowEditAdminDialog] = useState(false);
    const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);
    const [showDeleteAdminDialog, setShowDeleteAdminDialog] = useState(false);
    const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<UserProfile | null>(null);
    const [tempPassword, setTempPassword] = useState("");
    const [confirmationText, setConfirmationText] = useState("");
    
    // Form states
    const [adminForm, setAdminForm] = useState({
        email: "",
        displayName: "",
        phoneNumber: "",
    });

    useEffect(() => {
        if (orgId) {
            loadOrganizationData();
        }
    }, [orgId]);

    const loadOrganizationData = async () => {
        try {
            const [orgData, orgStats, admins, studentList] = await Promise.all([
                getOrganization(orgId),
                getOrgStats(orgId),
                getOrgAdmins(orgId),
                getOrgStudents(orgId),
            ]);
            setOrg(orgData);
            setStats(orgStats);
            setSuperAdmins(admins);
            setStudents(studentList);
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
            await loadOrganizationData();
        } catch (error) {
            console.error("Error suspending org:", error);
            alert("Failed to suspend organization");
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
            await loadOrganizationData();
        } catch (error) {
            console.error("Error reactivating org:", error);
            alert("Failed to reactivate organization");
        } finally {
            setActionLoading(null);
        }
    };

    const handleImpersonate = async () => {
        if (!org || !user) return;
        setActionLoading("impersonate");

        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 2);

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

            router.push(`/${org.slug}/admin`);
        } catch (error) {
            console.error("Error starting impersonation:", error);
            alert("Failed to start impersonation session");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateSuperAdmin = async () => {
        if (!user || !org) return;
        setActionLoading("create-admin");

        try {
            const res = await fetch("/api/admin/platform/create-super-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    email: adminForm.email,
                    displayName: adminForm.displayName,
                    phoneNumber: adminForm.phoneNumber || null,
                    actorUid: user.uid,
                    actorEmail: user.email,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setTempPassword(data.tempPassword);
                setShowAddAdminDialog(false);
                setShowTempPasswordDialog(true);
                setAdminForm({ email: "", displayName: "", phoneNumber: "" });
                await loadOrganizationData();
            } else {
                alert(data.error || "Failed to create super admin");
            }
        } catch (error) {
            console.error("Error creating super admin:", error);
            alert("Failed to create super admin");
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditSuperAdmin = async () => {
        if (!selectedAdmin || !user) return;
        setActionLoading("edit-admin");

        try {
            // Update display name
            await updateUserProfile(selectedAdmin.id, {
                displayName: adminForm.displayName,
            });

            // If temp password provided, update password as well
            if (tempPassword && tempPassword.length >= 6) {
                const res = await fetch("/api/admin/platform/set-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid: selectedAdmin.id,
                        password: tempPassword,
                        orgId,
                        actorUid: user.uid,
                        actorEmail: user.email,
                    }),
                });

                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || "Failed to update password");
                    return;
                }
            }

            setShowEditAdminDialog(false);
            setSelectedAdmin(null);
            setAdminForm({ email: "", displayName: "", phoneNumber: "" });
            setTempPassword("");
            await loadOrganizationData();
        } catch (error) {
            console.error("Error updating admin:", error);
            alert("Failed to update admin");
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPasswordInEdit = async () => {
        if (!selectedAdmin || !user) return;
        setActionLoading("reset-password");

        try {
            const res = await fetch("/api/admin/platform/reset-admin-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: selectedAdmin.id,
                    orgId,
                    actorUid: user.uid,
                    actorEmail: user.email,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setTempPassword(data.tempPassword);
                alert("Password reset successfully! Copy the new password below.");
            } else {
                alert(data.error || "Failed to reset password");
            }
        } catch (error) {
            console.error("Error resetting password:", error);
            alert("Failed to reset password");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteSuperAdmin = async () => {
        if (!selectedAdmin || !user) return;
        setActionLoading("delete-admin");

        try {
            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: selectedAdmin.id,
                    orgId,
                    role: "super_admin",
                    actor: {
                        uid: user.uid,
                        name: user.displayName,
                        email: user.email,
                        role: "platform_owner",
                    },
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setShowDeleteAdminDialog(false);
                setSelectedAdmin(null);
                await loadOrganizationData();
            } else {
                alert(data.error || "Failed to delete super admin");
            }
        } catch (error) {
            console.error("Error deleting admin:", error);
            alert("Failed to delete super admin");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteOrganization = async () => {
        if (!org || !user) return;
        setActionLoading("delete-org");

        try {
            const res = await fetch("/api/admin/platform/delete-organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    confirmationText,
                    actorUid: user.uid,
                    actorEmail: user.email,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert(data.message);
                router.push("/admin/organizations");
            } else {
                alert(data.error || "Failed to delete organization");
            }
        } catch (error) {
            console.error("Error deleting organization:", error);
            alert("Failed to delete organization");
        } finally {
            setActionLoading(null);
            setConfirmationText("");
        }
    };

    const openEditDialog = (admin: UserProfile) => {
        setSelectedAdmin(admin);
        setAdminForm({
            email: admin.email || "",
            displayName: admin.displayName || "",
            phoneNumber: admin.phoneNumber || "",
        });
        setTempPassword("");
        setShowEditAdminDialog(true);
    };

    const openDeleteAdminDialog = (admin: UserProfile) => {
        setSelectedAdmin(admin);
        setShowDeleteAdminDialog(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
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
                    <Button
                        variant="destructive"
                        onClick={() => setShowDeleteOrgDialog(true)}
                        disabled={actionLoading !== null}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Org
                    </Button>
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

            {/* Onboarding & Roles Analysis */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Top Chosen Roles</CardTitle>
                        <CardDescription>Role distribution selected by students during onboarding</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const roleCounts: Record<string, number> = {};
                            students.forEach(s => {
                                if (s.targetRoles) {
                                    s.targetRoles.forEach(role => {
                                        roleCounts[role] = (roleCounts[role] || 0) + 1;
                                    });
                                }
                            });
                            
                            const sortedRoles = Object.entries(roleCounts)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5);
                                
                            if (sortedRoles.length === 0) {
                                return <p className="text-muted-foreground text-sm">No role data available yet.</p>;
                            }

                            return (
                                <div className="space-y-4">
                                    {sortedRoles.map(([role, count]) => (
                                        <div key={role} className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between text-sm font-medium">
                                                    <span>{role}</span>
                                                    <span>{count}</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary" 
                                                        style={{ width: `${(count / students.length) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Onboarding Completion</CardTitle>
                        <CardDescription>Students with profile setup</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                        {(() => {
                            const completedCount = students.filter(s => s.onboarding?.completed).length;
                            const totalStudents = students.length;
                            const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

                            return (
                                <>
                                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-8 border-muted">
                                        <span className="text-3xl font-bold">{percentage}%</span>
                                        <svg className="absolute -rotate-90 h-full w-full" viewBox="0 0 100 100">
                                            <circle
                                                className="text-primary stroke-current"
                                                strokeWidth="8"
                                                strokeDasharray={`${percentage * 2.51} 251`} // Approx circumference for 40 radius (80 diam)? No, SVG scaling tricky. Simply using % width bar for now or just text.
                                                fill="transparent"
                                                r="46"
                                                cx="50"
                                                cy="50"
                                            />
                                        </svg> 
                                        {/* Simplified circle approach above is tricky with exact viewBox. Let's stick to text + bar below */}
                                    </div>
                                    <div className="mt-6 text-center">
                                        <p className="text-2xl font-bold">{completedCount} / {totalStudents}</p>
                                        <p className="text-sm text-muted-foreground">Students Completed</p>
                                    </div>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* Details Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Organization Info */}
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
                    </CardContent>
                </Card>

                {/* Actions */}
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
                    </CardContent>
                </Card>
            </div>

            {/* Super Admins Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Super Administrators</CardTitle>
                        <CardDescription>
                            Manage super admins who can access the organization portal
                        </CardDescription>
                    </div>
                    <Button onClick={() => setShowAddAdminDialog(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Super Admin
                    </Button>
                </CardHeader>
                <CardContent>
                    {superAdmins.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Users className="mx-auto h-12 w-12 mb-3 opacity-30" />
                            <p>No super admins found. Add one to get started.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {superAdmins.map((admin) => (
                                <div
                                    key={admin.id}
                                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                                            {admin.displayName?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <p className="font-medium">{admin.displayName}</p>
                                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                                            {admin.phoneNumber && (
                                                <p className="text-sm text-muted-foreground">{admin.phoneNumber}</p>
                                            )}
                                        </div>
                                        {admin.status === "suspended" && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                                Suspended
                                            </span>
                                        )}
                                        {admin.mustResetPassword && (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                                Must Reset Password
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(admin)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => openDeleteAdminDialog(admin)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Super Admin Dialog */}
            <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Super Administrator</DialogTitle>
                        <DialogDescription>
                            Create a new super admin for this organization. A temporary password will be generated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={adminForm.email}
                                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                                placeholder="admin@example.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="displayName">Full Name</Label>
                            <Input
                                id="displayName"
                                value={adminForm.displayName}
                                onChange={(e) => setAdminForm({ ...adminForm, displayName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phoneNumber">Phone (Optional)</Label>
                            <Input
                                id="phoneNumber"
                                type="tel"
                                value={adminForm.phoneNumber}
                                onChange={(e) => setAdminForm({ ...adminForm, phoneNumber: e.target.value })}
                                placeholder="+1234567890"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateSuperAdmin}
                            disabled={!adminForm.email || !adminForm.displayName || actionLoading === "create-admin"}
                        >
                            {actionLoading === "create-admin" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Create Admin
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Super Admin Dialog */}
            <Dialog open={showEditAdminDialog} onOpenChange={setShowEditAdminDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Super Administrator</DialogTitle>
                        <DialogDescription>
                            Update super admin details and reset password if needed
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Email (Read-only)</Label>
                            <Input value={adminForm.email} disabled />
                        </div>
                        <div>
                            <Label htmlFor="edit-displayName">Full Name</Label>
                            <Input
                                id="edit-displayName"
                                value={adminForm.displayName}
                                onChange={(e) => setAdminForm({ ...adminForm, displayName: e.target.value })}
                            />
                        </div>
                        <div className="border-t pt-4">
                            <Label htmlFor="edit-tempPassword">Temporary Password</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Enter a new password to reset. Leave empty to keep current password.
                            </p>
                            <Input
                                id="edit-tempPassword"
                                type="text"
                                placeholder="Enter new temporary password"
                                value={tempPassword}
                                onChange={(e) => setTempPassword(e.target.value)}
                                className="font-mono"
                            />
                            {tempPassword && (
                                <p className="text-xs text-orange-600 mt-1">
                                    ⚠️ User will be forced to change password on next login
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowEditAdminDialog(false);
                            setTempPassword("");
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSuperAdmin}
                            disabled={!adminForm.displayName || actionLoading === "edit-admin"}
                        >
                            {actionLoading === "edit-admin" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Temp Password Dialog */}
            <Dialog open={showTempPasswordDialog} onOpenChange={setShowTempPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Temporary Password Generated
                        </DialogTitle>
                        <DialogDescription>
                            Share this password with the user. They will be required to change it on first login.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between">
                                <code className="text-2xl font-mono font-bold">{tempPassword}</code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(tempPassword)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            ⚠️ This password will only be shown once. Make sure to save it securely.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            setShowTempPasswordDialog(false);
                            setTempPassword("");
                        }}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Admin Confirmation */}
            <Dialog open={showDeleteAdminDialog} onOpenChange={setShowDeleteAdminDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Super Administrator
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedAdmin?.displayName}? This action cannot be undone.
                            The user will be removed from Firebase Authentication and all organization data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteAdminDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSuperAdmin}
                            disabled={actionLoading === "delete-admin"}
                        >
                            {actionLoading === "delete-admin" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Delete Admin
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Organization Confirmation */}
            <Dialog open={showDeleteOrgDialog} onOpenChange={setShowDeleteOrgDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Organization
                        </DialogTitle>
                        <DialogDescription>
                            This will permanently delete the organization, ALL users (students, faculty, admins), 
                            interviews, and all associated data. This action CANNOT be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Type the organization name to confirm: <strong>{org.name}</strong></Label>
                            <Input
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder={org.name}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowDeleteOrgDialog(false);
                            setConfirmationText("");
                        }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteOrganization}
                            disabled={confirmationText !== org.name || actionLoading === "delete-org"}
                        >
                            {actionLoading === "delete-org" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Permanently Delete Organization
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
