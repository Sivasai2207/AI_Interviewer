"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useInterviewStore } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot } from "lucide-react";

interface TranscriptPanelProps {
  className?: string;
}

export function TranscriptPanel({ className }: TranscriptPanelProps) {
  const { transcript, isAITyping } = useInterviewStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, isAITyping]);

  return (
    <div className={cn("interview-panel flex flex-col", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Live Transcript</h3>
        <span className="text-xs text-muted-foreground">
          {transcript.length} messages
        </span>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef as React.RefObject<HTMLDivElement>}>
        <div className="space-y-4 pr-4">
          {transcript.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Transcript will appear here...
              </p>
            </div>
          ) : (
            transcript.map((chunk, index) => (
              <div
                key={chunk.id || index}
                className={cn(
                  "flex gap-3 rounded-lg p-3 animate-fade-in",
                  chunk.speaker === "interviewer" && "transcript-interviewer",
                  chunk.speaker === "candidate" && "transcript-candidate",
                  chunk.speaker === "system" && "bg-muted/50 border border-border"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                    chunk.speaker === "interviewer" && "bg-primary text-primary-foreground",
                    chunk.speaker === "candidate" && "bg-secondary text-secondary-foreground",
                    chunk.speaker === "system" && "bg-muted text-muted-foreground"
                  )}
                >
                  {chunk.speaker === "interviewer" ? (
                    <Bot className="h-4 w-4" />
                  ) : chunk.speaker === "candidate" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">SYS</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium capitalize">
                      {chunk.speaker === "interviewer"
                        ? "Interviewer"
                        : chunk.speaker === "candidate"
                        ? "You"
                        : "System"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{chunk.sequenceNumber}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {chunk.text}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* AI Typing Indicator */}
          {isAITyping && (
            <div className="flex gap-3 rounded-lg p-3 transcript-interviewer animate-fade-in">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Thinking</span>
                <div className="flex gap-1">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary"></span>
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary"></span>
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
