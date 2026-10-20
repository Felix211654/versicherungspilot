import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Envelope-Verschlüsselung:
 * - Jede Datei erhält einen zufälligen 256-bit-Datenschlüssel (DEK).
 * - Datei: AES-256-GCM mit DEK. Format: [12 Byte IV][16 Byte Tag][Ciphertext]
 * - DEK wird mit dem Master-Key (KEK, FILE_ENCRYPTION_KEY) ebenfalls per AES-256-GCM
 *   verschlüsselt ("wrapped") und in der Datenbank gespeichert.
 * Der Objektspeicher sieht damit nie Klartext. Ein KMS kann den KEK später ersetzen
 * (keyVersion in document_version).
 */
const IV_LEN = 12;
const TAG_LEN = 16;

function gcmEncrypt(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plaintext), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}

function gcmDecrypt(key: Buffer, blob: Buffer): Buffer {
  if (blob.length < IV_LEN + TAG_LEN) throw new Error("Verschlüsselte Daten unvollständig");
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(blob.subarray(IV_LEN + TAG_LEN)), d.final()]);
}

export function encryptFile(masterKeyB64: string, plaintext: Buffer) {
  const kek = Buffer.from(masterKeyB64, "base64");
  const dek = randomBytes(32);
  const ciphertext = gcmEncrypt(dek, plaintext);
  const wrappedKey = gcmEncrypt(kek, dek).toString("base64");
  dek.fill(0);
  return { ciphertext, wrappedKey };
}

export function decryptFile(masterKeyB64: string, wrappedKey: string, ciphertext: Buffer): Buffer {
  const kek = Buffer.from(masterKeyB64, "base64");
  const dek = gcmDecrypt(kek, Buffer.from(wrappedKey, "base64"));
  try {
    return gcmDecrypt(dek, ciphertext);
  } finally {
    dek.fill(0);
  }
}

/* ---------------- Kurzlebige signierte Download-Tokens ---------------- */

export type DownloadClaims = {
  /** document_version.id */
  v: string;
  /** household id – wird beim Einlösen zusätzlich gegen die Sitzung geprüft */
  h: string;
  /** Ablauf (Unix-Sekunden) */
  exp: number;
  /** inline | attachment */
  d: "inline" | "attachment";
};

const b64url = (b: Buffer) => b.toString("base64url");

export function signDownloadToken(secret: string, claims: DownloadClaims): string {
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(secret: string, token: string, nowSec = Math.floor(Date.now() / 1000)): DownloadClaims | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DownloadClaims;
    if (typeof claims.exp !== "number" || claims.exp < nowSec) return null;
    return claims;
  } catch {
    return null;
  }
}
