"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { updateUserProfile } from "@/lib/firebase/firestore";
import { getAuth, updatePassword } from "firebase/auth";
import { getApp } from "firebase/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, AlertCircle, Check } from "lucide-react";

export default function SetupPasswordPage() {
    const { user, userProfile } = useAuth();
    const { orgSlug } = useOrg();
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile) return;

        setError("");
        setSuccess(false);

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const auth = getAuth(getApp());
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, password);
                
                await updateUserProfile(user.uid, {
                    mustResetPassword: false,
                });

                setSuccess(true);
                
                // Force a full reload to ensure AuthProvider fetches fresh profile data (mustResetPassword: false)
                setTimeout(() => {
                    const role = userProfile.role;
                    const targetPath = role === "student" ? `/${orgSlug}/student` : `/${orgSlug}/admin`;
                    window.location.href = targetPath;
                }, 1500);
            } else {
                setError("User not authenticated");
            }
        } catch (err: any) {
            console.error("Error updating password:", err);
            if (err.code === "auth/requires-recent-login") {
                setError("Please log out and log in again to change your password.");
            } else {
                setError(err.message || "Failed to update password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-center">Setup New Password</CardTitle>
                    <CardDescription className="text-center">
                        Please create a new password for your account to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                            <Check className="h-4 w-4" />
                            Password updated successfully! Redirecting...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading || success}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Set Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
