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
    GraduationCap,
    AlertTriangle,
    Shield,
    History,
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: any;
    exact?: boolean;
};

type NavGroup = {
    category: string;
    items: NavItem[];
};

export default function OrgAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, userProfile, role, isPlatformOwner, impersonationSession, loading: authLoading } = useAuth();
    const { organization, orgSlug, isLoading: orgLoading } = useOrg();

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

    if (!user) return null;

    const hasAccess = isPlatformOwner || role === "super_admin" || role === "admin" || role === "staff";
    if (!hasAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                    <h1 className="text-xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">You don't have admin privileges.</p>
                    <Link href={`/${orgSlug}/student`}>
                        <Button variant="link" className="mt-4">Go to Student Portal</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isImpersonating = isPlatformOwner && impersonationSession;

    // Define Navigation Structure
    const navigation: NavGroup[] = [
        {
            category: "Overview",
            items: [
                { href: `/${orgSlug}/admin`, label: "Dashboard", icon: LayoutDashboard, exact: true },
            ]
        },
        {
            category: "Management",
            items: [
                { href: `/${orgSlug}/admin/students`, label: "Students", icon: Users },
                { href: `/${orgSlug}/admin/faculty`, label: "Faculty", icon: GraduationCap },
                { href: `/${orgSlug}/admin/register`, label: "Register Users", icon: UserPlus },
            ]
        },
        {
            category: "Detailed Admin",
            items: [
                { href: `/${orgSlug}/admin/settings`, label: "Settings", icon: Settings },
            ]
        }
    ];

    // Conditionally Add Items
    const adminGroupIndex = navigation.findIndex(g => g.category === "Detailed Admin");
    
    // Add Admin Users if Super Admin
    if (role === "super_admin") {
         navigation[adminGroupIndex].items.unshift({
            href: `/${orgSlug}/admin/admin-users`,
            label: "Admin Users",
            icon: Shield,
        });
    }

    // Add System logs if Admin/Super Admin
    if (role === "super_admin" || role === "admin") {
        navigation.push({
            category: "System",
            items: [
                { href: `/${orgSlug}/admin/change-logs`, label: "Change Logs", icon: History },
            ]
        });
    }

    return (
        <div className="flex min-h-screen bg-gray-50/50">
             {/* Platform Owner Banner */}
             {isPlatformOwner && (
                <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-2 ${
                    isImpersonating ? "bg-yellow-500 text-yellow-900" : "bg-purple-600 text-white"
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
                            isImpersonating ? "bg-yellow-600 border-yellow-600 text-white" : "bg-purple-700 border-purple-700 text-white"
                        }`}>
                            Return to Platform Admin
                        </Button>
                    </Link>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed left-0 ${isPlatformOwner ? 'top-10' : 'top-0'} bottom-0 z-40 w-64 border-r bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60`}>
                <div className="flex h-full flex-col">
                    {/* Brand */}
                    <div className="flex h-16 items-center gap-3 border-b px-6 bg-primary/5">
                        <div className="bg-primary/10 p-2 rounded-lg">
                             <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="truncate font-bold text-gray-900">{organization?.name}</p>
                            <p className="text-xs text-muted-foreground">Admin Portal</p>
                        </div>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 space-y-6 p-4 overflow-y-auto">
                        {navigation.map((group) => (
                            <div key={group.category}>
                                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {group.category}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = pathname 
                                            ? (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                                            : false;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                                                    isActive
                                                        ? "bg-primary text-primary-foreground shadow-md"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className="border-t p-4 bg-gray-50/50">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-white shadow-sm">
                                <Users className="h-5 w-5" />
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
                                className="w-full border-red-100 hover:bg-red-50 hover:text-red-600"
                                onClick={handleSignOut}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 transition-all duration-300 ml-64 ${isPlatformOwner ? 'mt-10' : ''}`}>
                <div className="container mx-auto p-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
