"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOrg } from "@/components/providers/OrgContext";
import { useInterviewStore } from "@/store";
import { getGeminiClient } from "@/lib/gemini/client";
import {
    getInterview,
    updateInterview,
    addInterviewEvent,
    addTranscriptChunk,
    saveInterviewReport,
} from "@/lib/firebase/firestore";
import {
    QuestionPanel,
    AnswerInput,
    TranscriptPanel,
    Timer,
    InterviewHeader,
    AudioVisualizer,
    ControlBar
} from "@/components/interview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, AlertTriangle, Mic, PhoneOff, Maximize, X } from "lucide-react";
import { EnvironmentPrepModal } from "@/components/interview/EnvironmentPrepModal";
import { FullscreenExitModal } from "@/components/interview/FullscreenExitModal";
import { MalpracticeScreen } from "@/components/interview/MalpracticeScreen";
import type { ConnectionState, ViolationLog, ViolationType, MalpracticeReport } from "@/types/interview-live";
import { Timestamp } from "firebase/firestore";
import type { Interview, InterviewContext, InterviewPolicy } from "@/types";
import type { AudioRecorder } from "@/lib/audio/recorder";
import type { AudioPlayer } from "@/lib/audio/player";
import { cn } from "@/lib/utils";
import type { GeminiLiveClient } from "@/lib/gemini/live-client";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const DEFAULT_POLICY: InterviewPolicy = {
    requireConsent: true,
    recordAudio: true,
    recordVideo: false,
    captureTranscript: true,
    tabSwitchMonitoring: true,
    maxTabSwitchWarnings: 2,
    autoEndOnViolation: true,
    requireIdentityVerification: false,
    retentionDays: 180,
};

export default function InterviewRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const { orgId, orgSlug, organization } = useOrg();
    const interviewId = params?.id as string;

    const {
        timer,
        currentQuestion,
        transcript,
        isEvaluatorMode,
        updateTimer,
        setCurrentQuestion,
        addToTranscript,
        setEvaluatorMode,
        reset: resetInterview,
    } = useInterviewStore();

    // Map store values to local variables for compatibility
    const isRecording = timer.isRunning;
    const timeRemaining = timer.remainingSeconds;
    const setRecording = (isRunning: boolean) => updateTimer({ isRunning });

    const [interview, setInterview] = useState<Interview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tab monitoring state
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [warningsIssued, setWarningsIssued] = useState(0);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState("");
    
    // Live Interview State
    const [connectionState, setConnectionState] = useState<ConnectionState>("IDLE");
    const [showWatchdog, setShowWatchdog] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [connectionError, setConnectionError] = useState("");
    const [showRetry, setShowRetry] = useState(false);
    
    // UI State for Redesign
    const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(false);
    
    // Tess Introduction State
    const [introPlayed, setIntroPlayed] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0); // Real-time volume level (0-100)
    const [aiVolume, setAiVolume] = useState(0); // AI's volume level
    
    // Kiosk Mode State
    const [showEnvPrepModal, setShowEnvPrepModal] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [violations, setViolations] = useState<ViolationLog[]>([]);
    const [violationCount, setViolationCount] = useState(0);
    const [isTerminated, setIsTerminated] = useState(false);
    const [showMalpracticeScreen, setShowMalpracticeScreen] = useState(false);
    
    const escPressStartRef = useRef<number | null>(null);
    const escHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Refs
    const recorderRef = useRef<AudioRecorder | null>(null);
    const playerRef = useRef<AudioPlayer | null>(null);
    const geminiClientRef = useRef<GeminiLiveClient | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isReadyRef = useRef(false);
    const introPlayedRef = useRef(false); // Ref for immediate access in callbacks
    const currentAiTextRef = useRef(""); // To accumulate streaming AI text
    const currentUserTextRef = useRef(""); // To accumulate streaming User text

    const policy = organization?.interviewPolicy || DEFAULT_POLICY;

    // Initial Load & Session Lifecycle
    useEffect(() => {
        if (!user || !orgId) return;
        loadInterview();
        return () => {
            cleanupSession();
        };
    }, [user, orgId, interviewId]);

    // Initialize Camera State based on policy
    useEffect(() => {
        if (policy.recordVideo) {
            setIsCameraOn(true);
        }
    }, [policy.recordVideo]);

    const cleanupSession = () => {
        console.log("[Room] Cleaning up session...");
        setRecording(false);
        setConnectionState("IDLE");
        
        if (recorderRef.current) {
            recorderRef.current.stop();
            recorderRef.current = null;
        }
        if (playerRef.current) {
            playerRef.current.stop();
            playerRef.current = null;
        }
        if (geminiClientRef.current) {
            geminiClientRef.current.disconnect();
            geminiClientRef.current = null;
        }
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };

    const loadInterview = async () => {
        try {
            console.log("[Room] Loading interview:", interviewId);
            console.log("[Room] Fetching interview doc from Firestore");
            const data = await getInterview(orgId!, interviewId);
            
            if (!data) {
                console.error("[Room] Interview not found");
                throw new Error("Interview not found. This interview may have been deleted or the link is invalid.");
            }
            
            console.log("[Room] Interview doc loaded, status:", data.status);
            
            if (data.status === "ended" || data.status === "report_ready") {
                console.log("[Room] Interview already ended, redirecting to report");
                router.push(`/${orgSlug}/student/report/${interviewId}`);
                return;
            }

            setInterview(data);
            
            // Sync intro state
            if (data.introPlayed) {
                setIntroPlayed(true);
                introPlayedRef.current = true;
            }

            updateTimer({ 
                totalSeconds: data.durationMin * 60,
                remainingSeconds: data.durationMin * 60 
            });

            console.log("[Room] Interview loaded successfully, connecting to Live API");
            // Auto-connect to Live API with fresh data (state 'interview' is not updated yet!)
            connectToLiveAPI(data);
        } catch (err: any) {
            console.error("[Room] Error loading interview:", err);
            setError(err.message || "Failed to load interview");
            setIsLoading(false);
        }
    };

    const connectToLiveAPI = async (interviewData?: Interview) => {
        if (geminiClientRef.current?.connected || connectionState !== "IDLE") return;
        
        // Use passed data or fallback to state (though state might be stale if called from loadInterview)
        const currentInterview = interviewData || interview;

        console.log("[Room] Starting client-side Gemini connection");
        setConnectionState("CONNECTING_KEY");
        setIsLoading(false); // Show room UI
        setConnectionError("");
        setShowRetry(false);
        
        try {
            // 1. Fetch user's API key from server
            console.log("[Room] Fetching API key...");
            const { auth: firebaseAuth } = await import("@/lib/firebase/config");
            const token = await firebaseAuth?.currentUser?.getIdToken();
            
            if (!token) {
                throw new Error("Not authenticated. Please log in again.");
            }

            const keyResponse = await fetch("/api/student/get-api-key", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!keyResponse.ok) {
                const errorData = await keyResponse.json();
                throw new Error(errorData.error || "Failed to fetch API key");
            }

            const { apiKey } = await keyResponse.json();
            console.log("[Room] API key retrieved");

            // Update State: Connecting to Socket
            setConnectionState("CONNECTING_SOCKET");

            // 2. Build system prompt locally
            const { buildInterviewSystemPrompt, buildOpeningMessage } = await import("@/lib/gemini/prompts");
            
            // Resolve Candidate Name with priority: User Profile (Firestore) -> Auth Profile -> Resume Header -> "Candidate"
            const candidateName = userProfile?.displayName || 
                                  user?.displayName || 
                                  currentInterview?.resumeText?.split('\n')[0]?.substring(0, 50) || 
                                  "Candidate";

            const experienceYears = parseInt(currentInterview?.jdYearsRequired || "0") || 0;
            const primaryRole = currentInterview?.roleApplied || "Software Developer";

            // Fallback resume text if empty, to prevent "Hard Boundary" block
            const rawResumeKey = currentInterview?.resumeText || (currentInterview as any)?.resume?.fullText || "";
            const effectiveResumeText = rawResumeKey && rawResumeKey.length > 50 
                ? rawResumeKey 
                : `[AUTO-GENERATED CONTEXT] Candidate Name: ${candidateName}. Role: ${primaryRole}. Experience: ${experienceYears} years. (No resume provided).`;

            console.log("[Room] Effective Resume Text Preview:", effectiveResumeText.substring(0, 200) + "...");
            if (effectiveResumeText.includes("[AUTO-GENERATED CONTEXT]")) {
                console.warn("[Room] ⚠️ USING AUTO-GENERATED CONTEXT - Real resume missing or too short");
            } else {
                console.log("[Room] ✓ Using provided resume text");
            }

            const systemInstruction = buildInterviewSystemPrompt({
                candidateName,
                experienceYears,
                primaryRole,
                secondaryRoles: [],
                durationMin: currentInterview?.durationMin || 15,
                hasJD: currentInterview?.hasJD || false,
                resumeText: effectiveResumeText,
                jdText: currentInterview?.jdText || "",
                policySummary: "Standard interview policy - audio recorded",
            });

            console.log("[Room] System prompt built for role:", primaryRole);

            // 3. Initialize Audio Player
            console.log("[Room] Initializing audio player");
            const { AudioPlayer } = await import("@/lib/audio/player");
            if (!playerRef.current) {
               playerRef.current = new AudioPlayer();
               await playerRef.current.init();
            }

            // 4. Initialize Audio Recorder
            console.log("[Room] Initializing audio recorder");
            const { AudioRecorder } = await import("@/lib/audio/recorder");
            
            // 5. Create and connect Gemini Live Client
            const { GeminiLiveClient } = await import("@/lib/gemini/live-client");
            
            console.log("[Room] Effective Resume Text Length:", effectiveResumeText.length);
            console.log("[Room] Resume Text Preview:", effectiveResumeText.substring(0, 200));

            const client = new GeminiLiveClient({
                apiKey,
                systemInstruction,
                voiceName: "Kore",
                onInterrupted: () => {
                     console.log("[Room] Interruption detected - clearing audio queue");
                     playerRef.current?.clear();
                     setIsSpeaking(false);
                },
                onReady: async () => {
                    console.log("[Room] ✓ Gemini ready callback received");
                    isReadyRef.current = true;
                    setConnectionState("READY");
                    setRecording(true);
                    
                    // Start Audio Capture
                    if (!recorderRef.current) {
                        recorderRef.current = new AudioRecorder((data: string) => {
                            if (geminiClientRef.current?.connected && isMicOn) {
                                geminiClientRef.current.sendAudio(data);
                                resetWatchdog();
                            }
                        }, (vol: number) => {
                            setVolume(vol); // Update volume state
                        });
                    }
                    await recorderRef.current.start();
                    console.log("[Room] ✓ Audio capture started");
                    
                    // 🎤 Send intro kick with personalized greeting
                    if (!introPlayedRef.current) {
                        const introDirective = `[SYSTEM] Start the interview now. 
Greeting: Greet ${candidateName} professionally.
Role: Tech Interviewer for ${primaryRole} (${experienceYears} yrs exp).
First Question: Ask one specific technical question based on their resume.
Tone: Concise, technical, and natural.`;

                        console.log("[Room] Triggering Tess greeting for:", candidateName);
                        setIsSpeaking(true);
                        geminiClientRef.current?.sendIntroKick(introDirective);
                    } else {
                        console.log("[Room] Intro already played, skipping kick");
                    }
                },
                onAudio: (audioData: string) => {
                    playerRef.current?.playChunk(audioData);
                    resetWatchdog();
                    
                    // Track speaking state - AI is speaking when audio arrives
                    if (!introPlayedRef.current) {
                        setIntroPlayed(true);
                        introPlayedRef.current = true;
                        
                        // Persist to Firestore
                        updateInterview(orgId!, interviewId, {
                            introPlayed: true,
                            introPlayedAt: Timestamp.now()
                        }).catch(e => console.error("[Room] Failed to update intro status:", e));
                    }
                    
                    // Connection is effectively streaming now
                    // We can safely cast here or check against known states
                    setConnectionState("STREAMING");
                    
                    setIsSpeaking(true);
                    
                    // Reset speaking state after audio stops (debounced)
                    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = setTimeout(() => {
                        setIsSpeaking(false);
                    }, 1000);
                },
                onVolume: (vol: number) => {
                     setAiVolume(vol);
                },
                onUserText: (text: string) => {
                    console.log("[Room] User transcription (streaming):", text);
                    currentUserTextRef.current = text;
                    // You could update a "live" transcript entry here if desired
                },
                onText: (text: string) => {
                    console.log("[Room] AI transcription (streaming):", text);
                    currentAiTextRef.current = text;
                    
                    // Update local store with progressive text (using fixed ID or sequence for AI turn)
                    // For now, we'll just log it. In a full UI update, we'd update a "current" bubble.
                },
                onTurnComplete: () => {
                    console.log("[Room] Turn complete. Checking for pending commits...");
                    
                    // 1. Commit AI Text if present
                    if (currentAiTextRef.current) {
                        const finalAiText = currentAiTextRef.current;
                        console.log("[Room] Committing AI Transcription:", finalAiText);
                        addToTranscript({
                            speaker: "interviewer",
                            text: finalAiText,
                            sequenceNumber: Date.now(),
                        });
                        
                        addTranscriptChunk(orgId!, interviewId, {
                            speaker: "interviewer",
                            text: finalAiText,
                            sequenceNumber: Date.now(),
                        }).catch(e => console.error("[Room] Failed to log AI transcript:", e));
                        
                        currentAiTextRef.current = "";
                    }

                    // 2. Commit User Text if present (from audio transcription)
                    if (currentUserTextRef.current) {
                        const finalUserText = currentUserTextRef.current;
                        console.log("[Room] Committing User Transcription:", finalUserText);
                        addToTranscript({
                            speaker: "candidate",
                            text: finalUserText,
                            sequenceNumber: Date.now() + 1,
                        });
                        
                        addTranscriptChunk(orgId!, interviewId, {
                            speaker: "candidate",
                            text: finalUserText,
                            sequenceNumber: Date.now() + 1,
                        }).catch(e => console.error("[Room] Failed to log user transcript:", e));
                        
                        currentUserTextRef.current = "";
                    }
                    
                    setIsSpeaking(false);
                    resetWatchdog();
                },
                onError: (error: Error) => {
                    console.error("[Room] Gemini error:", error);
                    setConnectionError(error.message);
                    setConnectionState("ERROR");
                    setShowRetry(true);
                },
                onClose: () => {
                    console.log("[Room] Gemini connection closed");
                    if (!isReadyRef.current) {
                        setConnectionError("Connection closed before ready");
                        setConnectionState("ERROR");
                        setShowRetry(true);
                    } else {
                        setConnectionState("ENDED");
                    }
                }
            });

            geminiClientRef.current = client;
            await client.connect();
            
        } catch (err: any) {
            console.error("[Room] Connection failed:", err);
            setConnectionError(err.message || "Failed to connect to Gemini");
            setConnectionState("ERROR");
            setShowRetry(true);
        }
    };
    
    // ... (rest of the file)
    
    // Helper for status text
    const getStatusText = () => {
        switch (connectionState) {
            case "STREAMING": 
                if (isSpeaking) return "Tess is speaking...";
                if (introPlayed) return "Your turn...";
                return "Tess Live";
            case "READY": return "Tess Live";
            case "HANDSHAKING": return "Bringing Tess Online...";
            case "CONNECTING_SOCKET": return "Connecting to Tess...";
            case "CONNECTING_KEY": return "Starting Interview...";
            case "ENDED": return "Interview Ended";
            case "ERROR": return "Tess Offline";
            default: return "Ready";
        }
    };

    const resetWatchdog = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (showWatchdog) setShowWatchdog(false);
        
        // 30s silence warning
        silenceTimeoutRef.current = setTimeout(() => {
            if (isEvaluatorMode) return;
            setShowWatchdog(true);
            
            // Another 30s -> Auto End
            silenceTimeoutRef.current = setTimeout(() => {
                 if (isEvaluatorMode) return;
                 handleEndInterview(true); 
            }, 30000);
        }, 30000);
    };

    // ==================
    // KIOSK MODE HANDLERS
    // ==================
    
    const handleEnvPrepReady = async () => {
        setShowEnvPrepModal(false);
        // Enter fullscreen
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (error) {
            console.error("Failed to enter fullscreen:", error);
            // Continue anyway, but log warning
        }
    };

    const handleViolation = async (type: ViolationType) => {
        if (isTerminated) return;

        const newCount = violationCount + 1;
        setViolationCount(newCount);

        const violation: ViolationLog = {
            type,
            timestamp: Timestamp.now(),
            count: newCount,
            action: newCount > 3 ? "terminated" : "warning",
            details: `Violation #${newCount}: ${type.replace(/_/g, " ")}`,
        };

        setViolations(prev => [...prev, violation]);

        // Log to Firestore
        try {
            await fetch("/api/student/log-violation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    interviewId,
                    orgId,
                    uid: user?.uid,
                    violation,
                }),
            });
        } catch (error) {
            console.error("Failed to log violation:", error);
        }

        if (newCount > 3) {
            // Terminate for malpractice
            await terminateForMalpractice(violations);
        } else {
            // Show warning toast
            const message = 
                newCount === 1 ? "⚠️ Warning: Attempted to leave fullscreen. This has been logged." :
                newCount === 2 ? "⚠️ Second Warning: Do not leave fullscreen again. Next violation will end the interview." :
                newCount === 3 ? "⚠️ Final Warning: One more violation and your interview will be terminated." :
                "🚨 Malpractice Detected";
            
            // You can use a toast library here, or just use the existing warning modal
            setWarningMessage(message);
            setShowWarningModal(true);
            setTimeout(() => setShowWarningModal(false), 5000);
        }
    };

    const terminateForMalpractice = async (finalViolations: ViolationLog[]) => {
        setIsTerminated(true);
        setShowMalpracticeScreen(true);
        cleanupSession();

        try {
            // Log malpractice report
            await fetch("/api/student/terminate-malpractice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    interviewId,
                    orgId,
                    uid: user?.uid,
                    violations: finalViolations,
                    violationCount: violationCount + 1,
                }),
            });

            // Exit fullscreen before redirect
            if (document.fullscreenElement) {
                try {
                    await document.exitFullscreen();
                } catch (e) {
                    console.log("[Room] Failed to exit fullscreen:", e);
                }
            }

            // Wait 5 seconds, then redirect
            setTimeout(() => {
                router.push(`/${orgSlug}/student/dashboard`);
            }, 5000);
        } catch (error) {
            console.error("Failed to log malpractice:", error);
        }
    };

    const handleFullscreenExitAttempt = () => {
        setShowExitModal(true);
    };

    const handleStayFullscreen = async () => {
        setShowExitModal(false);
        // Re-enter fullscreen
        try {
            await document.documentElement.requestFullscreen();
        } catch (error) {
            console.error("Failed to re-enter fullscreen:", error);
        }
    };

    const handleLeaveFullscreen = async () => {
        setShowExitModal(false);
        await handleViolation("fullscreen_exit");
        // End interview
        await handleEndInterview(true);
    };

    // Fullscreen change detection
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isNowFullscreen);

            // If user exited fullscreen without using our modal
            if (!isNowFullscreen && !showExitModal && connectionState === "STREAMING") {
                handleViolation("fullscreen_exit");
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [showExitModal, connectionState]);

    // ESC key hold detection (3 seconds)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) {
                e.preventDefault();
                
                if (!escPressStartRef.current) {
                    escPressStartRef.current = Date.now();
                    
                    escHoldTimeoutRef.current = setTimeout(() => {
                        // ESC held for 3 seconds
                        handleFullscreenExitAttempt();
                        escPressStartRef.current = null;
                    }, 3000);
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                // Released before 3 seconds
                if (escHoldTimeoutRef.current) {
                    clearTimeout(escHoldTimeoutRef.current);
                    escHoldTimeoutRef.current = null;
                }
                escPressStartRef.current = null;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            if (escHoldTimeoutRef.current) clearTimeout(escHoldTimeoutRef.current);
        };
    }, [isFullscreen]);


    const handleEndInterview = async (endedForViolation = false) => {
        cleanupSession();
        setEvaluatorMode(true);
        
        // Exit fullscreen before navigating away
        if (document.fullscreenElement) {
            try {
                await document.exitFullscreen();
            } catch (e) {
                console.log("[Room] Failed to exit fullscreen:", e);
            }
        }
        
        try {
            // 1. End the interview
            await fetch("/api/student/interview/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    interviewId,
                    orgId,
                    uid: user?.uid,
                    reason: endedForViolation ? "Silence Watchdog" : "User Ended",
                    endedForViolation
                }),
            });
            
            // 2. Generate performance report
            console.log("[Room] Generating performance report...");
            const { auth: firebaseAuth } = await import("@/lib/firebase/config");
            const token = await firebaseAuth?.currentUser?.getIdToken();
            
            if (token) {
                await fetch("/api/student/interview/generate-report", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ interviewId, orgId }),
                });
                console.log("[Room] ✓ Report generation triggered");
            }
            
            router.push(`/${orgSlug}/student/report/${interviewId}`);
        } catch (e) {
            console.error(e);
            // Navigate to report page anyway (report might generate later)
            router.push(`/${orgSlug}/student/report/${interviewId}`);
        }
    };

    const handleConfirmEnd = () => {
        setShowEndConfirm(true);
    };

    const handleSubmitAnswer = async (answer: string) => {
        // Send text to Gemini if connected
        if (geminiClientRef.current?.connected) {
             geminiClientRef.current.sendText(answer);
             
             // Optimistic local update
             addToTranscript({ 
                 speaker: "candidate", 
                 text: answer, 
                 sequenceNumber: transcript.length + 1,
             });
             
             // 📝 Log to Firestore transcript
             addTranscriptChunk(orgId!, interviewId, {
                 speaker: "candidate",
                 text: answer,
                 sequenceNumber: transcript.length + 1,
             }).catch(e => console.error("[Room] Failed to log user transcript:", e));
        }
    };

    const handleIDontKnow = () => {
        handleSubmitAnswer("I don't know the answer to this question.");
    };

    const handleTimeUp = async () => {
        console.log("[Room] Timer finished. Auto-ending interview.");
        await handleEndInterview(true); // Treat as system-ended
    };

    // Toggle Handlers
    const toggleMic = () => {
        setIsMicOn(!isMicOn);
        // Actual logic to mute/unmute if we had access to the stream directly,
        // but here we just stop sending data in the recorder callback
    };

    const toggleCamera = () => {
        setIsCameraOn(!isCameraOn);
        // In a real app, this would stop/start the video track
    };


    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center flex-col gap-4 bg-black text-white">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="text-zinc-400">Entering immersive room...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-black">
                <Card className="max-w-md bg-zinc-900 border-zinc-800 text-white">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                        <h2 className="text-xl font-bold text-red-500">Connection Error</h2>
                        <p className="text-sm text-zinc-400">{error}</p>
                        <Button variant="secondary" onClick={() => router.push(`/${orgSlug}/student`)}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen h-screen w-screen overflow-hidden relative flex flex-col text-white">
            
            {/* Header / Top Bar */}
            <header className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                   <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", 
                            connectionState === "STREAMING" ? "bg-green-500" : "bg-yellow-500"
                        )} />
                        <span className="text-xs font-medium text-white/80 uppercase tracking-widest">
                            {getStatusText()}
                        </span>
                        
                        <div className="w-px h-3 bg-white/20 mx-2" />
                        
                        <Timer 
                            className="text-xs font-mono text-white" 
                            onTimeUp={handleTimeUp}
                        />
                   </div>
                </div>

                {/* Question Prompt (Floating) */}
                {currentQuestion && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-24 max-w-2xl w-full text-center pointer-events-auto transition-all duration-500">
                        <h2 className="text-2xl md:text-3xl font-light leading-tight text-white/90 drop-shadow-xl">
                            {currentQuestion}
                        </h2>
                    </div>
                )}
            </header>

            {/* Main Stage: Audio Visualizer */}
            <main className="flex-1 flex items-center justify-center relative z-10">
                <AudioVisualizer 
                    isSpeaking={isSpeaking || (isMicOn && connectionState === "STREAMING" && volume > 2)} 
                    mode={isSpeaking ? "speaking" : "listening"} 
                    volume={isSpeaking ? aiVolume : volume} // Dynamic volume assignment
                    className="scale-150"
                />
            </main>

            {/* PIP Video Preview */}
            {isCameraOn && (
                <div className="absolute top-6 right-6 w-48 h-32 bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-2xl z-30 transition-all hover:scale-105 cursor-move">
                     {/* Placeholder for actual video stream */}
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-xs text-zinc-500">Camera Preview</span>
                         {/* <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" /> */}
                    </div>
                </div>
            )}

            {/* Bottom Control Bar */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center z-30 pointer-events-auto">
                 <ControlBar 
                    isMicOn={isMicOn}
                    onToggleMic={toggleMic}
                    isCameraOn={isCameraOn}
                    onToggleCamera={toggleCamera}
                    onToggleChat={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
                    onEndCall={handleConfirmEnd}
                 />
            </div>

            {/* Connections & Loaders Overlays */}
            {(connectionState === "CONNECTING_KEY" || connectionState === "CONNECTING_SOCKET" || connectionState === "HANDSHAKING") && !connectionError && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                        <p className="text-lg font-light text-zinc-300">
                            {connectionState === "CONNECTING_KEY" && "Starting Interview with Tess..."}
                            {connectionState === "CONNECTING_SOCKET" && "Connecting to Tess..."}
                            {connectionState === "HANDSHAKING" && "Bringing Tess Online..."}
                        </p>
                    </div>
                </div>
            )}
            
            {/* Error Overlay */}
            {connectionError && showRetry && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
                   <div className="bg-zinc-900 border border-red-900/50 p-6 rounded-2xl max-w-md text-center space-y-4 shadow-2xl">
                        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
                        <h3 className="text-xl font-semibold text-white">Connection Lost</h3>
                        <p className="text-zinc-400">{connectionError}</p>
                        <div className="flex gap-3 justify-center pt-2">
                             <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => router.push(`/${orgSlug}/student`)}>
                                Exit
                             </Button>
                             <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => {
                                setConnectionState("IDLE");
                                setConnectionError("");
                                setShowRetry(false);
                                connectToLiveAPI();
                             }}>
                                Try Again
                             </Button>
                        </div>
                   </div>
                </div>
            )}

            {/* Side Drawer for Transcript (Custom Implementation since no Sheet) */}
            <div className={cn(
                "absolute top-0 right-0 h-full w-full md:w-[400px] bg-zinc-950/95 backdrop-blur-xl border-l border-white/10 z-40 transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
                showTranscriptDrawer ? "translate-x-0" : "translate-x-full"
            )}>
                 <div className="flex items-center justify-between p-4 border-b border-white/5">
                     <h3 className="font-semibold text-white">Transcript & Notes</h3>
                     <Button variant="ghost" size="icon" onClick={() => setShowTranscriptDrawer(false)} className="text-zinc-400 hover:text-white">
                         <X className="h-5 w-5" />
                     </Button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Reuse existing panels but ensure they look good in dark mode */}
                      <TranscriptPanel className="h-full bg-transparent border-0 shadow-none text-zinc-300" />
                 </div>

                 <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                     <AnswerInput 
                        onSubmit={handleSubmitAnswer}
                        onIDontKnow={handleIDontKnow}
                        disabled={isEvaluatorMode || isSubmitting}
                        isSubmitting={isSubmitting}
                        className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-within:border-white/20"
                     />
                 </div>
            </div>

            {/* Modals from original code */}
            <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            Proctoring Warning
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {warningMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => setShowWarningModal(false)}>
                            I Understand
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showWatchdog} onOpenChange={(open) => { if (!open) resetWatchdog(); }}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                   <DialogHeader>
                       <DialogTitle>Are you still there?</DialogTitle>
                       <DialogDescription className="text-zinc-400">We haven't detected activity for 30 seconds.</DialogDescription>
                   </DialogHeader>
                   <div className="flex gap-2 justify-end">
                       <Button variant="destructive" onClick={() => handleEndInterview(true)}>End Interview</Button>
                       <Button variant="secondary" onClick={resetWatchdog}>Continue</Button>
                   </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                   <DialogHeader>
                       <DialogTitle>End Interview?</DialogTitle>
                       <DialogDescription className="text-zinc-400">Are you sure you want to end? You cannot restart.</DialogDescription>
                   </DialogHeader>
                   <div className="flex gap-2 justify-end">
                       <Button variant="ghost" className="text-white hover:bg-zinc-800" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
                       <Button variant="destructive" onClick={() => handleEndInterview(false)}>End Interview</Button>
                   </div>
                </DialogContent>
            </Dialog>
            
            <EnvironmentPrepModal 
                open={showEnvPrepModal} 
                onReady={handleEnvPrepReady} 
            />
            
            <FullscreenExitModal 
                open={showExitModal}
                onStay={handleStayFullscreen}
                onLeave={handleLeaveFullscreen}
            />
            
            <MalpracticeScreen 
                open={showMalpracticeScreen}
                violationCount={violationCount}
            />
        </div>
    );
}
