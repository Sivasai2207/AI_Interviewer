"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface MalpracticeScreenProps {
    open: boolean;
    violationCount: number;
}

export function MalpracticeScreen({ open, violationCount }: MalpracticeScreenProps) {
    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent 
                className="sm:max-w-lg" 
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-red-600">
                        Malpractice Detected
                    </DialogTitle>
                    <DialogDescription className="text-lg">
                        Interview Terminated
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-6">
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                        <p className="text-center text-red-900 dark:text-red-100">
                            <strong>Reason:</strong> Multiple fullscreen violations detected
                        </p>
                        <p className="text-center text-sm text-red-800 dark:text-red-200 mt-2">
                            Violation Count: <strong>{violationCount}</strong>
                        </p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                        <p className="text-center font-medium text-amber-900 dark:text-amber-100">
                            🚨 Report Sent to Faculty
                        </p>
                        <p className="text-sm text-center text-amber-800 dark:text-amber-200 mt-2">
                            A detailed violation log has been recorded and will be reviewed by your instructor.
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    This window will close automatically. You will be redirected to the dashboard.
                </p>
            </DialogContent>
        </Dialog>
    );
}
