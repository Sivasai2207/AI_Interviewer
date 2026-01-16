"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    createOrganization,
    createOrgUser,
    logPlatformAction,
    updateOrganization,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Building2,
    ArrowLeft,
    Loader2,
    AlertCircle,
    Check,
    User,
} from "lucide-react";

export default function CreateOrganizationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const [orgData, setOrgData] = useState({
        name: "",
        slug: "",
    });

    const [createAdmin, setCreateAdmin] = useState(true);
    const [adminData, setAdminData] = useState({
        name: "",
        email: "",
        password: "",
    });

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    };

    const handleNameChange = (name: string) => {
        setOrgData({
            name,
            slug: generateSlug(name),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (!user) {
                throw new Error("Not authenticated");
            }

            // Validate slug
            if (!/^[a-z0-9-]+$/.test(orgData.slug)) {
                throw new Error("Slug can only contain lowercase letters, numbers, and hyphens");
            }

            // Create organization
            const orgId = await createOrganization({
                name: orgData.name,
                slug: orgData.slug,
                status: "active",
                createdByPlatformUid: user.uid,
            });

            // Log action
            await logPlatformAction({
                actorUid: user.uid,
                actorEmail: user.email || "",
                action: "ORG_CREATED",
                targetOrgId: orgId,
                targetOrgName: orgData.name,
                metadata: { slug: orgData.slug },
            });

            // Create super admin if requested
            if (createAdmin && adminData.email) {
                console.log("[CreateOrg] Creating super admin for organization:", orgId);
                const result = await createOrgUser(
                    orgId,
                    {
                        name: adminData.name,
                        email: adminData.email,
                        role: "super_admin",
                        password: adminData.password,
                    },
                    user.uid
                );

                if (result.success && result.uid) {
                    console.log("[CreateOrg] Super admin created with UID:", result.uid);
                    
                    // CRITICAL: Verify the user profile was actually created in Firestore
                    try {
                        const { getUserProfile } = await import("@/lib/firebase/firestore");
                        const verifyProfile = await getUserProfile(result.uid);
                        
                        if (!verifyProfile) {
                            throw new Error(`User profile verification failed: Profile not found in Firestore for UID ${result.uid}`);
                        }
                        
                        if (verifyProfile.orgId !== orgId) {
                            throw new Error(`User profile verification failed: orgId mismatch. Expected ${orgId}, got ${verifyProfile.orgId}`);
                        }
                        
                        if (verifyProfile.role !== "super_admin") {
                            throw new Error(`User profile verification failed: role mismatch. Expected super_admin, got ${verifyProfile.role}`);
                        }
                        
                        console.log("[CreateOrg] ✅ User profile verified in Firestore:", {
                            uid: result.uid,
                            orgId: verifyProfile.orgId,
                            role: verifyProfile.role,
                            email: verifyProfile.email
                        });
                    } catch (verifyError: any) {
                        console.error("[CreateOrg] ❌ User profile verification failed:", verifyError);
                        throw new Error(`Admin account created in Firebase Auth, but Firestore profile verification failed: ${verifyError.message}`);
                    }
                    
                    // Update organization with super admin info
                    await updateOrganization(orgId, {
                        superAdminUid: result.uid,
                        superAdminEmail: adminData.email,
                    });
                    
                    console.log("[CreateOrg] ✅ Organization updated with superAdminUid:", result.uid);

                    await logPlatformAction({
                        actorUid: user.uid,
                        actorEmail: user.email || "",
                        action: "SUPER_ADMIN_CREATED",
                        targetOrgId: orgId,
                        targetUid: result.uid,
                        targetEmail: adminData.email,
                    });
                } else {
                    const errorMsg = result.error || "Unknown error creating super admin";
                    console.error("[CreateOrg] Failed to create super admin:", errorMsg);
                    throw new Error(`Failed to create super admin: ${errorMsg}`);
                }
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/admin/organizations/${orgId}`);
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Failed to create organization");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-6">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                            <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold">Organization Created!</h2>
                        <p className="mt-2 text-muted-foreground">
                            Redirecting to organization details...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/organizations">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Create Organization</h1>
                    <p className="text-muted-foreground">
                        Set up a new college or institution
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Organization Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Organization Details
                        </CardTitle>
                        <CardDescription>
                            Basic information about the institution
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Organization Name *</Label>
                            <Input
                                id="name"
                                placeholder="ABC Engineering College"
                                value={orgData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">URL Slug *</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">/</span>
                                <Input
                                    id="slug"
                                    placeholder="abc-engineering"
                                    value={orgData.slug}
                                    onChange={(e) =>
                                        setOrgData({ ...orgData, slug: e.target.value })
                                    }
                                    pattern="^[a-z0-9-]+$"
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This will be the URL for the organization portal: /{orgData.slug || "slug"}/login
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Super Admin */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Super Admin Account
                                </CardTitle>
                                <CardDescription>
                                    Create the organization administrator
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="createAdmin"
                                    checked={createAdmin}
                                    onCheckedChange={(checked) =>
                                        setCreateAdmin(checked as boolean)
                                    }
                                />
                                <Label htmlFor="createAdmin" className="text-sm">
                                    Create now
                                </Label>
                            </div>
                        </div>
                    </CardHeader>
                    {createAdmin && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="adminName">Admin Name *</Label>
                                <Input
                                    id="adminName"
                                    placeholder="Dr. John Smith"
                                    value={adminData.name}
                                    onChange={(e) =>
                                        setAdminData({ ...adminData, name: e.target.value })
                                    }
                                    required={createAdmin}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adminEmail">Admin Email *</Label>
                                <Input
                                    id="adminEmail"
                                    type="email"
                                    placeholder="admin@college.edu"
                                    value={adminData.email}
                                    onChange={(e) =>
                                        setAdminData({ ...adminData, email: e.target.value })
                                    }
                                    required={createAdmin}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adminPassword">Temporary Password *</Label>
                                <Input
                                    id="adminPassword"
                                    type="password"
                                    placeholder="Min 6 characters"
                                    value={adminData.password}
                                    onChange={(e) =>
                                        setAdminData({ ...adminData, password: e.target.value })
                                    }
                                    minLength={6}
                                    required={createAdmin}
                                />
                                <p className="text-xs text-muted-foreground">
                                    The admin should change this password after first login
                                </p>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                    <Link href="/admin/organizations">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" className="btn-premium" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Building2 className="mr-2 h-4 w-4" />
                                Create Organization
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
