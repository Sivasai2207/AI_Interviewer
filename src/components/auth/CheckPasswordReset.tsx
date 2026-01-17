"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";

export function CheckPasswordReset({ children }: { children: React.ReactNode }) {
    const { userProfile, loading } = useAuth();
    const { orgSlug } = useOrg();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && userProfile && orgSlug) {
            // If user must reset password
            if (userProfile.mustResetPassword) {
                // Check if not already on setup page
                if (!pathname.includes("/setup-password")) {
                    console.log("[CheckPasswordReset] User must reset password. Redirecting...");
                    router.push(`/${orgSlug}/setup-password`);
                }
            } else {
                 // If user does NOT need to reset password, but tries to access setup-password page directly,
                 // we might want to redirect them away? Or allow it?
                 // For now, allow it (maybe they want to change it again? But logic implies force reset).
                 // Actually the page is "Setup New Password" contextually.
                 // If they are on setup-password but don't need to, maybe redirect to dashboard?
                 if (pathname.includes("/setup-password")) {
                     const role = userProfile.role;
                     if (role === "student") {
                         router.push(`/${orgSlug}/student`);
                     } else {
                         router.push(`/${orgSlug}/admin`);
                     }
                 }
            }
        }
    }, [userProfile, loading, orgSlug, pathname, router]);

    if (loading) return <>{children}</>; // Or null, but children keeps layout stable during check

    // We render children. If redirect happens, it happens.
    return <>{children}</>;
}
