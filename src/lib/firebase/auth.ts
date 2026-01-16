import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config";

export type AuthUser = User;

export async function signUp(
    email: string,
    password: string,
    displayName?: string
): Promise<User> {
    if (!auth) throw new Error("Firebase not configured. Please add your Firebase credentials.");
    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

    if (displayName) {
        await updateProfile(userCredential.user, { displayName });
    }

    return userCredential.user;
}

export async function signIn(email: string, password: string): Promise<User> {
    if (!auth) throw new Error("Firebase not configured. Please add your Firebase credentials.");
    const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );
    return userCredential.user;
}

export async function signInWithGoogle(): Promise<User> {
    if (!auth) throw new Error("Firebase not configured. Please add your Firebase credentials.");
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
}

export async function signOut(): Promise<void> {
    if (!auth) return;
    await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
    if (!auth) {
        // If Firebase is not configured, just call callback with null
        callback(null);
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
    return auth?.currentUser || null;
}

export async function updateUserProfile(updates: {
    displayName?: string;
    photoURL?: string;
}): Promise<void> {
    const user = auth?.currentUser;
    if (user) {
        await updateProfile(user, updates);
    }
}

export { isFirebaseConfigured };
