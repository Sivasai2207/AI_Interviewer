"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useInterviewStore } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight } from "lucide-react";

interface QuestionPanelProps {
  className?: string;
}

export function QuestionPanel({ className }: QuestionPanelProps) {
  const { currentQuestion, questionNumber, previousQA, isAITyping } =
    useInterviewStore();

  return (
    <div className={cn("interview-panel flex flex-col", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <MessageSquare className="h-5 w-5 text-primary" />
          Current Question
        </h3>
        <Badge variant="secondary">Q{questionNumber}</Badge>
      </div>

      {/* Current Question */}
      <div className="question-highlight mb-6 rounded-lg bg-primary/5 p-4">
        {isAITyping ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Thinking</span>
            <div className="flex gap-1">
              <span className="typing-dot h-2 w-2 rounded-full bg-primary"></span>
              <span className="typing-dot h-2 w-2 rounded-full bg-primary"></span>
              <span className="typing-dot h-2 w-2 rounded-full bg-primary"></span>
            </div>
          </div>
        ) : currentQuestion ? (
          <p className="text-base leading-relaxed">{currentQuestion}</p>
        ) : (
          <p className="text-muted-foreground italic">
            Waiting for interviewer...
          </p>
        )}
      </div>

      {/* Previous Q&A */}
      {previousQA.length > 0 && (
        <>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Previous Questions
          </h4>
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {previousQA.slice(-3).map((qa, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground line-clamp-2">
                      {qa.question}
                    </p>
                  </div>
                  <p className="ml-6 text-xs text-muted-foreground line-clamp-1">
                    Your answer: {qa.answer.slice(0, 80)}...
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
