"use client";

import React from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Hash, Building2 } from "lucide-react";

export default function StudentProfilePage() {
    const { userProfile } = useAuth();
    const { organization } = useOrg();

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-4xl font-bold text-primary">
                        {userProfile?.displayName?.[0]?.toUpperCase() || "?"}
                    </span>
                </div>
                <h1 className="text-2xl font-bold">{userProfile?.displayName}</h1>
                <p className="text-muted-foreground">{userProfile?.email}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ProfileRow
                        icon={User}
                        label="Full Name"
                        value={userProfile?.displayName || "N/A"}
                    />
                    <ProfileRow
                        icon={Mail}
                        label="Email"
                        value={userProfile?.email || "N/A"}
                    />
                    <ProfileRow
                        icon={Hash}
                        label="Registration Number"
                        value={userProfile?.registrationNumber || "N/A"}
                    />
                    <ProfileRow
                        icon={Building2}
                        label="Department"
                        value={userProfile?.department || "N/A"}
                    />
                    <ProfileRow
                        icon={Building2}
                        label="Organization"
                        value={organization?.name || "N/A"}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function ProfileRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-4 border-b pb-3 last:border-0 last:pb-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    );
}
