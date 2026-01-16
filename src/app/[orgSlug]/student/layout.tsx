"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "../layout";
import { signOut } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import {
    Brain,
    LayoutDashboard,
    PlusCircle,
    FileText,
    User,
    LogOut,
    Loader2,
    AlertTriangle,
} from "lucide-react";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, userProfile, role, isPlatformOwner, loading: authLoading } = useAuth();
    const { organization, orgSlug, isLoading: orgLoading } = useOrg();

    const navItems = [
        { href: `/${orgSlug}/student`, label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: `/${orgSlug}/student/new-interview`, label: "New Interview", icon: PlusCircle },
        { href: `/${orgSlug}/student/profile`, label: "Profile", icon: User },
    ];

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${orgSlug}/login`);
    };

    if (authLoading || orgLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        router.push(`/${orgSlug}/login`);
        return null;
    }

    // Allow students, or staff/admin for oversight
    const hasAccess = role === "student" || role === "staff" || role === "super_admin" || isPlatformOwner;
    if (!hasAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                    <h1 className="text-xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">You don't have access to this portal.</p>
                    <Link href={`/${orgSlug}/login`}>
                        <Button variant="link" className="mt-4">
                            Back to Login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Check if staff/admin viewing student portal
    const isStaffViewing = role === "staff" || role === "super_admin";

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            {/* Staff viewing banner */}
            {isStaffViewing && (
                <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm">
                    You are viewing the student portal as {role}. 
                    <Link href={`/${orgSlug}/admin`} className="ml-2 underline">
                        Return to Admin
                    </Link>
                </div>
            )}

            {/* Top Nav */}
            <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href={`/${orgSlug}/student`} className="flex items-center gap-2">
                        <Brain className="h-8 w-8 text-primary" />
                        <div>
                            <span className="font-bold">{organization?.name}</span>
                            <p className="text-xs text-muted-foreground">AI Interviewer</p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);

                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        size="sm"
                                        className={isActive ? "" : "text-muted-foreground"}
                                    >
                                        <Icon className="mr-2 h-4 w-4" />
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </Button>
                                </Link>
                            );
                        })}

                        <div className="ml-4 flex items-center gap-2 border-l pl-4">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium">
                                    {userProfile?.displayName || user.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {userProfile?.registrationNumber}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleSignOut}>
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto p-4 md:p-6">
                {children}
            </main>
        </div>
    );
}
