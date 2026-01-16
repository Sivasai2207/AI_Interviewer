"use client";

import React, { useEffect, useCallback } from "react";
import { cn, formatTime } from "@/lib/utils";
import { useInterviewStore } from "@/store";
import { Clock, AlertTriangle } from "lucide-react";

interface TimerProps {
  className?: string;
  onTimeUp?: () => void;
  onWarning?: () => void;
}

export function Timer({ className, onTimeUp, onWarning }: TimerProps) {
  const { timer, updateTimer, isEvaluatorMode } = useInterviewStore();

  useEffect(() => {
    if (!timer.isRunning || timer.remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      const newRemaining = timer.remainingSeconds - 1;

      if (newRemaining <= 0) {
        updateTimer({ remainingSeconds: 0, isRunning: false });
        onTimeUp?.();
        return;
      }

      // Warning at 2 minutes
      if (newRemaining === 120 && onWarning) {
        onWarning();
      }

      updateTimer({ remainingSeconds: newRemaining });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.remainingSeconds, updateTimer, onTimeUp, onWarning]);

  const progressPercent =
    timer.totalSeconds > 0
      ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
      : 0;

  const isWarning = timer.remainingSeconds <= 120 && timer.remainingSeconds > 0;
  const isCritical = timer.remainingSeconds <= 60 && timer.remainingSeconds > 0;

  if (isEvaluatorMode) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2",
          className
        )}
      >
        <Clock className="h-5 w-5 text-success" />
        <span className="font-mono text-lg font-semibold text-success">
          Evaluator Mode
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 transition-all",
          isWarning && !isCritical && "bg-warning/10 animate-pulse",
          isCritical && "bg-destructive/10 animate-timer-pulse",
          !isWarning && "bg-secondary"
        )}
      >
        {isWarning ? (
          <AlertTriangle
            className={cn(
              "h-5 w-5",
              isCritical ? "text-destructive" : "text-warning"
            )}
          />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground" />
        )}
        <span
          className={cn(
            "font-mono text-2xl font-bold tabular-nums",
            isCritical && "text-destructive",
            isWarning && !isCritical && "text-warning"
          )}
        >
          {formatTime(timer.remainingSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-1000",
            isCritical && "bg-destructive",
            isWarning && !isCritical && "bg-warning",
            !isWarning && "bg-primary"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {isWarning && (
        <p className="text-xs text-muted-foreground">
          {isCritical
            ? "Interview ending soon..."
            : "Wrapping up shortly"}
        </p>
      )}
    </div>
  );
}
