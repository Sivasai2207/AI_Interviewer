"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_CATALOG, MAX_TARGET_ROLES } from "@/lib/roleCatalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const { orgSlug } = useOrg();
    const { user, userProfile } = useAuth();
    
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

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

    const handleSubmit = async () => {
        if (selectedRoles.length === 0 || !user) return;

        setIsSubmitting(true);
        setError("");

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
                // Force reload to update user profile state
                window.location.href = `/${orgSlug}/student`;
            } else {
                setError(data.error || "Failed to save roles");
            }
        } catch (err) {
            console.error("Error saving roles:", err);
            setError("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <Card className="w-full max-w-3xl shadow-2xl border-0">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Pick your top {MAX_TARGET_ROLES} roles
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        We'll tailor interview questions and track your progress based on this.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Selection Counter */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            Selected: <span className="font-bold text-primary">{selectedRoles.length}/{MAX_TARGET_ROLES}</span>
                        </div>
                    </div>

                    {/* Role Categories */}
                    <div className="space-y-6">
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
                                                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                                                    ${isSelected 
                                                        ? "bg-primary text-white shadow-lg scale-105" 
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }
                                                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
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

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={selectedRoles.length === 0 || isSubmitting}
                        className="w-full h-12 text-lg font-semibold btn-premium"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save & Continue"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
