"use client";

import React from "react";
import { useOrg } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2 } from "lucide-react";

export default function OrgSettingsPage() {
    const { organization } = useOrg();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Configure your organization settings
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Organization Details
                    </CardTitle>
                    <CardDescription>
                        Basic information about your organization
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{organization?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Slug</p>
                            <p className="font-medium">/{organization?.slug}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-medium capitalize">{organization?.status}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Students</p>
                            <p className="font-medium">{organization?.stats?.studentCount || 0}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Additional Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Advanced settings coming soon. Contact platform administrator for changes.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
