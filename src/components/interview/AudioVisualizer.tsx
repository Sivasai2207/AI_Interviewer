import React from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
    isSpeaking: boolean;
    className?: string;
    mode?: "listening" | "speaking" | "processing";
    volume?: number; // 0-100
}

export function AudioVisualizer({ isSpeaking, className, mode = "listening", volume = 0 }: AudioVisualizerProps) {
    // Generate 4 bars for the Gemini-style visualization
    const bars = [1, 2, 3, 4];

    return (
        <div className={cn("flex items-center justify-center gap-3 h-32", className)}>
             {/* Central glow effect */}
            <div className={cn(
                "absolute w-40 h-40 rounded-full blur-3xl transition-all duration-1000",
                mode === "speaking" ? "bg-blue-500/20" : "bg-white/5"
            )} />

            {bars.map((i) => {
                // simple "wave" effect offset
                return (
                    <div
                        key={i}
                        className={cn(
                            "w-4 rounded-full transition-all duration-75 ease-out",
                            mode === "speaking" 
                                ? "bg-gradient-to-t from-blue-400 to-cyan-300" 
                                : "bg-zinc-700"
                        )}
                        style={{
                            // If volume is present (User), use it. 
                            // If only isSpeaking is true (AI), use random.
                            height: volume > 0 
                                ? `${Math.max(16, Math.min(80, volume * 1.5))}px` 
                                : isSpeaking ? `${Math.max(16, Math.random() * 80)}px` : "16px",
                            opacity: isSpeaking || volume > 5 ? 0.8 : 0.5
                        }}
                    />
                );
            })}
        </div>
    );
}
