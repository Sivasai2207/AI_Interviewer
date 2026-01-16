import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    serverTimestamp,
    deleteDoc,
    writeBatch,
    increment,
} from "firebase/firestore";
import { getAuth as getFirebaseAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp, getApp, deleteApp } from "firebase/app";
import { db, auth, isFirebaseConfigured, firebaseConfig } from "./config";
import type {
    UserProfile,
    Organization,
    PlatformAdmin,
    PlatformAuditLog,
    ImpersonationSession,
    Interview,
    InterviewEvent,
    TranscriptChunk,
    InterviewNote,
    InterviewReport,
    BulkUploadRow,
    BulkUploadResult,
    StudentPerformanceStats,
    PlatformStats,
    OrgStats,
} from "@/types";

// =====================
// Helper Functions
// =====================
function getDb() {
    if (!db) throw new Error("Firebase not configured. Please add your Firebase credentials.");
    return db;
}

function getAuth() {
    if (!auth) throw new Error("Firebase not configured. Please add your Firebase credentials.");
    return auth;
}

// =====================
// Platform Admin Operations
// =====================
export async function createPlatformAdmin(
    uid: string,
    data: Omit<PlatformAdmin, "createdAt">
): Promise<void> {
    await setDoc(doc(getDb(), "platformAdmins", uid), {
        ...data,
        createdAt: serverTimestamp(),
    });
}

export async function getPlatformAdmin(uid: string): Promise<PlatformAdmin | null> {
    try {
        const docSnap = await getDoc(doc(getDb(), "platformAdmins", uid));
        if (docSnap.exists()) {
            return { ...docSnap.data() } as PlatformAdmin;
        }
    } catch (error: any) {
        if (error.code === "permission-denied") {
            return null;
        }
        console.error("Error getting platform admin:", error);
    }
    return null;
}

export async function logPlatformAction(
    data: Omit<PlatformAuditLog, "id" | "timestamp">
): Promise<string> {
    const docRef = await addDoc(collection(getDb(), "platformAuditLogs"), {
        ...data,
        timestamp: serverTimestamp(),
    });
    return docRef.id;
}

export async function getPlatformAuditLogs(limitCount = 50): Promise<PlatformAuditLog[]> {
    const q = query(
        collection(getDb(), "platformAuditLogs"),
        orderBy("timestamp", "desc"),
        limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PlatformAuditLog));
}

// =====================
// Organization Operations
// =====================
export async function createOrganization(
    data: Omit<Organization, "id" | "createdAt" | "updatedAt" | "stats">
): Promise<string> {
    console.log("[Firestore] Creating organization with slug:", data.slug);
    const batch = writeBatch(getDb());

    // Create org document
    const orgRef = doc(collection(getDb(), "organizations"));
    batch.set(orgRef, {
        ...data,
        stats: { studentCount: 0, staffCount: 0, interviewCount: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Create slug mapping
    const slugRef = doc(getDb(), "orgSlugs", data.slug);
    batch.set(slugRef, { orgId: orgRef.id });

    try {
        await batch.commit();
        console.log("[Firestore] Organization created successfully. OrgId:", orgRef.id, "Slug:", data.slug);
        return orgRef.id;
    } catch (error) {
        console.error("[Firestore] Failed to create organization:", error);
        throw error;
    }
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
    console.log("[Firestore] getOrganization called with orgId:", orgId);
    try {
        const orgDoc = await getDoc(doc(getDb(), "organizations", orgId));
        console.log("[Firestore] Organization document exists:", orgDoc.exists());
        if (orgDoc.exists()) {
            const org = { id: orgDoc.id, ...orgDoc.data() } as Organization;
            console.log("[Firestore] Loaded organization:", org.name, "status:", org.status);
            return org;
        }
    } catch (error) {
        console.error("[Firestore] Error getting organization:", error);
    }
    return null;
}

/**
 * Repair missing slug mapping by finding org with matching slug field
 */
export async function repairOrgSlug(slug: string): Promise<string | null> {
    console.log("[Firestore] Attempting to repair slug mapping for:", slug);
    try {
        // Search for organization with this slug
        const orgsRef = collection(getDb(), "organizations");
        const q = query(orgsRef, where("slug", "==", slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const orgDoc = querySnapshot.docs[0];
            const orgId = orgDoc.id;
            console.log("[Firestore] Found org with matching slug. OrgId:", orgId);

            // Create the missing slug mapping
            const slugRef = doc(getDb(), "orgSlugs", slug);
            await setDoc(slugRef, { orgId });
            console.log("[Firestore] Slug mapping repaired successfully!");

            return orgId;
        } else {
            console.warn("[Firestore] No organization found with slug:", slug);
        }
    } catch (error) {
        console.error("[Firestore] Error repairing slug:", error);
    }
    return null;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
    console.log("[Firestore] getOrganizationBySlug called with slug:", slug);
    try {
        const slugDoc = await getDoc(doc(getDb(), "orgSlugs", slug));
        console.log("[Firestore] Slug document exists:", slugDoc.exists(), "data:", slugDoc.data());

        let orgId: string | null = null;

        if (!slugDoc.exists()) {
            console.warn("[Firestore] No slug mapping found. Attempting auto-repair...");
            orgId = await repairOrgSlug(slug);
            if (!orgId) {
                console.error("[Firestore] Slug repair failed. Organization truly does not exist.");
                return null;
            }
        } else {
            orgId = slugDoc.data().orgId;
        }

        console.log("[Firestore] Resolved orgId from slug:", orgId);

        if (!orgId) {
            return null;
        }

        return await getOrganization(orgId);
    } catch (error) {
        console.error("[Firestore] Error getting organization by slug:", error);
    }
    return null;
}

export async function getAllOrganizations(): Promise<Organization[]> {
    const q = query(
        collection(getDb(), "organizations"),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Organization));
}

export async function updateOrganization(
    orgId: string,
    data: Partial<Organization>
): Promise<void> {
    await updateDoc(doc(getDb(), "organizations", orgId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function updateOrgStats(
    orgId: string,
    field: "studentCount" | "staffCount" | "interviewCount",
    delta: number
): Promise<void> {
    await updateDoc(doc(getDb(), "organizations", orgId), {
        [`stats.${field}`]: increment(delta),
        updatedAt: serverTimestamp(),
    });
}

// =====================
// Impersonation Operations
// =====================
export async function createImpersonationSession(
    data: Omit<ImpersonationSession, "id" | "createdAt" | "status">
): Promise<string> {
    const docRef = await addDoc(collection(getDb(), "impersonations"), {
        ...data,
        status: "active",
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getActiveImpersonation(
    platformUid: string
): Promise<ImpersonationSession | null> {
    const q = query(
        collection(getDb(), "impersonations"),
        where("platformUid", "==", platformUid),
        where("status", "==", "active"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ImpersonationSession;
}

export async function endImpersonation(sessionId: string): Promise<void> {
    await updateDoc(doc(getDb(), "impersonations", sessionId), {
        status: "ended",
        endedAt: serverTimestamp(),
    });
}

// =====================
// User Profile Operations (Org-Scoped)
// =====================
export async function createUserProfile(
    uid: string,
    data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
): Promise<void> {
    console.log(`[createUserProfile] Starting batch write for UID: ${uid}, orgId: ${data.orgId}`);
    const batch = writeBatch(getDb());

    // Create user document
    const userRef = doc(getDb(), "users", uid);

    // Sanitize data: remove undefined fields
    const safeData = { ...data };
    Object.keys(safeData).forEach(key =>
        (safeData as any)[key] === undefined && delete (safeData as any)[key]
    );

    const userData = {
        ...safeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    batch.set(userRef, userData);
    console.log(`[createUserProfile] Batch operation 1: Set users/${uid}`, {
        orgId: data.orgId,
        role: data.role,
        email: data.email
    });

    // Add to org members
    if (data.orgId) {
        const memberRef = doc(getDb(), "organizations", data.orgId, "members", uid);

        // Construct member data carefully to avoid undefined
        const memberData: any = {
            uid,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: serverTimestamp(),
        };

        if (data.registrationNumber) memberData.registrationNumber = data.registrationNumber;
        if (data.department) memberData.department = data.department;

        batch.set(memberRef, memberData);
        console.log(`[createUserProfile] Batch operation 2: Set organizations/${data.orgId}/members/${uid}`);
    } else {
        console.warn(`[createUserProfile] No orgId provided, skipping members subcollection`);
    }

    try {
        await batch.commit();
        console.log(`[createUserProfile] ✅ Batch commit successful for UID: ${uid}`);
    } catch (error) {
        console.error(`[createUserProfile] ❌ Batch commit FAILED for UID: ${uid}`, error);
        throw error;
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const docSnap = await getDoc(doc(getDb(), "users", uid));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as UserProfile;
        }
    } catch (error: any) {
        if (error.code === "permission-denied") {
            return null;
        }
        console.error("Error fetching user profile:", error);
    }
    return null;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
        const usersRef = collection(getDb(), "users");
        const q = query(usersRef, where("email", "==", email), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() } as UserProfile;
        }
    } catch (error: any) {
        console.error("[Firestore] Error checking email:", error);
    }
    return null;
}

export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    await updateDoc(doc(getDb(), "users", uid), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// =====================
// Org User Management
// =====================
export async function getOrgMembers(
    orgId: string,
    role?: "super_admin" | "staff" | "student"
): Promise<UserProfile[]> {
    let q;
    if (role) {
        q = query(
            collection(getDb(), "users"),
            where("orgId", "==", orgId),
            where("role", "==", role),
            orderBy("displayName", "asc")
        );
    } else {
        q = query(
            collection(getDb(), "users"),
            where("orgId", "==", orgId),
            orderBy("displayName", "asc")
        );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UserProfile));
}

export async function getOrgStudents(orgId: string): Promise<UserProfile[]> {
    return getOrgMembers(orgId, "student");
}

export async function getOrgStaff(orgId: string): Promise<UserProfile[]> {
    const members = await getOrgMembers(orgId);
    return members.filter((m) => m.role === "staff" || m.role === "super_admin");
}

export async function searchOrgStudents(
    orgId: string,
    searchTerm: string
): Promise<UserProfile[]> {
    const students = await getOrgStudents(orgId);
    const term = searchTerm.toLowerCase();
    return students.filter(
        (s) =>
            s.displayName?.toLowerCase().includes(term) ||
            s.registrationNumber?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term)
    );
}

export async function createOrgUser(
    orgId: string,
    data: {
        name: string;
        email: string;
        role: "super_admin" | "staff" | "student";
        registrationNumber?: string;
        department?: string;
        password?: string;
    },
    createdByUid: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
    try {
        // Check if email already exists in Firestore
        const existingUser = await getUserByEmail(data.email);
        if (existingUser) {
            return {
                success: false,
                error: "Email already registered"
            };
        }

        let uid: string;

        // If password is provided, create a Firebase Auth account using a secondary app
        // This prevents logging out the current user (Platform Owner)
        if (data.password && data.password.length >= 6) {
            try {
                console.log(`[Firestore] Creating Firebase Auth account for ${data.email}`);

                // Validate config
                if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
                    throw new Error("Missing Firebase configuration (apiKey or authDomain)");
                }

                // Initialize secondary app
                const secondaryAppName = `secondaryAuth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                console.log(`[Firestore] Initializing secondary app: ${secondaryAppName}`);
                const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
                const secondaryAuth = getFirebaseAuth(secondaryApp);

                try {
                    const userCredential = await createUserWithEmailAndPassword(
                        secondaryAuth,
                        data.email,
                        data.password
                    );
                    uid = userCredential.user.uid;
                    console.log(`[Firestore] Firebase Auth account created with UID: ${uid}`);

                    // Sign out from secondary app just in case
                    await signOut(secondaryAuth);
                } finally {
                    // Always delete the temporary app
                    await deleteApp(secondaryApp);
                }

            } catch (authError: any) {
                console.error("[Firestore] Firebase Auth error:", authError);

                // Handle specific auth errors
                if (authError.code === "auth/email-already-in-use") {
                    return {
                        success: false,
                        error: "This email is already registered in Firebase Auth. Please use a different email."
                    };
                } else if (authError.code === "auth/weak-password") {
                    return {
                        success: false,
                        error: "Password is too weak. Must be at least 6 characters."
                    };
                } else if (authError.code === "auth/invalid-email") {
                    return {
                        success: false,
                        error: "Invalid email address format."
                    };
                }

                return {
                    success: false,
                    error: authError.message || "Failed to create authentication account"
                };
            }
        } else {
            // No password provided - generate a temporary UID for Firestore-only profile
            // This is for bulk imports where users will need to reset password
            uid = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`[Firestore] No password provided. Created Firestore-only profile with temp UID: ${uid}`);
        }

        // Create user profile in Firestore
        console.log(`[Firestore] Creating user profile in Firestore with data:`, {
            uid,
            email: data.email,
            displayName: data.name,
            role: data.role,
            orgId,
            registrationNumber: data.registrationNumber,
            department: data.department
        });

        await createUserProfile(uid, {
            email: data.email,
            displayName: data.name,
            role: data.role,
            orgId,
            registrationNumber: data.registrationNumber,
            department: data.department,
            createdBy: createdByUid,
            settings: {},
            apiKeyStatus: "unknown",
        });

        console.log(`[Firestore] ✅ User profile created in Firestore users/${uid}`);

        // Update org stats
        const statField = data.role === "student" ? "studentCount" : "staffCount";
        await updateOrgStats(orgId, statField, 1);

        console.log(`[Firestore] User profile created successfully for ${data.email}`);

        return { success: true, uid };
    } catch (error: any) {
        console.error("[Firestore] createOrgUser error:", error);
        return {
            success: false,
            error: error.message || "Failed to create user",
        };
    }
}

export async function bulkCreateOrgStudents(
    orgId: string,
    students: BulkUploadRow[],
    createdByUid: string
): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
        success: true,
        created: 0,
        failed: 0,
        errors: [],
    };

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const createResult = await createOrgUser(
            orgId,
            {
                name: student.name,
                email: student.email,
                role: "student",
                registrationNumber: student.registrationNumber,
                department: student.department,
            },
            createdByUid
        );

        if (createResult.success) {
            result.created++;
        } else {
            result.failed++;
            result.errors.push({
                row: i + 1,
                email: student.email,
                error: createResult.error || "Unknown error",
            });
        }
    }

    result.success = result.failed === 0;
    return result;
}

// =====================
// Interview Operations (Org-Scoped)
// =====================
export async function createInterview(
    orgId: string,
    data: Omit<Interview, "id" | "createdAt" | "orgId">
): Promise<string> {
    const docRef = await addDoc(collection(getDb(), "organizations", orgId, "interviews"), {
        ...data,
        orgId,
        createdAt: serverTimestamp(),
        status: "created",
    });

    // Update org stats
    await updateOrgStats(orgId, "interviewCount", 1);

    return docRef.id;
}

export async function getInterview(orgId: string, id: string): Promise<Interview | null> {
    const docSnap = await getDoc(doc(getDb(), "organizations", orgId, "interviews", id));
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Interview;
    }
    return null;
}

export async function updateInterview(
    orgId: string,
    id: string,
    data: Partial<Interview>
): Promise<void> {
    await updateDoc(doc(getDb(), "organizations", orgId, "interviews", id), {
        ...data,
        lastActiveAt: serverTimestamp(),
    });
}

export async function getUserInterviews(orgId: string, uid: string): Promise<Interview[]> {
    const q = query(
        collection(getDb(), "organizations", orgId, "interviews"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Interview));
}

export async function getOrgInterviews(orgId: string, limitCount = 100): Promise<Interview[]> {
    const q = query(
        collection(getDb(), "organizations", orgId, "interviews"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Interview));
}

// =====================
// Interview Events
// =====================
export async function addInterviewEvent(
    orgId: string,
    interviewId: string,
    event: Omit<InterviewEvent, "id" | "timestamp">
): Promise<string> {
    const docRef = await addDoc(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "events"),
        {
            ...event,
            timestamp: serverTimestamp(),
        }
    );
    return docRef.id;
}

export async function getInterviewEvents(
    orgId: string,
    interviewId: string
): Promise<InterviewEvent[]> {
    const q = query(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "events"),
        orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InterviewEvent));
}

// =====================
// Transcript Operations
// =====================
export async function addTranscriptChunk(
    orgId: string,
    interviewId: string,
    chunk: Omit<TranscriptChunk, "id" | "timestamp">
): Promise<string> {
    const docRef = await addDoc(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "transcript"),
        {
            ...chunk,
            timestamp: serverTimestamp(),
        }
    );
    return docRef.id;
}

export async function getTranscript(
    orgId: string,
    interviewId: string
): Promise<TranscriptChunk[]> {
    const q = query(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "transcript"),
        orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TranscriptChunk));
}

// =====================
// Notes Operations
// =====================
export async function addInterviewNote(
    orgId: string,
    interviewId: string,
    note: Omit<InterviewNote, "id">
): Promise<string> {
    const docRef = await addDoc(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "notes"),
        note
    );
    return docRef.id;
}

export async function getInterviewNotes(
    orgId: string,
    interviewId: string
): Promise<InterviewNote[]> {
    const querySnapshot = await getDocs(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "notes")
    );
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InterviewNote));
}

// =====================
// Report Operations
// =====================
export async function saveInterviewReport(
    orgId: string,
    interviewId: string,
    report: Omit<InterviewReport, "id" | "generatedAt">
): Promise<string> {
    const docRef = await addDoc(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "report"),
        {
            ...report,
            generatedAt: serverTimestamp(),
        }
    );

    await updateInterview(orgId, interviewId, { status: "report_ready" });

    return docRef.id;
}

export async function getInterviewReport(
    orgId: string,
    interviewId: string
): Promise<InterviewReport | null> {
    const querySnapshot = await getDocs(
        collection(getDb(), "organizations", orgId, "interviews", interviewId, "report")
    );
    if (querySnapshot.empty) return null;
    const docData = querySnapshot.docs[0];
    return { id: docData.id, ...docData.data() } as InterviewReport;
}

// =====================
// Stats Operations
// =====================
export async function getStudentPerformanceStats(
    orgId: string,
    studentUid: string
): Promise<StudentPerformanceStats> {
    const interviews = await getUserInterviews(orgId, studentUid);
    const completedInterviews = interviews.filter((i) => i.status === "report_ready");

    const reports: InterviewReport[] = [];
    for (const interview of completedInterviews) {
        const report = await getInterviewReport(orgId, interview.id);
        if (report) reports.push(report);
    }

    const avgScore = reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length)
        : null;

    let skillBreakdown = null;
    if (reports.length > 0) {
        skillBreakdown = {
            fundamentals: 0,
            projectDepth: 0,
            problemSolving: 0,
            systemDesign: 0,
            communication: 0,
            roleFit: 0,
        };
        for (const report of reports) {
            if (report.breakdown) {
                skillBreakdown.fundamentals += report.breakdown.fundamentals || 0;
                skillBreakdown.projectDepth += report.breakdown.projectDepth || 0;
                skillBreakdown.problemSolving += report.breakdown.problemSolving || 0;
                skillBreakdown.systemDesign += report.breakdown.systemDesign || 0;
                skillBreakdown.communication += report.breakdown.communication || 0;
                skillBreakdown.roleFit += report.breakdown.roleFit || 0;
            }
        }
        const count = reports.length;
        skillBreakdown.fundamentals = Math.round(skillBreakdown.fundamentals / count);
        skillBreakdown.projectDepth = Math.round(skillBreakdown.projectDepth / count);
        skillBreakdown.problemSolving = Math.round(skillBreakdown.problemSolving / count);
        skillBreakdown.systemDesign = Math.round(skillBreakdown.systemDesign / count);
        skillBreakdown.communication = Math.round(skillBreakdown.communication / count);
        skillBreakdown.roleFit = Math.round(skillBreakdown.roleFit / count);
    }

    const strengthsMap: Record<string, number> = {};
    const weaknessesMap: Record<string, number> = {};
    for (const report of reports) {
        for (const s of report.strengths || []) {
            strengthsMap[s.point] = (strengthsMap[s.point] || 0) + 1;
        }
        for (const w of report.weaknesses || []) {
            weaknessesMap[w.point] = (weaknessesMap[w.point] || 0) + 1;
        }
    }

    const strengths = Object.entries(strengthsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([point]) => point);
    const weaknesses = Object.entries(weaknessesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([point]) => point);

    const scoreHistory = reports.map((r, idx) => ({
        date: completedInterviews[idx]?.endedAt?.toDate?.()?.toISOString().split("T")[0] || "",
        score: r.overallScore,
        interviewId: completedInterviews[idx]?.id || "",
    }));

    return {
        totalInterviews: interviews.length,
        completedInterviews: completedInterviews.length,
        averageScore: avgScore,
        scoreHistory,
        skillBreakdown,
        strengths,
        weaknesses,
        recentInterviews: interviews.slice(0, 5),
    };
}

export async function getOrgStats(orgId: string): Promise<OrgStats> {
    const org = await getOrganization(orgId);
    if (!org) {
        return {
            studentCount: 0,
            staffCount: 0,
            interviewCount: 0,
            completedInterviews: 0,
            averageScore: null,
            interviewsToday: 0,
            interviewsThisWeek: 0,
        };
    }

    const interviews = await getOrgInterviews(orgId, 500);
    const completed = interviews.filter((i) => i.status === "report_ready");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const interviewsToday = interviews.filter((i) => {
        const createdAt = i.createdAt?.toDate?.();
        return createdAt && createdAt >= todayStart;
    }).length;

    const interviewsThisWeek = interviews.filter((i) => {
        const createdAt = i.createdAt?.toDate?.();
        return createdAt && createdAt >= weekStart;
    }).length;

    return {
        studentCount: org.stats?.studentCount || 0,
        staffCount: org.stats?.staffCount || 0,
        interviewCount: org.stats?.interviewCount || 0,
        completedInterviews: completed.length,
        averageScore: null, // Would need to fetch all reports
        interviewsToday,
        interviewsThisWeek,
    };
}

export async function getPlatformStats(): Promise<PlatformStats> {
    const orgs = await getAllOrganizations();
    const activeOrgs = orgs.filter((o) => o.status === "active");

    let totalStudents = 0;
    let totalStaff = 0;
    let totalInterviews = 0;

    for (const org of orgs) {
        totalStudents += org.stats?.studentCount || 0;
        totalStaff += org.stats?.staffCount || 0;
        totalInterviews += org.stats?.interviewCount || 0;
    }

    return {
        totalOrganizations: orgs.length,
        activeOrganizations: activeOrgs.length,
        totalStudents,
        totalStaff,
        totalInterviews,
        interviewsToday: 0, // Would need aggregation
        interviewsThisWeek: 0,
        interviewsThisMonth: 0,
        averageScoreGlobal: null,
    };
}

export { isFirebaseConfigured };
