"use client";

import React from "react";
import { OrgProvider } from "@/components/providers/OrgContext";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    return (
        <OrgProvider>
            {children}
        </OrgProvider>
    );
}
