"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "../../layout";
import { createInterview } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";

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

export default function NewInterviewPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { orgId, orgSlug } = useOrg();

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        roleApplied: "",
        targetIndustry: "Technology",
        yearsOfExperience: 0,
        jobDescription: "",
    });

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !orgId) return;

        setIsLoading(true);
        try {
            const interviewId = await createInterview(orgId, {
                uid: user.uid,
                status: "created",
                roleApplied: formData.roleApplied,
                targetIndustry: formData.targetIndustry,
                yearsOfExperience: formData.yearsOfExperience,
                jobDescription: formData.jobDescription,
                mode: "voice",
                durationMin: 15,
            });

            router.push(`/${orgSlug}/student/room/${interviewId}`);
        } catch (error) {
            console.error("Failed to start interview:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">New Interview</h1>
                    <p className="text-muted-foreground">
                        Configure your mock interview session
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Interview Configuration
                    </CardTitle>
                    <CardDescription>
                        AI will adapt questions based on your choices
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleStart} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="role">Target Role</Label>
                            <Select
                                value={formData.roleApplied}
                                onValueChange={(val) =>
                                    setFormData({ ...formData, roleApplied: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPORTED_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Years of Experience: {formData.yearsOfExperience}</Label>
                            <Slider
                                value={[formData.yearsOfExperience]}
                                onValueChange={(vals) =>
                                    setFormData({ ...formData, yearsOfExperience: vals[0] })
                                }
                                max={10}
                                step={1}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Fresher (0)</span>
                                <span>Senior (10+)</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry (Optional)</Label>
                            <Input
                                id="industry"
                                placeholder="e.g. Fintech, E-commerce, Healthcare"
                                value={formData.targetIndustry}
                                onChange={(e) =>
                                    setFormData({ ...formData, targetIndustry: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jd">Job Description / Context (Optional)</Label>
                            <Textarea
                                id="jd"
                                placeholder="Paste a job description or list specific topics you want to cover..."
                                className="h-32"
                                value={formData.jobDescription}
                                onChange={(e) =>
                                    setFormData({ ...formData, jobDescription: e.target.value })
                                }
                            />
                        </div>

                        <Button
                            type="submit"
                            className="btn-premium w-full"
                            size="lg"
                            disabled={isLoading || !formData.roleApplied}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up Room...
                                </>
                            ) : (
                                "Start Interview"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
