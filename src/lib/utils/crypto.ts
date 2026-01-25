import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
    }
    return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded ciphertext (iv + authTag + encrypted)
 */
export function encryptApiKey(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine: IV (12) + AuthTag (16) + Encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString("base64");
}

/**
 * Decrypt a ciphertext that was encrypted with encryptApiKey
 * @param ciphertext - Base64 encoded ciphertext
 * @returns The original plaintext string
 */
export function decryptApiKey(ciphertext: string): string {
    const key = getEncryptionKey();
    const combined = Buffer.from(ciphertext, "base64");

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
}

/**
 * Mask an API key for display (e.g., "AIza...abcd")
 */
export function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
        return "****";
    }
    return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
