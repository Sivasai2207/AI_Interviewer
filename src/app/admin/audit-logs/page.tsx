"use client";

import React, { useEffect, useState } from "react";
import { getPlatformAuditLogs } from "@/lib/firebase/firestore";
import type { PlatformAuditLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ScrollText,
    Loader2,
    Building2,
    UserPlus,
    Pause,
    Play,
    Eye,
    EyeOff,
    RefreshCw,
} from "lucide-react";

const actionIcons: Record<string, React.ElementType> = {
    ORG_CREATED: Building2,
    ORG_SUSPENDED: Pause,
    ORG_REACTIVATED: Play,
    IMPERSONATE_STARTED: Eye,
    IMPERSONATE_ENDED: EyeOff,
    SUPER_ADMIN_CREATED: UserPlus,
    STAFF_CREATED: UserPlus,
    STUDENT_CREATED: UserPlus,
};

const actionLabels: Record<string, string> = {
    ORG_CREATED: "Organization Created",
    ORG_SUSPENDED: "Organization Suspended",
    ORG_REACTIVATED: "Organization Reactivated",
    ORG_DELETED: "Organization Deleted",
    IMPERSONATE_STARTED: "Impersonation Started",
    IMPERSONATE_ENDED: "Impersonation Ended",
    SUPER_ADMIN_CREATED: "Super Admin Created",
    STAFF_CREATED: "Staff Member Created",
    STUDENT_CREATED: "Student Created",
    PASSWORD_RESET: "Password Reset",
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const auditLogs = await getPlatformAuditLogs(100);
            setLogs(auditLogs);
        } catch (error) {
            console.error("Error loading audit logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Track all platform administration activities
                    </p>
                </div>
                <Button variant="outline" onClick={loadLogs}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5" />
                        Recent Activity ({logs.length} entries)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <ScrollText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>No audit logs yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => {
                                const Icon = actionIcons[log.action] || ScrollText;
                                const label = actionLabels[log.action] || log.action;
                                
                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 rounded-lg border p-4"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">{label}</h4>
                                                <span className="text-xs text-muted-foreground">
                                                    {log.timestamp?.toDate?.()?.toLocaleString() || "N/A"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                By: {log.actorEmail}
                                            </p>
                                            {log.targetOrgName && (
                                                <p className="mt-1 text-sm">
                                                    <span className="text-muted-foreground">Org: </span>
                                                    <span className="font-medium">{log.targetOrgName}</span>
                                                </p>
                                            )}
                                            {log.targetEmail && (
                                                <p className="text-sm">
                                                    <span className="text-muted-foreground">Target: </span>
                                                    <span className="font-medium">{log.targetEmail}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
