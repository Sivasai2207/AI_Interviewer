"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, HelpCircle, Loader2 } from "lucide-react";

interface AnswerInputProps {
  className?: string;
  onSubmit: (answer: string) => void;
  onIDontKnow: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function AnswerInput({
  className,
  onSubmit,
  onIDontKnow,
  disabled = false,
  isSubmitting = false,
}: AnswerInputProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !disabled && !isSubmitting) {
      onSubmit(answer.trim());
      setAnswer("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn("interview-panel", className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Interview has ended..."
              : "Type your answer here... (Press Enter to submit, Shift+Enter for new line)"
          }
          disabled={disabled || isSubmitting}
          className="min-h-[100px] resize-none"
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onIDontKnow}
            disabled={disabled || isSubmitting}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            I Don&apos;t Know
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {answer.length} characters
            </span>
            <Button
              type="submit"
              disabled={!answer.trim() || disabled || isSubmitting}
              className="btn-premium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Answer
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
