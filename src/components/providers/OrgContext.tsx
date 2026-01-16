"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { getOrganizationBySlug } from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { Organization } from "@/types";
import { Loader2, Building2, AlertTriangle, Settings } from "lucide-react";

interface OrgContextType {
    organization: Organization | null;
    orgId: string | null;
    orgSlug: string;
    isLoading: boolean;
}

const OrgContext = React.createContext<OrgContextType>({
    organization: null,
    orgId: null,
    orgSlug: "",
    isLoading: true,
});

export function useOrg() {
    return React.useContext(OrgContext);
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { user, role, orgId: userOrgId, isPlatformOwner, impersonationSession, loading: authLoading } = useAuth();
    
    // Ensure orgSlug is a string and handle array case just in case
    const rawSlug = params.orgSlug;
    const orgSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug as string;

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (orgSlug) {
            loadOrganization();
        } else {
            console.error("[OrgProvider] No orgSlug found in params");
            setIsLoading(false);
            setError("Invalid Organization URL");
        }
    }, [orgSlug]);

    useEffect(() => {
        // Initial Config Check
        if (!isFirebaseConfigured) {
            setError("Firebase configuration is missing. Please check your environment variables.");
            setIsLoading(false);
            return;
        }

        // Auth check after org loads
        if (!isLoading && organization && !authLoading) {
            const isLoginPage = pathname.endsWith("/login");
            
            // If it's login page, no auth check needed
            if (isLoginPage) {
                return;
            }
            
            // Not logged in at all - redirect to login
            if (!user) {
                console.log("[OrgProvider] User not logged in on protected route. Redirecting to:", `/${orgSlug}/login`);
                router.push(`/${orgSlug}/login`);
                return;
            }
            
            console.log("[OrgProvider] User authenticated:", {
                email: user.email,
                role,
                userOrgId,
                isPlatformOwner,
                pathname
            });

            // Platform owner can access ANY org without restrictions
            if (isPlatformOwner) {
                console.log("[OrgProvider] Platform owner accessing org:", orgSlug);
                return; // Always allowed
            }

            // Regular user must belong to this org
            console.log("[OrgProvider] Checking org access:", {
                userOrgId,
                organizationId: organization.id,
                role,
                user: user?.email,
                match: userOrgId === organization.id
            });
            
            if (!userOrgId || userOrgId !== organization.id) {
                console.warn(`[OrgProvider] Access Denied. UserOrg (${userOrgId}) !== PageOrg (${organization.id})`);
                setError("You don't have access to this organization. Please contact your administrator.");
                return;
            }

            // Role-based routing within org for regular users
            const isAdminRoute = pathname.includes(`/${orgSlug}/admin`);

            if (isAdminRoute && role !== "super_admin" && role !== "staff") {
                console.log("[OrgProvider] Non-admin accessing admin route. Redirecting to student portal.");
                router.push(`/${orgSlug}/student`);
                return;
            }
        }
    }, [isLoading, organization, authLoading, user, role, userOrgId, pathname, isPlatformOwner, impersonationSession, orgSlug, router]);

    const loadOrganization = async () => {
        console.log("[OrgProvider] Loading organization for slug:", orgSlug);
        try {
            const org = await getOrganizationBySlug(orgSlug);
            console.log("[OrgProvider] Loaded organization:", org);
            if (!org) {
                console.error("[OrgProvider] Organization not found for slug:", orgSlug);
                setError("Organization not found");
            } else if (org.status !== "active") {
                console.warn("[OrgProvider] Organization is suspended:", org);
                setError("This organization is currently suspended");
            } else {
                console.log("[OrgProvider] Organization loaded successfully:", org.name);
                setOrganization(org);
            }
        } catch (err) {
            console.error("[OrgProvider] Error loading organization:", err);
            setError("Failed to load organization");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                    {isLoading ? "Loading Organization..." : "Authenticating..."}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        {error.includes("not found") ? (
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                        ) : error.includes("configuration") ? (
                            <Settings className="h-8 w-8 text-muted-foreground" />
                        ) : (
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        )}
                    </div>
                    <h1 className="mb-2 text-2xl font-bold">
                        {error.includes("not found") ? "Organization Not Found" : "Unable to Load Page"}
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
                    <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <OrgContext.Provider
            value={{
                organization,
                orgId: organization?.id || null,
                orgSlug,
                isLoading,
            }}
        >
            {children}
        </OrgContext.Provider>
    );
}
