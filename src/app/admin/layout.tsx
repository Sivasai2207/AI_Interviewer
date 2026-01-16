"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "@/lib/firebase/auth";
import { getActiveImpersonation, endImpersonation } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import {
    Brain,
    LayoutDashboard,
    Building2,
    ScrollText,
    LogOut,
    Loader2,
    Shield,
    UserCog,
    AlertTriangle,
} from "lucide-react";

const platformNavItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/organizations", label: "Organizations", icon: Building2 },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export default function PlatformAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, platformAdmin, role, impersonationSession, loading } = useAuth();
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        if (!loading) {
            // Allow access only for platform_owner
            if (!user || role !== "platform_owner") {
                router.push("/admin/login");
            }
        }
    }, [user, role, loading, router]);

    useEffect(() => {
        if (impersonationSession && impersonationSession.status === "active") {
            setIsImpersonating(true);
        } else {
            setIsImpersonating(false);
        }
    }, [impersonationSession]);

    const handleSignOut = async () => {
        await signOut();
        router.push("/admin/login");
    };

    const handleEndImpersonation = async () => {
        if (impersonationSession) {
            await endImpersonation(impersonationSession.id);
            router.refresh();
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Bypass check for login page
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    if (!user || role !== "platform_owner") {
        return null;
    }

    return (
        <div className="flex min-h-screen">
            {/* Impersonation Banner */}
            {isImpersonating && impersonationSession && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">
                            Impersonating: {impersonationSession.orgName} as {impersonationSession.targetRole}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                        onClick={handleEndImpersonation}
                    >
                        End Impersonation
                    </Button>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed left-0 ${isImpersonating ? 'top-10' : 'top-0'} bottom-0 z-40 w-64 border-r bg-card`}>
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center gap-2 border-b px-6">
                        <Shield className="h-8 w-8 text-primary" />
                        <div>
                            <span className="text-lg font-bold">Platform Admin</span>
                            <p className="text-xs text-muted-foreground">AI Interviewer</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-4">
                        {platformNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || 
                                (item.href !== "/admin" && pathname.startsWith(item.href));
                            
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
                                <UserCog className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium">
                                    {platformAdmin?.displayName || "Platform Owner"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleSignOut}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ml-64 ${isImpersonating ? 'mt-10' : ''}`}>
                <div className="container mx-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
