"use client";

import React, { useState } from "react";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Building2, RefreshCw, Database, Shield, Loader2, CheckCircle2 } from "lucide-react";
import type { InterviewPolicy } from "@/types";

const DEFAULT_POLICY: InterviewPolicy = {
    requireConsent: true,
    recordAudio: true,
    recordVideo: false,
    captureTranscript: true,
    tabSwitchMonitoring: true,
    maxTabSwitchWarnings: 2,
    autoEndOnViolation: true,
    requireIdentityVerification: false,
    retentionDays: 180,
    policyText: "",
    policyLink: "",
};

export default function OrgSettingsPage() {
    const { organization, orgId } = useOrg();
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const [policySaved, setPolicySaved] = useState(false);
    
    const [policy, setPolicy] = useState<InterviewPolicy>(
        organization?.interviewPolicy || DEFAULT_POLICY
    );

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

    const handleSavePolicy = async () => {
        if (!orgId || !user) return;
        setIsSavingPolicy(true);
        setPolicySaved(false);
        
        try {
            const res = await fetch("/api/admin/org/update-interview-policy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    actorUid: user.uid,
                    policy,
                }),
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setPolicySaved(true);
                setTimeout(() => setPolicySaved(false), 3000);
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error(error);
            alert(`Failed to save: ${error.message}`);
        } finally {
            setIsSavingPolicy(false);
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
                {/* Organization Profile */}
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
                                <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-primary">/{organization?.slug}</code>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Interview Policy */}
                <Card className="border-none shadow-lg overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-orange-600" />
                            Interview Policy
                        </CardTitle>
                        <CardDescription>
                            Configure proctoring, consent, and compliance settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Recording Settings */}
                        <div className="space-y-4">
                            <h3 className="font-medium">Recording & Data Collection</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="recordAudio" className="cursor-pointer">Record Audio</Label>
                                    <Switch
                                        id="recordAudio"
                                        checked={policy.recordAudio}
                                        onCheckedChange={(c) => setPolicy({ ...policy, recordAudio: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="recordVideo" className="cursor-pointer">Record Video</Label>
                                    <Switch
                                        id="recordVideo"
                                        checked={policy.recordVideo}
                                        onCheckedChange={(c) => setPolicy({ ...policy, recordVideo: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="captureTranscript" className="cursor-pointer">Capture Transcript</Label>
                                    <Switch
                                        id="captureTranscript"
                                        checked={policy.captureTranscript}
                                        onCheckedChange={(c) => setPolicy({ ...policy, captureTranscript: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="requireConsent" className="cursor-pointer">Require Consent</Label>
                                    <Switch
                                        id="requireConsent"
                                        checked={policy.requireConsent}
                                        onCheckedChange={(c) => setPolicy({ ...policy, requireConsent: c })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Proctoring Settings */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-medium">Proctoring & Monitoring</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="tabSwitchMonitoring" className="cursor-pointer">Tab Switch Monitoring</Label>
                                    <Switch
                                        id="tabSwitchMonitoring"
                                        checked={policy.tabSwitchMonitoring}
                                        onCheckedChange={(c) => setPolicy({ ...policy, tabSwitchMonitoring: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="autoEndOnViolation" className="cursor-pointer">Auto-End on Violation</Label>
                                    <Switch
                                        id="autoEndOnViolation"
                                        checked={policy.autoEndOnViolation}
                                        onCheckedChange={(c) => setPolicy({ ...policy, autoEndOnViolation: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label htmlFor="requireIdentity" className="cursor-pointer">Require Identity Verification</Label>
                                    <Switch
                                        id="requireIdentity"
                                        checked={policy.requireIdentityVerification}
                                        onCheckedChange={(c) => setPolicy({ ...policy, requireIdentityVerification: c })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="maxWarnings">Max Tab Switch Warnings</Label>
                                    <Input
                                        id="maxWarnings"
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={policy.maxTabSwitchWarnings}
                                        onChange={(e) => setPolicy({ ...policy, maxTabSwitchWarnings: parseInt(e.target.value) || 2 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="retentionDays">Data Retention (Days)</Label>
                                    <Input
                                        id="retentionDays"
                                        type="number"
                                        min={30}
                                        max={365}
                                        value={policy.retentionDays}
                                        onChange={(e) => setPolicy({ ...policy, retentionDays: parseInt(e.target.value) || 180 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Policy Text */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-medium">Custom Policy Text</h3>
                            <div className="space-y-2">
                                <Label htmlFor="policyText">Policy Text (shown to students)</Label>
                                <Textarea
                                    id="policyText"
                                    placeholder="Additional terms or guidelines shown during consent..."
                                    className="h-24"
                                    value={policy.policyText || ""}
                                    onChange={(e) => setPolicy({ ...policy, policyText: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="policyLink">Policy Document Link (optional)</Label>
                                <Input
                                    id="policyLink"
                                    placeholder="https://..."
                                    value={policy.policyLink || ""}
                                    onChange={(e) => setPolicy({ ...policy, policyLink: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button onClick={handleSavePolicy} disabled={isSavingPolicy} className="w-full">
                            {isSavingPolicy ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : policySaved ? (
                                <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved!</>
                            ) : (
                                "Save Interview Policy"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Data Management */}
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
                                    Recalculate total students and faculty counts.
                                </p>
                            </div>
                            <Button 
                                onClick={handleSyncStats} 
                                disabled={isSyncing}
                                variant="outline"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                                {isSyncing ? "Syncing..." : "Sync Now"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
