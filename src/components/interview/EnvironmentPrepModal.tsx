"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Moon, BellOff, Monitor, Wifi } from "lucide-react";

interface EnvironmentPrepModalProps {
    open: boolean;
    onReady: () => void;
}

export function EnvironmentPrepModal({ open, onReady }: EnvironmentPrepModalProps) {
    const checks = [
        {
            icon: <BellOff className="h-5 w-5" />,
            label: "Enable Do Not Disturb mode",
            description: "Turn off all notifications",
        },
        {
            icon: <Moon className="h-5 w-5" />,
            label: "Close unnecessary applications",
            description: "Minimize distractions",
        },
        {
            icon: <Monitor className="h-5 w-5" />,
            label: "Fullscreen mode will be enabled",
            description: "Interview will enter kiosk mode",
        },
        {
            icon: <Wifi className="h-5 w-5" />,
            label: "Ensure stable internet connection",
            description: "Check your network",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-2xl">Prepare Your Environment</DialogTitle>
                    <DialogDescription>
                        Complete these steps before starting your interview
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-4">
                    {checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="mt-0.5 text-primary">
                                {check.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">{check.label}</p>
                                <p className="text-sm text-muted-foreground">{check.description}</p>
                            </div>
                            <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        </div>
                    ))}
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Important:</strong> Leaving fullscreen mode during the interview will trigger violation warnings. 
                        After 3 warnings, the interview will be terminated automatically.
                    </p>
                </div>

                <Button
                    onClick={onReady}
                    className="w-full mt-2"
                    size="lg"
                >
                    I'm Ready - Start Interview
                </Button>
            </DialogContent>
        </Dialog>
    );
}
