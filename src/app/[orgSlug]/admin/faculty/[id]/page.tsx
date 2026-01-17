"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import {
    getUserProfile,
    suspendUser,
    reactivateUser,
    deleteOrgUser,
    resetUserPassword,
} from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Loader2,
    Users,
    Power,
    Trash2,
    KeyRound,
} from "lucide-react";

export default function FacultyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { orgId, orgSlug } = useOrg();
    const facultyId = params.id as string;

    const [faculty, setFaculty] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId && facultyId) {
            loadFacultyData();
        }
    }, [orgId, facultyId]);

    const loadFacultyData = async () => {
        try {
            const data = await getUserProfile(facultyId);
            setFaculty(data);
        } catch (error) {
            console.error("Error loading faculty:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!faculty || !confirm("Are you sure you want to suspend this user? They will not be able to login.")) return;
        try {
            await suspendUser(faculty.id);
            loadFacultyData();
        } catch (error) {
            console.error("Failed to suspend:", error);
            alert("Failed to suspend user");
        }
    };

    const handleReactivate = async () => {
        if (!faculty || !confirm("Are you sure you want to reactivate this user?")) return;
        try {
            await reactivateUser(faculty.id);
            loadFacultyData();
        } catch (error) {
            console.error("Failed to reactivate:", error);
        }
    };

    const handleDelete = async () => {
        if (!faculty || !orgId || !confirm("Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return;
        try {
            await deleteOrgUser(orgId, faculty.id, "staff");
            router.push(`/${orgSlug}/admin/faculty`);
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete user");
        }
    };

    const handleResetPassword = async () => {
        if (!faculty || !confirm("Send password reset email to this user?")) return;
        try {
            await resetUserPassword(faculty.email, faculty.id);
            alert("Password reset email sent.");
        } catch (error) {
            console.error("Failed to reset password:", error);
            alert("Failed to send reset email");
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!faculty) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Faculty member not found</p>
                <Link href={`/${orgSlug}/admin/faculty`}>
                    <Button variant="link" className="mt-2">
                        Back to Faculty
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/${orgSlug}/admin/faculty`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-2xl font-bold text-primary">
                            {faculty.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{faculty.displayName}</h1>
                            {faculty.status === "suspended" && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                                    Suspended
                                </span>
                            )}
                            {faculty.status === "active" && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground">{faculty.email}</p>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Department</p>
                            <p className="text-lg">{faculty.department || "No department"}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                            <p className="text-lg">{faculty.phoneNumber || "No phone number"}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={handleResetPassword}
                            >
                                <KeyRound className="mr-2 h-3 w-3" />
                                Reset PWD
                            </Button>
                            {faculty.status === "suspended" ? (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={handleReactivate}
                                >
                                    <Power className="mr-2 h-3 w-3" />
                                    Activate
                                </Button>
                            ) : (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    onClick={handleSuspend}
                                >
                                    <Power className="mr-2 h-3 w-3" />
                                    Suspend
                                </Button>
                            )}
                        </div>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={handleDelete}
                        >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete User
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
