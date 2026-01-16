"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signInWithGoogle, signUp } from "@/lib/firebase/auth";
import { getPlatformAdmin, createPlatformAdmin, logPlatformAction } from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
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
import { Shield, Loader2, Mail, Lock, AlertCircle, Key } from "lucide-react";

const PLATFORM_SETUP_KEY = "PLATFORM2024";

export default function PlatformAdminLoginPage() {
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [setupKey, setSetupKey] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [setupName, setSetupName] = useState("");

    useEffect(() => {
        if (!authLoading && user && role === "platform_owner") {
            router.push("/admin");
        }
    }, [user, role, authLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const loggedInUser = await signIn(email, password);
            const platformAdmin = await getPlatformAdmin(loggedInUser.uid);
            
            if (platformAdmin && platformAdmin.status === "active") {
                router.push("/admin");
            } else {
                setError("Access denied. Platform owner privileges required.");
            }
        } catch (err: any) {
            setError(err.message || "Invalid credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        setIsLoading(true);

        try {
            const loggedInUser = await signInWithGoogle();
            const platformAdmin = await getPlatformAdmin(loggedInUser.uid);
            
            if (platformAdmin && platformAdmin.status === "active") {
                router.push("/admin");
            } else {
                // Check if they're trying to set up
                if (showSetup && setupKey === PLATFORM_SETUP_KEY) {
                    await createPlatformAdmin(loggedInUser.uid, {
                        uid: loggedInUser.uid,
                        email: loggedInUser.email || "",
                        displayName: loggedInUser.displayName || setupName || "Platform Owner",
                        role: "platform_owner",
                        status: "active",
                    });
                    
                    await logPlatformAction({
                        actorUid: loggedInUser.uid,
                        actorEmail: loggedInUser.email || "",
                        action: "SUPER_ADMIN_CREATED",
                        metadata: { type: "platform_owner_bootstrap" },
                    });
                    
                    router.push("/admin");
                } else {
                    setError("Access denied. Not a platform owner.");
                }
            }
        } catch (err: any) {
            setError(err.message || "Google Sign-in failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (setupKey !== PLATFORM_SETUP_KEY) {
            setError("Invalid setup key.");
            return;
        }

        setIsLoading(true);

        try {
            // FIX: Use signUp for new accounts
            const loggedInUser = await signUp(email, password, setupName);
            
            await createPlatformAdmin(loggedInUser.uid, {
                uid: loggedInUser.uid,
                email: loggedInUser.email || email,
                displayName: setupName || "Platform Owner",
                role: "platform_owner",
                status: "active",
            });
            
            await logPlatformAction({
                actorUid: loggedInUser.uid,
                actorEmail: loggedInUser.email || email,
                action: "SUPER_ADMIN_CREATED",
                metadata: { type: "platform_owner_bootstrap" },
            });
            
            router.push("/admin");
        } catch (err: any) {
            console.error("Setup Error:", err);
            // Don't sugarcoating as requested
            setError(err.message || "Setup failed. Check console for details.");
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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2">
                        <Shield className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-white">Platform Administration</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        AI Interviewer Multi-Tenant Platform
                    </p>
                </div>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-xl font-bold text-white">
                            {showSetup ? "Platform Setup" : "Platform Owner Login"}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            {showSetup 
                                ? "Create the first platform owner account" 
                                : "Access the global admin portal"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="break-words font-medium">{error}</span>
                            </div>
                        )}

                        {showSetup ? (
                            <form onSubmit={handleSetup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="setupKey" className="text-slate-300">Setup Key</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="setupKey"
                                            type="password"
                                            placeholder="Enter platform setup key"
                                            value={setupKey}
                                            onChange={(e) => setSetupKey(e.target.value)}
                                            className="pl-10 bg-slate-700 border-slate-600 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="setupName" className="text-slate-300">Your Name</Label>
                                    <Input
                                        id="setupName"
                                        placeholder="Platform Owner Name"
                                        value={setupName}
                                        onChange={(e) => setSetupName(e.target.value)}
                                        className="bg-slate-700 border-slate-600 text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@platform.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 bg-slate-700 border-slate-600 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 bg-slate-700 border-slate-600 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Platform Owner"
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading || !setupKey}
                                >
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Setup with Google
                                </Button>

                                <button
                                    type="button"
                                    className="w-full text-sm text-slate-400 hover:text-white"
                                    onClick={() => setShowSetup(false)}
                                >
                                    ← Back to Login
                                </button>
                            </form>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                                    onClick={handleGoogleLogin}
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
                                        <span className="w-full border-t border-slate-600" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-slate-800 px-2 text-slate-500">
                                            Or sign in with email
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-slate-300">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="admin@platform.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-10 bg-slate-700 border-slate-600 text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-slate-300">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-10 bg-slate-700 border-slate-600 text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-primary hover:bg-primary/90"
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

                                <div className="pt-4 text-center">
                                    <button
                                        type="button"
                                        className="text-xs text-slate-400 hover:text-primary"
                                        onClick={() => setShowSetup(true)}
                                    >
                                        First time? Set up Platform Owner
                                    </button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <p className="mt-6 text-center text-xs text-slate-500">
                    This portal is for platform administrators only.
                    <br />
                    <Link href="/" className="text-slate-400 hover:text-white">
                        Return to main site
                    </Link>
                </p>
            </div>
        </div>
    );
}
