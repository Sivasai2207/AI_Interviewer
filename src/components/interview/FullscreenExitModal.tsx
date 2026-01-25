"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface FullscreenExitModalProps {
    open: boolean;
    onStay: () => void;
    onLeave: () => void;
}

export function FullscreenExitModal({ open, onStay, onLeave }: FullscreenExitModalProps) {
    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Leave Fullscreen Mode?</DialogTitle>
                    <DialogDescription>
                        You are attempting to exit fullscreen mode
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-lg my-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                                CAUTION
                            </p>
                            <p className="text-sm text-red-800 dark:text-red-200">
                                Leaving fullscreen will <strong>end your interview immediately</strong> and 
                                the violation will be logged. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onStay}
                        className="flex-1"
                    >
                        Stay in Interview
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onLeave}
                        className="flex-1"
                    >
                        End Interview
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
