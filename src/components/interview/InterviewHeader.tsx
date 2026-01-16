"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer } from "./Timer";
import {
  Briefcase,
  GraduationCap,
  Building2,
  LogOut,
  AlertCircle,
  Mic,
} from "lucide-react";

interface InterviewHeaderProps {
  className?: string;
  role: string;
  mode: "fresher" | "intermediate" | "professional";
  industry: string;
  onEndInterview: () => void;
  onTimeWarning?: () => void;
  onTimeUp?: () => void;
}

const modeConfig = {
  fresher: {
    label: "Fresher",
    variant: "secondary" as const,
    icon: GraduationCap,
  },
  intermediate: {
    label: "Intermediate",
    variant: "default" as const,
    icon: Briefcase,
  },
  professional: {
    label: "Professional",
    variant: "destructive" as const,
    icon: Building2,
  },
  voice: {
    label: "Voice Mode",
    variant: "default" as const,
    icon: Mic,
  },
};

export function InterviewHeader({
  className,
  role,
  mode,
  industry,
  onEndInterview,
  onTimeWarning,
  onTimeUp,
}: {
    className?: string;
    role: string;
    mode: "fresher" | "intermediate" | "professional" | "voice";
    industry: string;
    onEndInterview: () => void;
    onTimeWarning?: () => void;
    onTimeUp?: () => void;
}) {
  const modeInfo = modeConfig[mode];
  const ModeIcon = modeInfo.icon;

  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm",
        className
      )}
    >
      {/* Left: Interview Info */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5 py-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          {role}
        </Badge>

        <Badge variant={modeInfo.variant} className="gap-1.5 py-1.5">
          <ModeIcon className="h-3.5 w-3.5" />
          {modeInfo.label}
        </Badge>

        <Badge variant="outline" className="gap-1.5 py-1.5">
          <Building2 className="h-3.5 w-3.5" />
          {industry}
        </Badge>
      </div>

      {/* Center: Timer */}
      <Timer
        className="flex-shrink-0"
        onWarning={onTimeWarning}
        onTimeUp={onTimeUp}
      />

      {/* Right: End Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onEndInterview}
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        End Interview
      </Button>
    </header>
  );
}
