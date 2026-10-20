/**
 * Datenmodell VersicherungsPilot.
 *
 * Grundregeln:
 * - Jede fachliche Tabelle trägt `householdId` (Mandantentrennung). Zugriffe filtern
 *   IMMER serverseitig auf den Haushalt der Sitzung (siehe server/auth/session.ts).
 * - Geldbeträge: Integer in Cent + ISO-Währung. Datumsangaben ohne Uhrzeit: `date`.
 * - Laufzeit, Kündigungsfrist und Meldefristen sind getrennte Felder/Entitäten.
 * - Automatisch erkannte Angaben tragen Quelle (Dokument/Seite/Textausschnitt),
 *   Methode, Qualitätsindikator und Überprüfungsstatus.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  vector,
  bigint,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/* ------------------------------------------------------------------ */
/* Auth (Better Auth) – Spaltennamen entsprechen den Feldnamen der Lib */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("two_factor_user_idx").on(t.userId), index("two_factor_secret_idx").on(t.secret)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Haushalt / Mandant                                                  */
/* ------------------------------------------------------------------ */

export const household = pgTable("household", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const householdRole = pgEnum("household_role", ["owner", "member"]);

export const householdMember = pgTable(
  "household_member",
  {
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: householdRole("role").notNull().default("owner"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.userId] }), uniqueIndex("household_member_user_uq").on(t.userId)],
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Europe/Berlin"),
  /** Einwilligung, Dokumentinhalte an den konfigurierten externen KI-Anbieter zu übermitteln. */
  aiProcessingConsentAt: timestamp("ai_processing_consent_at", { withTimezone: true }),
  reminderOffsetsDays: integer("reminder_offsets_days").array().notNull().default(sql`ARRAY[30,14,7]::integer[]`),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Verträge                                                            */
/* ------------------------------------------------------------------ */

export const policyCategory = pgEnum("policy_category", [
  "privathaftpflicht",
  "hausrat",
  "wohngebaeude",
  "kfz",
  "rechtsschutz",
  "unfall",
  "berufsunfaehigkeit",
  "risikoleben",
  "kranken",
  "zahnzusatz",
  "reise",
  "tierhalterhaftpflicht",
  "elektronik",
  "sonstige",
]);

export const paymentInterval = pgEnum("payment_interval", [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "single",
]);

export const policyStatus = pgEnum("policy_status", ["active", "needs_review", "cancelled", "expired"]);

export const reviewStatus = pgEnum("review_status", [
  "auto", // automatisch erkannt, nicht geprüft
  "confirmed", // vom Nutzer bestätigt
  "corrected", // vom Nutzer korrigiert
  "unclear", // nicht eindeutig
  "rejected", // vom Nutzer verworfen
]);

export const insurer = pgTable(
  "insurer",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactAddress: text("contact_address"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("insurer_household_name_uq").on(t.householdId, t.name)],
);

export const insurancePolicy = pgTable(
  "insurance_policy",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    insurerId: text("insurer_id").references(() => insurer.id, { onDelete: "set null" }),
    category: policyCategory("category").notNull().default("sonstige"),
    name: text("name").notNull(),
    policyNumber: text("policy_number"),
    broker: text("broker"),
    policyholderName: text("policyholder_name"),
    status: policyStatus("status").notNull().default("active"),
    /** Versicherungsbeginn */
    startDate: date("start_date"),
    /** Ablauf der aktuellen Versicherungsperiode / Hauptfälligkeit */
    endDate: date("end_date"),
    /** Verlängert sich der Vertrag stillschweigend? null = unbekannt */
    autoRenews: boolean("auto_renews"),
    renewalPeriodMonths: integer("renewal_period_months"),
    /** Kündigungsfrist in Monaten vor Ablauf (strukturiert); null = unbekannt */
    noticePeriodMonths: integer("notice_period_months"),
    /** Originalformulierung bzw. Erläuterung der Kündigungsregelung */
    noticePeriodText: text("notice_period_text"),
    premiumCents: integer("premium_cents"),
    premiumCurrency: text("premium_currency").notNull().default("EUR"),
    paymentInterval: paymentInterval("payment_interval"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("policy_household_idx").on(t.householdId),
    index("policy_number_idx").on(t.householdId, t.policyNumber),
  ],
);

export const insuredPerson = pgTable(
  "insured_person",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    policyId: text("policy_id")
      .notNull()
      .references(() => insurancePolicy.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    createdAt: createdAt(),
  },
  (t) => [index("insured_person_policy_idx").on(t.policyId)],
);

export const insuredObject = pgTable(
  "insured_object",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    policyId: text("policy_id")
      .notNull()
      .references(() => insurancePolicy.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // z. B. Fahrzeug, Wohnung, Gebäude, Tier, Gerät
    description: text("description").notNull(),
    identifier: text("identifier"), // Kennzeichen, Adresse, Seriennummer …
    valueCents: integer("value_cents"),
    createdAt: createdAt(),
  },
  (t) => [index("insured_object_policy_idx").on(t.policyId)],
);

/**
 * Deckungen, Ausschlüsse, Selbstbeteiligungen, Sublimits, Wartezeiten und Obliegenheiten.
 * Bewusst EINE Tabelle mit `kind` statt sechs strukturgleicher Tabellen: gleiche
 * Quellen-/Prüflogik, typisierte Spalten für Beträge und Zeiträume.
 * Entität Coverage = kind 'coverage', Exclusion = 'exclusion', Deductible = 'deductible',
 * Sublimit = 'sublimit', WaitingPeriod = 'waiting_period', Obligation = 'obligation'.
 */
export const policyTermKind = pgEnum("policy_term_kind", [
  "coverage",
  "exclusion",
  "deductible",
  "sublimit",
  "waiting_period",
  "obligation",
]);

/* ------------------------------------------------------------------ */
/* Dokumente                                                           */
/* ------------------------------------------------------------------ */

export const documentType = pgEnum("document_type", [
  "versicherungsschein",
  "avb",
  "besondere_bedingungen",
  "produktinformation",
  "nachtrag",
  "beitragsrechnung",
  "beitragsanpassung",
  "schadenmeldung",
  "korrespondenz",
  "leistungsentscheidung",
  "kuendigung",
  "widerruf",
  "gutachten",
  "rechnung",
  "sonstiges",
]);

export const assignmentStatus = pgEnum("assignment_status", ["unassigned", "suggested", "confirmed"]);

export const processingStatus = pgEnum("processing_status", [
  "uploaded",
  "scanning",
  "extracting_text",
  "ocr",
  "analyzing",
  "needs_review",
  "completed",
  "failed",
]);

export const policyDocument = pgTable(
  "policy_document",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    policyId: text("policy_id").references(() => insurancePolicy.id, { onDelete: "set null" }),
    /** Dokumente, die primär einem Schadenfall zugeordnet sind (Fotos, Rechnungen, Schreiben). */
    claimId: text("claim_id"),
    title: text("title").notNull(),
    docType: documentType("doc_type").notNull().default("sonstiges"),
    docTypeReview: reviewStatus("doc_type_review").notNull().default("auto"),
    /** Datum des Dokuments (z. B. Ausstellungsdatum), soweit erkannt oder angegeben. */
    documentDate: date("document_date"),
    assignment: assignmentStatus("assignment").notNull().default("unassigned"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    /** KI-Zusammenfassung (nur wenn KI konfiguriert & Einwilligung erteilt) */
    summary: jsonb("summary"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("document_household_idx").on(t.householdId),
    index("document_policy_idx").on(t.policyId),
    index("document_claim_idx").on(t.claimId),
  ],
);

export const malwareScanStatus = pgEnum("malware_scan_status", ["not_scanned", "clean", "infected", "error"]);
export const textMethod = pgEnum("text_method", ["pdf_text", "ocr", "mixed", "docx", "none"]);

export const documentVersion = pgTable(
  "document_version",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => policyDocument.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    /** Envelope-Verschlüsselung: Datenschlüssel, verschlüsselt mit dem Master-Key */
    wrappedKey: text("wrapped_key").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    pageCount: integer("page_count"),
    textMethod: textMethod("text_method"),
    malwareScan: malwareScanStatus("malware_scan").notNull().default("not_scanned"),
    status: processingStatus("status").notNull().default("uploaded"),
    statusMessage: text("status_message"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("document_version_no_uq").on(t.documentId, t.versionNo),
    index("document_version_household_sha_idx").on(t.householdId, t.sha256),
    index("document_version_status_idx").on(t.status),
  ],
);

export const documentPage = pgTable(
  "document_page",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => documentVersion.id, { onDelete: "cascade" }),
    pageNo: integer("page_no").notNull(),
    text: text("text").notNull(),
    method: textMethod("method").notNull(),
    /** Mittlere OCR-Konfidenz von Tesseract (0–100), nur bei OCR */
    ocrConfidence: integer("ocr_confidence"),
  },
  (t) => [uniqueIndex("document_page_uq").on(t.versionId, t.pageNo)],
);

export const documentChunk = pgTable(
  "document_chunk",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => policyDocument.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => documentVersion.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    pageStart: integer("page_start").notNull(),
    pageEnd: integer("page_end").notNull(),
    heading: text("heading"),
    content: text("content").notNull(),
    tsv: tsvector("tsv").generatedAlwaysAs(
      sql`to_tsvector('german', coalesce(heading, '') || ' ' || content)`,
    ),
    embedding: vector("embedding", { dimensions: 1024 }),
    embeddingModel: text("embedding_model"),
  },
  (t) => [
    index("chunk_household_idx").on(t.householdId),
    index("chunk_document_idx").on(t.documentId),
    index("chunk_tsv_idx").using("gin", t.tsv),
    index("chunk_trgm_idx").using("gin", sql`${t.content} gin_trgm_ops`),
    index("chunk_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const extractionMethod = pgEnum("extraction_method", ["rule", "llm", "manual"]);
export const confidenceLevel = pgEnum("confidence_level", ["high", "medium", "low"]);

/**
 * Einzelne extrahierte Vertragsangabe samt Fundstelle. `confidence` ist ein
 * qualitativer Indikator (keine kalibrierte Wahrscheinlichkeit).
 */
export const extractedFact = pgTable(
  "extracted_fact",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => policyDocument.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => documentVersion.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    valueText: text("value_text").notNull(),
    valueJson: jsonb("value_json"),
    pageNo: integer("page_no"),
    snippet: text("snippet"),
    method: extractionMethod("method").notNull(),
    confidence: confidenceLevel("confidence").notNull(),
    review: reviewStatus("review").notNull().default("auto"),
    correctedValue: text("corrected_value"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    extractedAt: createdAt(),
  },
  (t) => [index("fact_document_idx").on(t.documentId), index("fact_household_field_idx").on(t.householdId, t.field)],
);

export const policyTerm = pgTable(
  "policy_term",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    policyId: text("policy_id")
      .notNull()
      .references(() => insurancePolicy.id, { onDelete: "cascade" }),
    kind: policyTermKind("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents"),
    currency: text("currency").default("EUR"),
    /** Prozentuale Angaben (z. B. SB 10 %) in Basispunkten */
    percentBp: integer("percent_bp"),
    durationDays: integer("duration_days"),
    sourceDocumentId: text("source_document_id").references(() => policyDocument.id, { onDelete: "set null" }),
    sourcePage: integer("source_page"),
    sourceSnippet: text("source_snippet"),
    method: extractionMethod("method").notNull().default("manual"),
    review: reviewStatus("review").notNull().default("auto"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("policy_term_policy_idx").on(t.policyId, t.kind)],
);

/* ------------------------------------------------------------------ */
/* Fristen, Aufgaben, Erinnerungen                                     */
/* ------------------------------------------------------------------ */

export const deadlineKind = pgEnum("deadline_kind", [
  "cancellation", // Kündigungsfrist
  "renewal", // Vertragsverlängerung / Hauptfälligkeit
  "premium_due",
  "insurer_letter", // Frist aus Versichererschreiben
  "submission", // Nachreichungsfrist
  "claim_report", // Schadenmeldefrist
  "follow_up", // Wiedervorlage
  "custom",
]);
export const deadlineCertainty = pgEnum("deadline_certainty", ["confirmed", "derived", "unclear"]);
export const deadlineStatus = pgEnum("deadline_status", ["needs_confirmation", "open", "done", "dismissed"]);

export const contractDeadline = pgTable(
  "contract_deadline",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    policyId: text("policy_id").references(() => insurancePolicy.id, { onDelete: "cascade" }),
    claimId: text("claim_id"),
    kind: deadlineKind("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: date("due_date").notNull(),
    /** Berechnungsgrundlage bei abgeleiteten Fristen */
    basis: text("basis"),
    certainty: deadlineCertainty("certainty").notNull(),
    status: deadlineStatus("status").notNull(),
    sourceDocumentId: text("source_document_id").references(() => policyDocument.id, { onDelete: "set null" }),
    sourcePage: integer("source_page"),
    sourceSnippet: text("source_snippet"),
    /** Herkunftsschlüssel, verhindert Duplikate bei erneuter Verarbeitung */
    originKey: text("origin_key"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("deadline_household_due_idx").on(t.householdId, t.dueDate),
    uniqueIndex("deadline_origin_uq").on(t.householdId, t.originKey),
  ],
);

export const reminder = pgTable(
  "reminder",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    deadlineId: text("deadline_id")
      .notNull()
      .references(() => contractDeadline.id, { onDelete: "cascade" }),
    offsetDays: integer("offset_days").notNull(),
    remindOn: date("remind_on").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reminder_uq").on(t.deadlineId, t.offsetDays), index("reminder_due_idx").on(t.remindOn)],
);

export const notification = pgTable(
  "notification",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notification_household_idx").on(t.householdId, t.createdAt)],
);

export const taskPriority = pgEnum("task_priority", ["urgent", "soon", "info"]);
export const taskStatus = pgEnum("task_status", ["open", "done", "dismissed"]);
export const taskSource = pgEnum("task_source", ["system", "ai", "user"]);

/** Aufgaben (ClaimTask und allgemeine Aufgaben, z. B. „Angaben prüfen“). */
export const task = pgTable(
  "task",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    claimId: text("claim_id"),
    policyId: text("policy_id").references(() => insurancePolicy.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => policyDocument.id, { onDelete: "cascade" }),
    deadlineId: text("deadline_id").references(() => contractDeadline.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: taskPriority("priority").notNull().default("soon"),
    status: taskStatus("status").notNull().default("open"),
    source: taskSource("source").notNull().default("system"),
    dueDate: date("due_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    originKey: text("origin_key"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("task_household_idx").on(t.householdId, t.status),
    uniqueIndex("task_origin_uq").on(t.householdId, t.originKey),
  ],
);

/* ------------------------------------------------------------------ */
/* Schadenfälle                                                        */
/* ------------------------------------------------------------------ */

export const claimStatus = pgEnum("claim_status", [
  "draft",
  "facts_incomplete",
  "policy_check",
  "info_missing",
  "preparing",
  "report_prepared",
  "submitted_by_user",
  "awaiting_response",
  "evidence_requested",
  "insurer_reviewing",
  "approved",
  "partially_approved",
  "rejected",
  "objection_prepared",
  "closed",
]);

export const claim = pgTable(
  "claim",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    occurredOn: date("occurred_on"),
    occurredAtText: text("occurred_at_text"),
    location: text("location"),
    ownerOfDamagedItem: text("owner_of_damaged_item"),
    causedBy: text("caused_by"),
    estimatedDamageCents: integer("estimated_damage_cents"),
    alreadyReported: boolean("already_reported"),
    acuteDanger: boolean("acute_danger").notNull().default(false),
    status: claimStatus("status").notNull().default("draft"),
    insurerClaimNumber: text("insurer_claim_number"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("claim_household_idx").on(t.householdId, t.status)],
);

export const claimAssessment = pgEnum("claim_assessment", ["possible", "unlikely", "unclear", "not_relevant"]);

/** Prüfstatus je Versicherung innerhalb eines Schadenfalls */
export const claimPolicy = pgTable(
  "claim_policy",
  {
    claimId: text("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    policyId: text("policy_id")
      .notNull()
      .references(() => insurancePolicy.id, { onDelete: "cascade" }),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    assessment: claimAssessment("assessment").notNull().default("unclear"),
    rationale: text("rationale"),
    analysisId: text("analysis_id"),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.claimId, t.policyId] })],
);

export const claimEvent = pgTable(
  "claim_event",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("claim_event_claim_idx").on(t.claimId, t.createdAt)],
);

export const evidenceStatus = pgEnum("evidence_status", ["needed", "available", "submitted"]);

export const claimEvidence = pgTable(
  "claim_evidence",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => policyDocument.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    status: evidenceStatus("status").notNull().default("needed"),
    originKey: text("origin_key"),
    createdAt: createdAt(),
  },
  (t) => [index("claim_evidence_claim_idx").on(t.claimId), uniqueIndex("claim_evidence_origin_uq").on(t.claimId, t.originKey)],
);

export const communication = pgTable(
  "communication",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    claimId: text("claim_id").references(() => claim.id, { onDelete: "cascade" }),
    policyId: text("policy_id").references(() => insurancePolicy.id, { onDelete: "set null" }),
    direction: text("direction").notNull(), // outgoing | incoming
    channel: text("channel").notNull(), // letter | email | phone | portal
    subject: text("subject").notNull(),
    summary: text("summary"),
    documentId: text("document_id").references(() => policyDocument.id, { onDelete: "set null" }),
    occurredOn: date("occurred_on").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("communication_claim_idx").on(t.claimId)],
);

export const generatedDocKind = pgEnum("generated_doc_kind", [
  "claim_report",
  "damage_description",
  "evidence_list",
  "cover_letter",
  "status_inquiry",
  "evidence_response",
  "rejection_explanation_request",
  "objection",
  "case_summary",
]);

export const generatedDocument = pgTable(
  "generated_document",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    claimId: text("claim_id").references(() => claim.id, { onDelete: "cascade" }),
    policyId: text("policy_id").references(() => insurancePolicy.id, { onDelete: "set null" }),
    kind: generatedDocKind("kind").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    /** Offene, vom Nutzer zu ergänzende Punkte */
    openPoints: jsonb("open_points").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("draft"), // draft | final
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("generated_document_claim_idx").on(t.claimId)],
);

/* ------------------------------------------------------------------ */
/* KI, Chat, Audit                                                     */
/* ------------------------------------------------------------------ */

export const aiAnalysis = pgTable(
  "ai_analysis",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // chat_answer | coverage_check | document_summary | extraction | classification | portfolio
    subjectType: text("subject_type"),
    subjectId: text("subject_id"),
    provider: text("provider").notNull(), // anthropic | none
    model: text("model"),
    status: text("status").notNull(), // completed | failed | retrieval_only
    output: jsonb("output"),
    /** Liste der verwendeten Quellen (Chunk-IDs, Dokument, Seite) */
    sources: jsonb("sources"),
    /** Ergebnis der Belegprüfung (verworfene/unbelegte Aussagen) */
    verification: jsonb("verification"),
    error: text("error"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_analysis_subject_idx").on(t.householdId, t.subjectType, t.subjectId)],
);

export const chatConversation = pgTable(
  "chat_conversation",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("chat_conversation_household_idx").on(t.householdId, t.updatedAt)],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => chatConversation.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    /** Strukturierte Antwort (Abschnitte, Belege, Unsicherheiten) */
    answer: jsonb("answer"),
    analysisId: text("analysis_id"),
    createdAt: createdAt(),
  },
  (t) => [index("chat_message_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: id(),
    householdId: text("household_id"),
    userId: text("user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    /** Nur technische Metadaten – keine Dokumentinhalte */
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_household_idx").on(t.householdId, t.createdAt)],
);

/** Nachweis durchgeführter Kontolöschungen (ohne personenbezogene Inhalte). */
export const deletionRecord = pgTable("deletion_record", {
  id: id(),
  subjectHash: text("subject_hash").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  details: jsonb("details"),
});
