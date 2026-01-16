"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signInWithGoogle } from "@/lib/firebase/auth";
import { getUserProfile, getPlatformAdmin, getActiveImpersonation } from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { signOut } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Brain, Loader2, Mail, Lock, AlertCircle, Building2 } from "lucide-react";

export default function OrgLoginPage() {
    const router = useRouter();
    const { user, role, orgId: userOrgId, loading: authLoading } = useAuth();
    const { organization, orgSlug } = useOrg();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Auth check happens here
        if (!authLoading && user && organization) {
            // Platform owner access
            if (role === "platform_owner") {
                // If impersonating this org, use impersonation context
                // Otherwise just redirect to org admin as super_admin equivalent
                router.push(`/${orgSlug}/admin`);
                return;
            }

            // User already logged in - redirect based on role
            if (userOrgId === organization.id) {
                if (role === "student") {
                    router.push(`/${orgSlug}/student`);
                } else if (role === "staff" || role === "super_admin") {
                    router.push(`/${orgSlug}/admin`);
                }
            }
        }
    }, [user, role, userOrgId, organization, authLoading, router, orgSlug]);

    const redirectUser = async (uid: string) => {
        // Check if platform admin first
        const platformAdmin = await getPlatformAdmin(uid);
        if (platformAdmin && platformAdmin.status === "active") {
            // Allow access to any org
            router.push(`/${orgSlug}/admin`);
            return;
        }

        const profile = await getUserProfile(uid);
        
        if (!profile) {
            await signOut();
            setError("Account not found. Contact your administrator.");
            return;
        }

        if (profile.orgId !== organization?.id) {
            await signOut();
            setError("You don't have access to this organization.");
            return;
        }

        if (profile.role === "student") {
            router.push(`/${orgSlug}/student`);
        } else {
            router.push(`/${orgSlug}/admin`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const loggedInUser = await signIn(email, password);
            await redirectUser(loggedInUser.uid);
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === "auth/user-not-found") {
                setError("Account not found.");
            } else if (error.code === "auth/wrong-password") {
                setError("Incorrect password.");
            } else if (error.code === "auth/invalid-email") {
                setError("Invalid email address.");
            } else {
                setError("Failed to sign in. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setIsLoading(true);

        try {
            const loggedInUser = await signInWithGoogle();
            await redirectUser(loggedInUser.uid);
        } catch (err: unknown) {
            setError("Google Sign-in failed.");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <div className="w-full max-w-md">
                {/* Logo & Org Name */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2">
                        <Brain className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold">
                        {organization?.name || "Organization"}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        AI Interviewer Portal
                    </p>
                </div>

                <Card className="border-0 shadow-xl">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                        <CardDescription>
                            Students and staff - enter your credentials
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {organization?.settings?.allowGoogleSignIn !== false && (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                >
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continue with Google
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">
                                            Or with email
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@college.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="btn-premium w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-muted-foreground pt-2">
                            Students: Your registration number is your default password.
                            Contact your placement cell if you need help.
                        </p>
                    </CardContent>
                </Card>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    <Link href="/" className="hover:text-primary">
                        Return to main site
                    </Link>
                </p>
            </div>
        </div>
    );
}
