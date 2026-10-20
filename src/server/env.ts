import "server-only";
import { z } from "zod";

/**
 * Zentrale, validierte Konfiguration. Fehlende optionale Integrationen werden NICHT
 * simuliert, sondern als "nicht konfiguriert" ausgewiesen (siehe integrationStatus()).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL fehlt"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET muss mind. 32 Zeichen haben"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  /** 32 Byte, base64 – Master-Key für die Envelope-Verschlüsselung der Dateien */
  FILE_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, "base64").length === 32, {
    message: "FILE_ENCRYPTION_KEY muss 32 Byte (base64) lang sein",
  }),
  /** HMAC-Schlüssel für kurzlebige Download-Links */
  DOWNLOAD_SIGNING_SECRET: z.string().min(32),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./.data/storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),

  /** KI-Anbieter für Textgenerierung. "none" = KI-Funktionen deaktiviert. */
  AI_PROVIDER: z.enum(["none", "anthropic"]).default("none"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  /** Embeddings: "none" = nur Volltextsuche; "voyage" = Voyage AI (Anthropic-Empfehlung) */
  EMBEDDING_PROVIDER: z.enum(["none", "voyage"]).default("none"),
  VOYAGE_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default("voyage-3.5"),

  /** ClamAV-Daemon für Virenscan (optional) */
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().default(3310),

  OCR_LANGUAGES: z.string().default("deu+eng"),
  MAX_UPLOAD_MB: z.coerce.number().default(25),
  TMP_DIR: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Ungültige Konfiguration: ${msg}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export type IntegrationState = { configured: boolean; detail: string };

export function integrationStatus() {
  const e = env();
  const ai: IntegrationState =
    e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY
      ? { configured: true, detail: `Anthropic (${e.AI_MODEL})` }
      : {
          configured: false,
          detail:
            e.AI_PROVIDER === "anthropic"
              ? "AI_PROVIDER=anthropic, aber ANTHROPIC_API_KEY fehlt"
              : "Kein KI-Anbieter konfiguriert (AI_PROVIDER=none)",
        };
  const embeddings: IntegrationState =
    e.EMBEDDING_PROVIDER === "voyage" && e.VOYAGE_API_KEY
      ? { configured: true, detail: `Voyage AI (${e.EMBEDDING_MODEL})` }
      : { configured: false, detail: "Keine Embeddings – Suche nutzt PostgreSQL-Volltextsuche" };
  const malware: IntegrationState = e.CLAMAV_HOST
    ? { configured: true, detail: `ClamAV ${e.CLAMAV_HOST}:${e.CLAMAV_PORT}` }
    : { configured: false, detail: "Kein Virenscanner konfiguriert – Dateien werden als „nicht geprüft“ markiert" };
  const storage: IntegrationState =
    e.STORAGE_DRIVER === "s3"
      ? { configured: Boolean(e.S3_BUCKET), detail: `S3-kompatibel (${e.S3_BUCKET ?? "Bucket fehlt"})` }
      : { configured: true, detail: "Lokales Dateisystem (nur Entwicklung/Einzelserver)" };
  const email: IntegrationState = { configured: false, detail: "E-Mail-Versand/-Import ist noch nicht integriert" };
  return { ai, embeddings, malware, storage, email };
}
