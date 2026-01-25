"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
    Loader2, 
    ArrowLeft, 
    Sparkles, 
    CheckCircle2, 
    FileText, 
    Shield, 
    Camera, 
    Mic,
    AlertTriangle,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    Key,
    ExternalLink
} from "lucide-react";
import type { InterviewPolicy } from "@/types";

const SUPPORTED_ROLES = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Scientist",
    "Product Manager",
    "UI/UX Designer",
    "Mobile Developer",
    "DevOps Engineer",
];

const DURATION_OPTIONS = [
    { value: 10, label: "10 min (Quick)" },
    { value: 15, label: "15 min (Standard)" },
    { value: 30, label: "30 min (Extended)" },
    { value: 45, label: "45 min (Full)" },
    { value: 60, label: "60 min (Comprehensive)" },
];

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
};

type Step = "config" | "rules" | "consent" | "identity" | "environment";

export default function NewInterviewPage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const { orgId, orgSlug, organization } = useOrg();

    const [currentStep, setCurrentStep] = useState<Step>("config");
    const [isLoading, setIsLoading] = useState(false);
    const [interviewId, setInterviewId] = useState<string | null>(null);
    const [error, setError] = useState("");
    
    // API Key Gate Modal
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    
    // Config form
    const [formData, setFormData] = useState({
        roleApplied: "",
        targetIndustry: "Technology",
        yearsOfExperience: 0,
        jobDescription: "",
        resumeText: "",
        durationMin: 15,
    });

    // Rules acknowledgment
    const [rulesChecked, setRulesChecked] = useState({
        noAiTools: false,
        noTabSwitch: false,
        understandRecording: false,
        understandViolations: false,
    });

    // Consent
    const [consentChecked, setConsentChecked] = useState(false);
    const [hasJD, setHasJD] = useState(false);

    // Environment checks
    const [envChecks, setEnvChecks] = useState({
        micPermission: false,
        cameraPermission: false,
        networkOk: true,
    });

    const policy = organization?.interviewPolicy || DEFAULT_POLICY;
    const allRulesChecked = Object.values(rulesChecked).every(Boolean);
    
    // Check API key status on mount
    useEffect(() => {
        if (userProfile && userProfile.aiKey?.status !== "verified") {
            setShowApiKeyModal(true);
        }
    }, [userProfile]);

    const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
        { id: "config", label: "Configure", icon: <Sparkles className="h-4 w-4" /> },
        { id: "rules", label: "Rules", icon: <FileText className="h-4 w-4" /> },
        { id: "consent", label: "Consent", icon: <Shield className="h-4 w-4" /> },
        ...(policy.requireIdentityVerification 
            ? [{ id: "identity" as Step, label: "Identity", icon: <Camera className="h-4 w-4" /> }]
            : []),
        { id: "environment", label: "Ready", icon: <Mic className="h-4 w-4" /> },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    const handleConfigSubmit = async () => {
        setError("");
        
        if (!user || !orgId) {
            setError("Missing user or organization information.");
            return;
        }
        
        // Check API key first
        if (userProfile?.aiKey?.status !== "verified") {
            setShowApiKeyModal(true);
            return;
        }
        
        if (!formData.resumeText || formData.resumeText.trim().length < 100) {
            setError("Please paste your resume text (minimum 100 characters).");
            return;
        }
        
        if (!formData.roleApplied) {
            setError("Please select a target role.");
            return;
        }

        setIsLoading(true);
        try {
            console.log("[NewInterview] Creating interview for role:", formData.roleApplied);
            // Create Interview directly with resume text
            const res = await fetch("/api/student/create-interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    uid: user.uid,
                    roleApplied: formData.roleApplied,
                    targetIndustry: formData.targetIndustry,
                    jdYearsRequired: formData.yearsOfExperience.toString(),
                    jdText: hasJD ? formData.jobDescription : "",
                    hasJD: hasJD && !!formData.jobDescription,
                    mode: "voice",
                    durationMin: formData.durationMin,
                    resumeText: formData.resumeText.trim(),
                }),
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                console.log("[NewInterview] ✓ Interview created:", data.interviewId);
                setInterviewId(data.interviewId);
                console.log("[NewInterview] Moving to rules step");
                setCurrentStep("rules");
            } else {
                throw new Error(data.error || "Failed to create interview");
            }
        } catch (err: any) {
            console.error("Failed to create interview:", err);
            setError(err.message || "Failed to create interview. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRulesNext = () => {
        if (allRulesChecked) {
            setCurrentStep("consent");
        }
    };

    const handleConsentNext = async () => {
        if (!consentChecked || !interviewId) return;

        try {
            const res = await fetch("/api/student/precheck/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    interviewId,
                    orgId,
                    uid: user?.uid,
                    rulesAccepted: true,
                    consentAccepted: true,
                    consentVersion: "v1.0",
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to save consent");
            }

            if (policy.requireIdentityVerification) {
                setCurrentStep("identity");
            } else {
                setCurrentStep("environment");
            }
        } catch (error) {
            console.error("Error saving consent:", error);
        }
    };

    const handleIdentityNext = () => {
        setCurrentStep("environment");
    };

    const checkMicPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setEnvChecks(prev => ({ ...prev, micPermission: true }));
        } catch {
            setEnvChecks(prev => ({ ...prev, micPermission: false }));
        }
    };

    const checkCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            setEnvChecks(prev => ({ ...prev, cameraPermission: true }));
        } catch {
            setEnvChecks(prev => ({ ...prev, cameraPermission: false }));
        }
    };

    useEffect(() => {
        if (currentStep === "environment") {
            checkMicPermission();
            if (policy.recordVideo) {
                checkCameraPermission();
            } else {
                setEnvChecks(prev => ({ ...prev, cameraPermission: true }));
            }
        }
    }, [currentStep, policy.recordVideo]);

    const handleStartInterview = () => {
        if (interviewId && envChecks.micPermission) {
            console.log("[NewInterview] ✓ Starting interview, navigating to room:", interviewId);
            router.push(`/${orgSlug}/student/room/${interviewId}`);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case "config": return !!formData.roleApplied && formData.resumeText.length >= 100;
            case "rules": return allRulesChecked;
            case "consent": return consentChecked;
            case "identity": return true;
            case "environment": return envChecks.micPermission && (!policy.recordVideo || envChecks.cameraPermission);
            default: return false;
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            {/* API Key Required Modal */}
            {showApiKeyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="max-w-md mx-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-primary" />
                                API Key Required
                            </CardTitle>
                            <CardDescription>
                                To start interviews, you need to add and verify your Gemini API key.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Your API key powers the AI interviewer. It's stored securely and only used for your interview sessions.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => router.push(`/${orgSlug}/student/profile?setup=apiKey`)}>
                                    <Key className="mr-2 h-4 w-4" />
                                    Go to Profile → API Key
                                </Button>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    How to get an API key
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">New Interview</h1>
                    <p className="text-muted-foreground">Complete the steps below to begin</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                            currentStep === step.id 
                                ? "bg-primary text-white" 
                                : idx < currentStepIndex 
                                    ? "bg-green-100 text-green-700"
                                    : "bg-muted text-muted-foreground"
                        }`}>
                            {idx < currentStepIndex ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                step.icon
                            )}
                            <span className="hidden sm:inline">{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`h-0.5 w-8 ${idx < currentStepIndex ? "bg-green-500" : "bg-muted"}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step Content */}
            <Card className="border-none shadow-xl">
                {currentStep === "config" && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Interview Configuration
                            </CardTitle>
                            <CardDescription>Paste your resume to personalize the interview</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Resume Text Input */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="resume">Resume Text *</Label>
                                    <span className={`text-xs ${formData.resumeText.length >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                                        {formData.resumeText.length} characters {formData.resumeText.length < 100 && "(min 100)"}
                                    </span>
                                </div>
                                <Textarea
                                    id="resume"
                                    placeholder="Paste your complete resume text here...

Example:
John Doe
Software Engineer | 3 years experience

SKILLS: JavaScript, React, Node.js, Python, PostgreSQL

EXPERIENCE:
Senior Developer at TechCorp (2021-Present)
- Built scalable microservices handling 1M+ requests/day
- Led team of 4 developers on e-commerce platform

EDUCATION:
BS Computer Science, State University (2020)"
                                    className="h-48 font-mono text-sm"
                                    value={formData.resumeText}
                                    onChange={(e) => setFormData({ ...formData, resumeText: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Tess will ask questions based on your resume content. Include skills, projects, and experience.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Target Role *</Label>
                                <Select
                                    value={formData.roleApplied}
                                    onValueChange={(val) => setFormData({ ...formData, roleApplied: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPORTED_ROLES.map((role) => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Years of Experience: {formData.yearsOfExperience}</Label>
                                    <Slider
                                        value={[formData.yearsOfExperience]}
                                        onValueChange={(vals) => setFormData({ ...formData, yearsOfExperience: vals[0] })}
                                        max={10}
                                        step={1}
                                        className="py-4"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Interview Duration</Label>
                                    <Select
                                        value={formData.durationMin.toString()}
                                        onValueChange={(val) => setFormData({ ...formData, durationMin: parseInt(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATION_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* JD Toggle */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <Label className="text-base">I have a Job Description</Label>
                                    <p className="text-xs text-muted-foreground">Tess will tailor questions to this role</p>
                                </div>
                                <Checkbox 
                                    checked={hasJD}
                                    onCheckedChange={(c) => setHasJD(!!c)}
                                />
                            </div>

                            {hasJD && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Job Description Text</Label>
                                    <Textarea
                                        placeholder="Paste the job description here..."
                                        className="h-32"
                                        value={formData.jobDescription}
                                        onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* Industry */}
                            <div className="space-y-2">
                                <Label htmlFor="industry">Industry (Optional)</Label>
                                <Input
                                    id="industry"
                                    placeholder="e.g. Fintech, Healthcare"
                                    value={formData.targetIndustry}
                                    onChange={(e) => setFormData({ ...formData, targetIndustry: e.target.value })}
                                />
                            </div>

                            <Button
                                onClick={handleConfigSubmit}
                                disabled={isLoading || !canProceed()}
                                className="w-full"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? "Creating Interview..." : "Continue"} <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </>
                )}

                {currentStep === "rules" && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Interview Rules
                            </CardTitle>
                            <CardDescription>Please acknowledge the following before proceeding</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4 rounded-lg bg-muted/50 p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={rulesChecked.noAiTools}
                                        onCheckedChange={(c) => setRulesChecked(prev => ({ ...prev, noAiTools: !!c }))}
                                    />
                                    <span className="text-sm">I will not use AI tools, chatbots, or external help during the interview.</span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={rulesChecked.noTabSwitch}
                                        onCheckedChange={(c) => setRulesChecked(prev => ({ ...prev, noTabSwitch: !!c }))}
                                    />
                                    <span className="text-sm">I will not switch tabs/windows, open other apps, or use a second device.</span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={rulesChecked.understandRecording}
                                        onCheckedChange={(c) => setRulesChecked(prev => ({ ...prev, understandRecording: !!c }))}
                                    />
                                    <span className="text-sm">I understand the session may record audio/video and generate a transcript for evaluation.</span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={rulesChecked.understandViolations}
                                        onCheckedChange={(c) => setRulesChecked(prev => ({ ...prev, understandViolations: !!c }))}
                                    />
                                    <span className="text-sm">I agree that violations may reduce my score or end the session.</span>
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setCurrentStep("config")}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button onClick={handleRulesNext} disabled={!allRulesChecked} className="flex-1">
                                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {currentStep === "consent" && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Data & Recording Consent
                            </CardTitle>
                            <CardDescription>Please review and accept</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border p-4 space-y-3 text-sm">
                                <div><strong>What we collect:</strong> Audio{policy.recordVideo ? ", video" : ""}, transcript, behavioral events (tab switches)</div>
                                <div><strong>Purpose:</strong> Interview evaluation and faculty review</div>
                                <div><strong>Retention:</strong> {policy.retentionDays} days</div>
                                <div><strong>Who can view:</strong> You, organization faculty, platform administrators</div>
                                <div><strong>Withdrawal:</strong> You may stop the interview anytime; a partial report may still be generated.</div>
                                {policy.policyText && <div className="mt-2 pt-2 border-t">{policy.policyText}</div>}
                            </div>

                            {policy.tabSwitchMonitoring && (
                                <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-yellow-800 text-sm">
                                    <AlertTriangle className="h-4 w-4" />
                                    Tab switching will be monitored. Excessive switching may end your session.
                                </div>
                            )}

                            <label className="flex items-start gap-3 cursor-pointer rounded-lg bg-muted/50 p-4">
                                <Checkbox
                                    checked={consentChecked}
                                    onCheckedChange={(c) => setConsentChecked(!!c)}
                                />
                                <span className="text-sm font-medium">I consent to recording, transcription, and evaluation.</span>
                            </label>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setCurrentStep("rules")}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button onClick={handleConsentNext} disabled={!consentChecked} className="flex-1">
                                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {currentStep === "identity" && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Camera className="h-5 w-5 text-primary" />
                                Identity Verification
                            </CardTitle>
                            <CardDescription>Upload ID and selfie for verification</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Identity verification is required by your organization. In this MVP version, this step is optional.
                            </p>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setCurrentStep("consent")}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button onClick={handleIdentityNext} className="flex-1">
                                    Skip for Now <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {currentStep === "environment" && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mic className="h-5 w-5 text-primary" />
                                Environment Check
                            </CardTitle>
                            <CardDescription>Make sure your setup is ready</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className={`flex items-center justify-between rounded-lg border p-4 ${envChecks.micPermission ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                                    <div className="flex items-center gap-3">
                                        <Mic className="h-5 w-5" />
                                        <span>Microphone Access</span>
                                    </div>
                                    {envChecks.micPermission ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={checkMicPermission}>
                                            Grant Access
                                        </Button>
                                    )}
                                </div>

                                {policy.recordVideo && (
                                    <div className={`flex items-center justify-between rounded-lg border p-4 ${envChecks.cameraPermission ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                                        <div className="flex items-center gap-3">
                                            <Camera className="h-5 w-5" />
                                            <span>Camera Access</span>
                                        </div>
                                        {envChecks.cameraPermission ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={checkCameraPermission}>
                                                Grant Access
                                            </Button>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span>Network Connection</span>
                                    </div>
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setCurrentStep(policy.requireIdentityVerification ? "identity" : "consent")}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button 
                                    onClick={handleStartInterview} 
                                    disabled={!canProceed()} 
                                    className="flex-1 btn-premium"
                                >
                                    Start Interview <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
