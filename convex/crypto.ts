// ─── Secret encryption at rest (AES-256-GCM) ─────────────────────
//
// Broker investor passwords are encrypted with AES-GCM using a key
// derived (SHA-256) from the `MT5_ENCRYPTION_KEY` Convex environment
// variable. The random IV means encryption is non-deterministic, so
// these helpers must only be called from ACTIONS (never queries or
// mutations, which Convex requires to be deterministic).
//
// Stored format:  "v2:" + base64(iv[12] || ciphertext)
//
// Records written before this upgrade used a simple XOR scheme with no
// prefix; `decryptSecret` transparently falls back to that so existing
// connected accounts keep working until they reconnect.

const LEGACY_XOR_KEY = "TradeMind_MT5_S3cure_K3y_2024!";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  const secret = process.env.MT5_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "MT5_ENCRYPTION_KEY environment variable is not set. " +
        "Set it on your Convex deployment before connecting an account " +
        "(npx convex env set MT5_ENCRYPTION_KEY <a long random string>)."
    );
  }
  // Derive a fixed 256-bit key from an arbitrary-length passphrase.
  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey(
    "raw",
    material,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const ctBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + ctBytes.length);
  combined.set(iv, 0);
  combined.set(ctBytes, iv.length);

  return "v2:" + bytesToBase64(combined);
}

export async function decryptSecret(stored: string): Promise<string> {
  if (stored.startsWith("v2:")) {
    const combined = base64ToBytes(stored.slice(3));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await importKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  }

  // Legacy XOR-obfuscated record (base64 of XOR'd bytes).
  const decoded = atob(stored);
  let result = "";
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded.charCodeAt(i) ^ LEGACY_XOR_KEY.charCodeAt(i % LEGACY_XOR_KEY.length)
    );
  }
  return result;
}
