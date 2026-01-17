"use client";

import React, { useState } from "react";
import { useOrg } from "@/components/providers/OrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2, RefreshCw, Database } from "lucide-react";

export default function OrgSettingsPage() {
    const { organization, orgId } = useOrg();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncStats = async () => {
        if (!orgId) return;
        setIsSyncing(true);
        try {
            const res = await fetch("/api/admin/sync-stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId }),
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                alert(`Statistics Synced!\nStudents: ${data.stats.studentCount}\nFaculty: ${data.stats.staffCount}`);
                window.location.reload();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error(error);
            alert(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                 <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Settings
                </h1>
                <p className="text-muted-foreground mt-2">
                    Configure your organization profile and preferences
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-none shadow-lg overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-primary to-purple-600" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Organization Profile
                        </CardTitle>
                        <CardDescription>
                            General information visible to members
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Organization Name</p>
                                <p className="text-lg font-semibold">{organization?.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">URL Slug</p>
                                <div className="flex items-center gap-2">
                                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-primary">/{organization?.slug}</code>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        organization?.status === "active" 
                                            ? "bg-green-100 text-green-800"
                                            : "bg-yellow-100 text-yellow-800"
                                    }`}>
                                        <span className={`mr-1.5 h-2 w-2 rounded-full ${
                                            organization?.status === "active" ? "bg-green-600" : "bg-yellow-600"
                                        }`}></span>
                                        {organization?.status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-600" />
                            Data Management
                        </CardTitle>
                        <CardDescription>
                            Manage data integrity and synchronization
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-1">
                                <p className="font-medium">Synchronize Statistics</p>
                                <p className="text-sm text-muted-foreground">
                                    Recalculate total students and faculty counts if they appear incorrect.
                                </p>
                                <div className="flex gap-4 mt-2">
                                     <div className="text-sm">
                                        Current Students: <span className="font-mono font-bold">{organization?.stats?.studentCount ?? 0}</span>
                                     </div>
                                     <div className="text-sm">
                                        Current Faculty: <span className="font-mono font-bold">{organization?.stats?.staffCount ?? 0}</span>
                                     </div>
                                </div>
                            </div>
                            <Button 
                                onClick={handleSyncStats} 
                                disabled={isSyncing}
                                variant="outline"
                                className="border-blue-200 hover:bg-blue-50 text-blue-700"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                                {isSyncing ? "Syncing..." : "Sync Now"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg opacity-80">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-gray-400" />
                            Advanced Preferences
                        </CardTitle>
                        <CardDescription>
                            Coming soon
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground italic">
                            Additional configuration options will be available in future updates.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
