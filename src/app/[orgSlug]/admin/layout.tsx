"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { signOut } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Settings,
    LogOut,
    Loader2,
    Building2,
    AlertTriangle,
} from "lucide-react";

export default function OrgAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, userProfile, role, isPlatformOwner, impersonationSession, loading: authLoading } = useAuth();
    const { organization, orgSlug, isLoading: orgLoading } = useOrg();

    const navItems = [
        { href: `/${orgSlug}/admin`, label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: `/${orgSlug}/admin/students`, label: "Students", icon: Users },
        { href: `/${orgSlug}/admin/register`, label: "Register", icon: UserPlus },
        { href: `/${orgSlug}/admin/settings`, label: "Settings", icon: Settings },
    ];

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${orgSlug}/login`);
    };

    // Use effect for redirects to avoid rendering during state updates
    useEffect(() => {
        if (!authLoading && !orgLoading) {
            if (!user) {
                console.log("[OrgAdminLayout] No user found. Redirecting to login.");
                if (orgSlug) {
                    router.push(`/${orgSlug}/login`);
                }
            }
        }
    }, [user, authLoading, orgLoading, orgSlug, router]);

    if (authLoading || orgLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Check access
    if (!user) {
        return null; // Will trigger useEffect redirect
    }

    const hasAccess = isPlatformOwner || role === "super_admin" || role === "staff";
    if (!hasAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                    <h1 className="text-xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">You don't have admin privileges.</p>
                    <Link href={`/${orgSlug}/student`}>
                        <Button variant="link" className="mt-4">
                            Go to Student Portal
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isImpersonating = isPlatformOwner && impersonationSession;
    const isPlatformOwnerDirectAccess = isPlatformOwner && !impersonationSession;

    return (
        <div className="flex min-h-screen">
            {/* Platform Owner Banner - Shows when accessing any org as platform owner */}
            {isPlatformOwner && (
                <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-2 ${
                    isImpersonating 
                        ? "bg-yellow-500 text-yellow-900" 
                        : "bg-purple-600 text-white"
                }`}>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                        {isImpersonating 
                            ? `Impersonating ${impersonationSession.targetRole} in ${organization?.name}`
                            : `Platform Owner Mode - Viewing ${organization?.name}`
                        }
                    </span>
                    <Link href="/admin">
                        <Button size="sm" variant="outline" className={`ml-4 ${
                            isImpersonating
                                ? "bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700"
                                : "bg-purple-700 text-white border-purple-700 hover:bg-purple-800"
                        }`}>
                            Return to Platform Admin
                        </Button>
                    </Link>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed left-0 ${isPlatformOwner ? 'top-10' : 'top-0'} bottom-0 z-40 w-64 border-r bg-card`}>
                <div className="flex h-full flex-col">
                    {/* Logo & Org */}
                    <div className="flex h-16 items-center gap-2 border-b px-6">
                        <Building2 className="h-8 w-8 text-primary" />
                        <div className="overflow-hidden">
                            <p className="truncate font-bold">{organization?.name}</p>
                            <p className="text-xs text-muted-foreground">Admin Portal</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="border-t p-4">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium">
                                    {isPlatformOwner ? "Platform Owner" : userProfile?.displayName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {isPlatformOwner ? (isImpersonating ? "Impersonating" : "Direct Access") : role}
                                </p>
                            </div>
                        </div>
                        {!isPlatformOwner && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={handleSignOut}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ml-64 ${isPlatformOwner ? 'mt-10' : ''}`}>
                <div className="container mx-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
