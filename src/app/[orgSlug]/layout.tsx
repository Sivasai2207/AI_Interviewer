import React from "react";
import { OrgProvider } from "@/components/providers/OrgContext";
import { CheckPasswordReset } from "@/components/auth/CheckPasswordReset";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    return (
        <OrgProvider>
            <CheckPasswordReset>
                {children}
            </CheckPasswordReset>
        </OrgProvider>
    );
}
