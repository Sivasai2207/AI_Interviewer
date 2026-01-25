import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlBarProps {
    isMicOn: boolean;
    onToggleMic: () => void;
    isCameraOn: boolean;
    onToggleCamera: () => void;
    onToggleChat: () => void;
    onEndCall: () => void;
    className?: string;
}

export function ControlBar({
    isMicOn,
    onToggleMic,
    isCameraOn,
    onToggleCamera,
    onToggleChat,
    onEndCall,
    className
}: ControlBarProps) {
    return (
        <div className={cn(
            "flex items-center justify-center gap-4 p-4 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 shadow-2xl",
            className
        )}>
            <Button
                variant={isMicOn ? "secondary" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full transition-all hover:scale-110"
                onClick={onToggleMic}
            >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
                variant={isCameraOn ? "secondary" : "outline"}
                size="icon"
                className={cn(
                    "h-12 w-12 rounded-full border-0 transition-all hover:scale-110",
                    isCameraOn ? "bg-zinc-700 text-white hover:bg-zinc-600" : "bg-black/40 text-zinc-400 hover:bg-zinc-800"
                )}
                onClick={onToggleCamera}
            >
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5 transition-all hover:scale-110"
                onClick={onToggleChat}
            >
                <MessageSquare className="h-5 w-5" />
            </Button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <Button
                variant="destructive"
                className="h-12 px-6 rounded-full font-medium shadow-lg hover:bg-red-600 transition-all hover:scale-105"
                onClick={onEndCall}
            >
                <PhoneOff className="h-5 w-5 mr-2" />
                End
            </Button>
        </div>
    );
}
