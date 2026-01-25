"use client";

import React, { useEffect, useCallback, useRef } from "react";
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
  
  // Use refs to avoid recreating the interval every second
  const remainingRef = useRef(timer.remainingSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const onWarningRef = useRef(onWarning);
  
  // Keep refs in sync
  useEffect(() => {
    remainingRef.current = timer.remainingSeconds;
  }, [timer.remainingSeconds]);
  
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
    onWarningRef.current = onWarning;
  }, [onTimeUp, onWarning]);

  useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      const newRemaining = remainingRef.current - 1;

      if (newRemaining <= 0) {
        updateTimer({ remainingSeconds: 0, isRunning: false });
        onTimeUpRef.current?.();
        clearInterval(interval);
        return;
      }

      // Warning at 2 minutes
      if (newRemaining === 120 && onWarningRef.current) {
        onWarningRef.current();
      }

      remainingRef.current = newRemaining;
      updateTimer({ remainingSeconds: newRemaining });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, updateTimer]); // Only depends on isRunning, not remainingSeconds

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
          "flex items-center gap-2 rounded-lg px-4 py-2 transition-all backdrop-blur-sm",
          // No background color by default, just white text
          // Blink only in critical phase (last 60s)
          isCritical && "animate-timer-pulse"
        )}
      >
        {isWarning ? (
          <AlertTriangle
            className={cn(
              "h-5 w-5",
              isCritical ? "text-red-500" : "text-amber-500"
            )}
          />
        ) : (
          <Clock className="h-5 w-5 text-white/80" />
        )}
        <span
          className={cn(
            "font-mono text-2xl font-bold tabular-nums",
            // Colors: White -> Red (last 2 mins) -> Red + Blink (last 60s)
            isWarning ? "text-red-500" : "text-white"
          )}
        >
          {formatTime(timer.remainingSeconds)}
        </span>
      </div>

      {isWarning && (
        <p className={cn(
            "text-xs text-center font-medium",
            isCritical ? "text-red-500" : "text-red-400"
        )}>
          {isCritical
            ? "Ending soon..."
            : "Wrap up"}
        </p>
      )}
    </div>
  );
}
