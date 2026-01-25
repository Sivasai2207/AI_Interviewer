import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload
 * @param path The path in storage (e.g., organizations/{orgId}/resumes/{uid})
 */
export async function uploadFile(file: File, path: string): Promise<string> {
    if (!storage) throw new Error("Firebase Storage is not initialized");

    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
}
