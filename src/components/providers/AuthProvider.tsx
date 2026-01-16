"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import {
    getUserProfile,
    getPlatformAdmin,
    getActiveImpersonation,
} from "@/lib/firebase/firestore";
import { signOut } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store";
import type { UserProfile, PlatformAdmin, ImpersonationSession, UserRole } from "@/types";

interface AuthContextType {
    user: {
        uid: string;
        email: string | null;
        displayName: string | null;
    } | null;
    userProfile: UserProfile | null;
    platformAdmin: PlatformAdmin | null;
    role: UserRole | null;
    orgId: string | null;
    orgSlug: string | null;
    impersonationSession: ImpersonationSession | null;
    loading: boolean;
    isPlatformOwner: boolean;
    isOrgAdmin: boolean;
    isOrgStaff: boolean;
    isStudent: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    platformAdmin: null,
    role: null,
    orgId: null,
    orgSlug: null,
    impersonationSession: null,
    loading: true,
    isPlatformOwner: false,
    isOrgAdmin: false,
    isOrgStaff: false,
    isStudent: false,
});

const INACTIVITY_TIMEOUT = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
const LAST_ACTIVITY_KEY = "lastActivityTime";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const activityCheckInterval = useRef<NodeJS.Timeout | null>(null);
    
    const {
        user,
        userProfile,
        platformAdmin,
        role,
        orgId,
        orgSlug,
        impersonationSession,
        setUser,
        setUserProfile,
        setPlatformAdmin,
        setOrgId,
        setOrgSlug,
        setImpersonation,
        setLoading: setStoreLoading,
        reset,
    } = useAuthStore();

    // Update last activity timestamp
    const updateLastActivity = useCallback(() => {
        const now = Date.now();
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        console.log("[Session] Activity detected, updated last activity:", new Date(now).toLocaleString());
    }, []);

    // Check for inactivity and auto-logout if needed
    const checkInactivity = useCallback(async () => {
        if (!user) return;

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) {
            console.log("[Session] No last activity found, setting current time");
            updateLastActivity();
            return;
        }

        const lastActivityTime = parseInt(lastActivity, 10);
        const now = Date.now();
        const inactiveFor = now - lastActivityTime;
        const inactiveHours = inactiveFor / (60 * 60 * 1000);

        console.log(`[Session] Checking inactivity: Last activity ${inactiveHours.toFixed(2)} hours ago`);

        if (inactiveFor > INACTIVITY_TIMEOUT) {
            console.warn(`[Session] User inactive for ${inactiveHours.toFixed(2)} hours. Auto-logging out...`);
            try {
                await signOut();
                localStorage.removeItem(LAST_ACTIVITY_KEY);
                console.log("[Session] Auto-logout successful");
                
                // Show notification to user
                if (typeof window !== "undefined") {
                    alert("You have been logged out due to 48 hours of inactivity. Please log in again.");
                }
            } catch (error) {
                console.error("[Session] Auto-logout failed:", error);
            }
        } else {
            const remainingHours = (INACTIVITY_TIMEOUT - inactiveFor) / (60 * 60 * 1000);
            console.log(`[Session] Session valid. Will auto-logout in ${remainingHours.toFixed(2)} hours`);
        }
    }, [user, updateLastActivity]);

    // Track user activity
    useEffect(() => {
        if (!user) return;

        console.log("[Session] Setting up activity tracking for user:", user.email);

        // Events that indicate user activity
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            window.addEventListener(event, updateLastActivity, { passive: true });
        });

        // Set initial activity
        updateLastActivity();

        // Start inactivity check interval
        activityCheckInterval.current = setInterval(checkInactivity, ACTIVITY_CHECK_INTERVAL);
        console.log(`[Session] Started inactivity check (every ${ACTIVITY_CHECK_INTERVAL / 1000} seconds)`);

        // Initial inactivity check
        checkInactivity();

        return () => {
            console.log("[Session] Cleaning up activity tracking");
            activityEvents.forEach(event => {
                window.removeEventListener(event, updateLastActivity);
            });
            if (activityCheckInterval.current) {
                clearInterval(activityCheckInterval.current);
            }
        };
    }, [user, updateLastActivity, checkInactivity]);

    useEffect(() => {
        if (!isFirebaseConfigured || !auth) {
            console.log("[Session] Firebase not configured");
            setLoading(false);
            setStoreLoading(false);
            return;
        }

        console.log("[Session] Setting up auth state listener");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
            if (firebaseUser) {
                console.log("[Session] User authenticated:", firebaseUser.email, "UID:", firebaseUser.uid);
                
                // Set basic user info
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                });

                try {
                    // Check if platform owner first
                    const platformAdminData = await getPlatformAdmin(firebaseUser.uid);
                    
                    if (platformAdminData && platformAdminData.status === "active") {
                        console.log("[Session] User is platform owner");
                        setPlatformAdmin(platformAdminData);
                        
                        // Check for active impersonation session
                        const impersonation = await getActiveImpersonation(firebaseUser.uid);
                        if (impersonation) {
                            console.log("[Session] Active impersonation found:", impersonation.orgSlug);
                            setImpersonation(impersonation);
                            setOrgId(impersonation.orgId);
                            setOrgSlug(impersonation.orgSlug);
                        }
                    } else {
                        // Check for regular org user profile
                        console.log("[Session] Checking for user profile in Firestore for UID:", firebaseUser.uid);
                        const profile = await getUserProfile(firebaseUser.uid);
                        if (profile) {
                            console.log("[Session] ✅ User profile loaded:", {
                                role: profile.role,
                                orgId: profile.orgId,
                                email: profile.email,
                                displayName: profile.displayName
                            });
                            setUserProfile(profile);
                            setOrgId(profile.orgId);
                        } else {
                            console.error("[Session] ❌ NO USER PROFILE FOUND in Firestore for UID:", firebaseUser.uid);
                            console.error("[Session] This means the user exists in Firebase Auth but not in Firestore users collection");
                        }
                    }
                } catch (error) {
                    console.error("[Session] Error fetching user data:", error);
                }
                
                // Initialize last activity for new login
                const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
                if (!lastActivity) {
                    updateLastActivity();
                }
            } else {
                console.log("[Session] User logged out");
                localStorage.removeItem(LAST_ACTIVITY_KEY);
                reset();
            }

            setLoading(false);
            setStoreLoading(false);
        }, (error) => {
            console.error("[Session] Auth state change error:", error);
            setLoading(false);
            setStoreLoading(false);
        });

        return () => {
            console.log("[Session] Cleaning up auth state listener");
            unsubscribe();
        };
    }, [updateLastActivity]);

    const isPlatformOwner = role === "platform_owner";
    const isOrgAdmin = role === "super_admin";
    const isOrgStaff = role === "staff" || role === "super_admin";
    const isStudent = role === "student";

    return (
        <AuthContext.Provider
            value={{
                user,
                userProfile,
                platformAdmin,
                role,
                orgId,
                orgSlug,
                impersonationSession,
                loading,
                isPlatformOwner,
                isOrgAdmin,
                isOrgStaff,
                isStudent,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
