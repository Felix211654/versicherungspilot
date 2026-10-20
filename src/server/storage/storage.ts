import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";
import { decryptFile, encryptFile } from "./crypto";

/**
 * Privater Objektspeicher. Dateien werden VOR dem Speichern clientseitig (in der App)
 * verschlüsselt; S3 zusätzlich mit SSE (AES256). Es gibt keine öffentlichen URLs –
 * Downloads laufen ausschließlich über /api/files/[token] mit Berechtigungsprüfung.
 */
interface BlobStore {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalStore implements BlobStore {
  constructor(private root: string) {}
  private resolve(key: string) {
    if (!/^[a-zA-Z0-9/_-]+$/.test(key) || key.includes("..")) throw new Error("Ungültiger Speicher-Schlüssel");
    return path.join(path.resolve(this.root), key);
  }
  async put(key: string, data: Buffer) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true, mode: 0o700 });
    await writeFile(p, data, { mode: 0o600 });
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

class S3Store implements BlobStore {
  private client: S3Client;
  constructor(private bucket: string) {
    const e = env();
    this.client = new S3Client({
      region: e.S3_REGION ?? "eu-central-1",
      endpoint: e.S3_ENDPOINT,
      forcePathStyle: e.S3_FORCE_PATH_STYLE === "true",
      credentials:
        e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }
  async put(key: string, data: Buffer) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: "application/octet-stream",
        ServerSideEncryption: "AES256",
      }),
    );
  }
  async get(key: string) {
    const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!r.Body) throw new Error("Objekt leer");
    return Buffer.from(await r.Body.transformToByteArray());
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let store: BlobStore | undefined;
function blobStore(): BlobStore {
  if (!store) {
    const e = env();
    if (e.STORAGE_DRIVER === "s3") {
      if (!e.S3_BUCKET) throw new Error("S3_BUCKET ist nicht konfiguriert");
      store = new S3Store(e.S3_BUCKET);
    } else {
      store = new LocalStore(e.STORAGE_LOCAL_DIR);
    }
  }
  return store;
}

export function storageKeyFor(householdId: string, versionId: string) {
  return `h/${householdId}/v/${versionId}`;
}

export async function putEncrypted(key: string, plaintext: Buffer): Promise<{ wrappedKey: string }> {
  const { ciphertext, wrappedKey } = encryptFile(env().FILE_ENCRYPTION_KEY, plaintext);
  await blobStore().put(key, ciphertext);
  return { wrappedKey };
}

export async function getDecrypted(key: string, wrappedKey: string): Promise<Buffer> {
  const blob = await blobStore().get(key);
  return decryptFile(env().FILE_ENCRYPTION_KEY, wrappedKey, blob);
}

export async function deleteBlob(key: string) {
  await blobStore().delete(key);
}
