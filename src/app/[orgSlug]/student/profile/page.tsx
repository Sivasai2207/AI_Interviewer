"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
    User, Mail, Hash, Building2, Target, Loader2, CheckCircle2, Pencil, 
    Key, AlertCircle, ExternalLink, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp 
} from "lucide-react";
import { ROLE_CATALOG, MAX_TARGET_ROLES } from "@/lib/roleCatalog";
import { useSearchParams } from "next/navigation";

export default function StudentProfilePage() {
    const { user, userProfile } = useAuth();
    const { organization, orgSlug } = useOrg();
    const searchParams = useSearchParams();
    
    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>(userProfile?.targetRoles || []);
    const [isSaving, setIsSaving] = useState(false);
    
    // API Key states
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [apiKeyError, setApiKeyError] = useState("");
    const [showGuide, setShowGuide] = useState(false);
    const [highlightApiKey, setHighlightApiKey] = useState(false);
    const [isReplacingKey, setIsReplacingKey] = useState(false);

    // Check if redirected here for API key setup
    useEffect(() => {
        if (searchParams?.get("setup") === "apiKey") {
            setHighlightApiKey(true);
            setShowGuide(true);
            // Scroll to API key section
            setTimeout(() => {
                document.getElementById("api-key-section")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [searchParams]);

    const toggleRole = (role: string) => {
        setSelectedRoles((prev) => {
            if (prev.includes(role)) {
                return prev.filter((r) => r !== role);
            } else if (prev.length < MAX_TARGET_ROLES) {
                return [...prev, role];
            }
            return prev;
        });
    };

    const handleSaveRoles = async () => {
        if (!user || selectedRoles.length === 0) return;
        
        setIsSaving(true);
        try {
            const res = await fetch("/api/student/update-target-roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    orgId: userProfile?.orgId || "",
                    targetRoles: selectedRoles,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setIsEditingRoles(false);
                window.location.reload();
            } else {
                alert(data.error || "Failed to save roles");
            }
        } catch (error) {
            console.error("Error saving roles:", error);
            alert("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const handleVerifyApiKey = async () => {
        if (!user || !apiKey.trim()) return;
        
        setIsVerifying(true);
        setApiKeyError("");
        
        try {
            const res = await fetch("/api/student/api-key/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    orgId: userProfile?.orgId || "",
                    apiKey: apiKey.trim(),
                }),
            });

            const data = await res.json();
            if (data.ok && data.status === "verified") {
                setApiKey("");
                setHighlightApiKey(false);
                window.location.reload();
            } else {
                setApiKeyError(data.error || "Verification failed");
            }
        } catch (error) {
            console.error("Error verifying API key:", error);
            setApiKeyError("Network error. Please try again.");
        } finally {
            setIsVerifying(false);
        }
    };

    const isVerified = userProfile?.aiKey?.status === "verified";
    const showInput = !isVerified || isReplacingKey;

    const getApiKeyStatus = () => {
        const status = userProfile?.aiKey?.status;
        if (status === "verified") {
            return { color: "text-green-600 bg-green-100", icon: CheckCircle2, label: "Verified" };
        } else if (status === "invalid") {
            return { color: "text-red-600 bg-red-100", icon: AlertCircle, label: "Invalid" };
        } else if (status === "pending") {
            return { color: "text-yellow-600 bg-yellow-100", icon: Loader2, label: "Verifying..." };
        } else {
            return { color: "text-orange-600 bg-orange-100", icon: AlertCircle, label: "Missing" };
        }
    };

    const keyStatus = getApiKeyStatus();
    const StatusIcon = keyStatus.icon;

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

            {/* API Key Setup Section */}
            <Card 
                id="api-key-section" 
                className={highlightApiKey ? "ring-2 ring-primary ring-offset-2" : ""}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                API Key Setup
                            </CardTitle>
                            <CardDescription>
                                Required to start interviews
                            </CardDescription>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${keyStatus.color}`}>
                            <StatusIcon className={`h-4 w-4 ${keyStatus.label === "Verifying..." ? "animate-spin" : ""}`} />
                            {keyStatus.label}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!showInput ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Current API Key</p>
                                    <p className="font-mono text-lg">{userProfile?.aiKey?.masked}</p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        setApiKey("");
                                        setApiKeyError("");
                                        setIsReplacingKey(true);
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Replace Key
                                </Button>
                            </div>
                            {userProfile?.aiKey?.lastError && (
                                <p className="text-sm text-muted-foreground">
                                    Note: {userProfile?.aiKey?.lastError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <Input
                                    type={showApiKey ? "text" : "password"}
                                    placeholder="Enter your Gemini API key (AIza...)"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="pr-10 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            
                            {apiKeyError && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    {apiKeyError}
                                </p>
                            )}
                            
                            <Button 
                                onClick={handleVerifyApiKey} 
                                disabled={!apiKey.trim() || isVerifying}
                                className="w-full"
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Verify & Save
                                    </>
                                )}
                            </Button>

                            {isReplacingKey && (
                                <Button
                                    variant="ghost" 
                                    onClick={() => {
                                        setIsReplacingKey(false);
                                        setApiKey("");
                                        setApiKeyError("");
                                    }}
                                    className="w-full mt-2"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Setup Guide */}
                    <div className="border-t pt-4">
                        <button
                            type="button"
                            onClick={() => setShowGuide(!showGuide)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <span className="text-sm font-medium">How to get an API key</span>
                            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {showGuide && (
                            <div className="mt-3 space-y-3 text-sm">
                                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                    <li>Sign in to your Google Account</li>
                                    <li>Go to Google AI Studio</li>
                                    <li>Click "Get API Key" in the left sidebar</li>
                                    <li>Click "Create API key in new project" or select an existing project</li>
                                    <li>Copy the generated key (starts with AIza...)</li>
                                    <li>Paste it above and click "Verify & Save"</li>
                                </ol>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Google AI Studio
                                    </a>
                                    <a
                                        href="https://accounts.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border text-sm rounded-md hover:bg-muted"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Google Accounts
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Target Roles Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Target Roles
                        </CardTitle>
                        <CardDescription>
                            Roles you're preparing for in interviews
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                        setSelectedRoles(userProfile?.targetRoles || []);
                        setIsEditingRoles(true);
                    }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                </CardHeader>
                <CardContent>
                    {userProfile?.targetRoles && userProfile.targetRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {userProfile.targetRoles.map((role) => (
                                <span
                                    key={role}
                                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                                >
                                    {role}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">No target roles selected</p>
                    )}
                </CardContent>
            </Card>

            {/* Edit Roles Dialog */}
            <Dialog open={isEditingRoles} onOpenChange={setIsEditingRoles}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Target Roles</DialogTitle>
                        <DialogDescription>
                            Select up to {MAX_TARGET_ROLES} roles you're preparing for
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                Selected: <span className="font-bold text-primary">{selectedRoles.length}/{MAX_TARGET_ROLES}</span>
                            </div>
                        </div>
                        
                        {ROLE_CATALOG.map((category) => (
                            <div key={category.name}>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    {category.name}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {category.roles.map((role) => {
                                        const isSelected = selectedRoles.includes(role);
                                        const isDisabled = !isSelected && selectedRoles.length >= MAX_TARGET_ROLES;
                                        
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => toggleRole(role)}
                                                disabled={isDisabled}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                                                    ${isSelected 
                                                        ? "bg-primary text-white shadow-md" 
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }
                                                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                                                `}
                                            >
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsEditingRoles(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveRoles} 
                            disabled={selectedRoles.length === 0 || isSaving}
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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

