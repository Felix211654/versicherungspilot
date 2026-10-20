CREATE TYPE "public"."assignment_status" AS ENUM('unassigned', 'suggested', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."claim_assessment" AS ENUM('possible', 'unlikely', 'unclear', 'not_relevant');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('draft', 'facts_incomplete', 'policy_check', 'info_missing', 'preparing', 'report_prepared', 'submitted_by_user', 'awaiting_response', 'evidence_requested', 'insurer_reviewing', 'approved', 'partially_approved', 'rejected', 'objection_prepared', 'closed');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."deadline_certainty" AS ENUM('confirmed', 'derived', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."deadline_kind" AS ENUM('cancellation', 'renewal', 'premium_due', 'insurer_letter', 'submission', 'claim_report', 'follow_up', 'custom');--> statement-breakpoint
CREATE TYPE "public"."deadline_status" AS ENUM('needs_confirmation', 'open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('versicherungsschein', 'avb', 'besondere_bedingungen', 'produktinformation', 'nachtrag', 'beitragsrechnung', 'beitragsanpassung', 'schadenmeldung', 'korrespondenz', 'leistungsentscheidung', 'kuendigung', 'widerruf', 'gutachten', 'rechnung', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('needed', 'available', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."extraction_method" AS ENUM('rule', 'llm', 'manual');--> statement-breakpoint
CREATE TYPE "public"."generated_doc_kind" AS ENUM('claim_report', 'damage_description', 'evidence_list', 'cover_letter', 'status_inquiry', 'evidence_response', 'rejection_explanation_request', 'objection', 'case_summary');--> statement-breakpoint
CREATE TYPE "public"."household_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."malware_scan_status" AS ENUM('not_scanned', 'clean', 'infected', 'error');--> statement-breakpoint
CREATE TYPE "public"."payment_interval" AS ENUM('monthly', 'quarterly', 'semiannual', 'annual', 'single');--> statement-breakpoint
CREATE TYPE "public"."policy_category" AS ENUM('privathaftpflicht', 'hausrat', 'wohngebaeude', 'kfz', 'rechtsschutz', 'unfall', 'berufsunfaehigkeit', 'risikoleben', 'kranken', 'zahnzusatz', 'reise', 'tierhalterhaftpflicht', 'elektronik', 'sonstige');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('active', 'needs_review', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."policy_term_kind" AS ENUM('coverage', 'exclusion', 'deductible', 'sublimit', 'waiting_period', 'obligation');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('uploaded', 'scanning', 'extracting_text', 'ocr', 'analyzing', 'needs_review', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('auto', 'confirmed', 'corrected', 'unclear', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('urgent', 'soon', 'info');--> statement-breakpoint
CREATE TYPE "public"."task_source" AS ENUM('system', 'ai', 'user');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."text_method" AS ENUM('pdf_text', 'ocr', 'mixed', 'docx', 'none');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"kind" text NOT NULL,
	"subject_type" text,
	"subject_id" text,
	"provider" text NOT NULL,
	"model" text,
	"status" text NOT NULL,
	"output" jsonb,
	"sources" jsonb,
	"verification" jsonb,
	"error" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"answer" jsonb,
	"analysis_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"occurred_on" date,
	"occurred_at_text" text,
	"location" text,
	"owner_of_damaged_item" text,
	"caused_by" text,
	"estimated_damage_cents" integer,
	"already_reported" boolean,
	"acute_danger" boolean DEFAULT false NOT NULL,
	"status" "claim_status" DEFAULT 'draft' NOT NULL,
	"insurer_claim_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_event" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"claim_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"claim_id" text NOT NULL,
	"document_id" text,
	"description" text NOT NULL,
	"status" "evidence_status" DEFAULT 'needed' NOT NULL,
	"origin_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_policy" (
	"claim_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"household_id" text NOT NULL,
	"assessment" "claim_assessment" DEFAULT 'unclear' NOT NULL,
	"rationale" text,
	"analysis_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_policy_claim_id_policy_id_pk" PRIMARY KEY("claim_id","policy_id")
);
--> statement-breakpoint
CREATE TABLE "communication" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"claim_id" text,
	"policy_id" text,
	"direction" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text NOT NULL,
	"summary" text,
	"document_id" text,
	"occurred_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_deadline" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"policy_id" text,
	"claim_id" text,
	"kind" "deadline_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" date NOT NULL,
	"basis" text,
	"certainty" "deadline_certainty" NOT NULL,
	"status" "deadline_status" NOT NULL,
	"source_document_id" text,
	"source_page" integer,
	"source_snippet" text,
	"origin_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deletion_record" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_hash" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "document_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"document_id" text NOT NULL,
	"version_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"page_start" integer NOT NULL,
	"page_end" integer NOT NULL,
	"heading" text,
	"content" text NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('german', coalesce(heading, '') || ' ' || content)) STORED,
	"embedding" vector(1024),
	"embedding_model" text
);
--> statement-breakpoint
CREATE TABLE "document_page" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"version_id" text NOT NULL,
	"page_no" integer NOT NULL,
	"text" text NOT NULL,
	"method" text_method NOT NULL,
	"ocr_confidence" integer
);
--> statement-breakpoint
CREATE TABLE "document_version" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"document_id" text NOT NULL,
	"version_no" integer NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"wrapped_key" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"page_count" integer,
	"text_method" text_method,
	"malware_scan" "malware_scan_status" DEFAULT 'not_scanned' NOT NULL,
	"status" "processing_status" DEFAULT 'uploaded' NOT NULL,
	"status_message" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_version_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "extracted_fact" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"document_id" text NOT NULL,
	"version_id" text NOT NULL,
	"field" text NOT NULL,
	"value_text" text NOT NULL,
	"value_json" jsonb,
	"page_no" integer,
	"snippet" text,
	"method" "extraction_method" NOT NULL,
	"confidence" "confidence_level" NOT NULL,
	"review" "review_status" DEFAULT 'auto' NOT NULL,
	"corrected_value" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_document" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"claim_id" text,
	"policy_id" text,
	"kind" "generated_doc_kind" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"open_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_member" (
	"household_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "household_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_member_household_id_user_id_pk" PRIMARY KEY("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "insurance_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"insurer_id" text,
	"category" "policy_category" DEFAULT 'sonstige' NOT NULL,
	"name" text NOT NULL,
	"policy_number" text,
	"broker" text,
	"policyholder_name" text,
	"status" "policy_status" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"auto_renews" boolean,
	"renewal_period_months" integer,
	"notice_period_months" integer,
	"notice_period_text" text,
	"premium_cents" integer,
	"premium_currency" text DEFAULT 'EUR' NOT NULL,
	"payment_interval" "payment_interval",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insured_object" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"identifier" text,
	"value_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insured_person" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurer" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_document" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"policy_id" text,
	"claim_id" text,
	"title" text NOT NULL,
	"doc_type" "document_type" DEFAULT 'sonstiges' NOT NULL,
	"doc_type_review" "review_status" DEFAULT 'auto' NOT NULL,
	"document_date" date,
	"assignment" "assignment_status" DEFAULT 'unassigned' NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_term" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"kind" "policy_term_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_cents" integer,
	"currency" text DEFAULT 'EUR',
	"percent_bp" integer,
	"duration_days" integer,
	"source_document_id" text,
	"source_page" integer,
	"source_snippet" text,
	"method" "extraction_method" DEFAULT 'manual' NOT NULL,
	"review" "review_status" DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reminder" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"deadline_id" text NOT NULL,
	"offset_days" integer NOT NULL,
	"remind_on" date NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"claim_id" text,
	"policy_id" text,
	"document_id" text,
	"deadline_id" text,
	"title" text NOT NULL,
	"description" text,
	"priority" "task_priority" DEFAULT 'soon' NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"source" "task_source" DEFAULT 'system' NOT NULL,
	"due_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"origin_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"two_factor_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"ai_processing_consent_at" timestamp with time zone,
	"reminder_offsets_days" integer[] DEFAULT ARRAY[30,14,7]::integer[] NOT NULL,
	"email_notifications" boolean DEFAULT false NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_event" ADD CONSTRAINT "claim_event_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_event" ADD CONSTRAINT "claim_event_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_event" ADD CONSTRAINT "claim_event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_document_id_policy_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."policy_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_policy" ADD CONSTRAINT "claim_policy_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_policy" ADD CONSTRAINT "claim_policy_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_policy" ADD CONSTRAINT "claim_policy_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication" ADD CONSTRAINT "communication_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication" ADD CONSTRAINT "communication_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication" ADD CONSTRAINT "communication_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication" ADD CONSTRAINT "communication_document_id_policy_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."policy_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_deadline" ADD CONSTRAINT "contract_deadline_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_deadline" ADD CONSTRAINT "contract_deadline_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_deadline" ADD CONSTRAINT "contract_deadline_source_document_id_policy_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."policy_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_document_id_policy_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."policy_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_version_id_document_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_page" ADD CONSTRAINT "document_page_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_page" ADD CONSTRAINT "document_page_version_id_document_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_document_id_policy_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."policy_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fact" ADD CONSTRAINT "extracted_fact_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fact" ADD CONSTRAINT "extracted_fact_document_id_policy_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."policy_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fact" ADD CONSTRAINT "extracted_fact_version_id_document_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fact" ADD CONSTRAINT "extracted_fact_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_document" ADD CONSTRAINT "generated_document_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_document" ADD CONSTRAINT "generated_document_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_document" ADD CONSTRAINT "generated_document_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policy" ADD CONSTRAINT "insurance_policy_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policy" ADD CONSTRAINT "insurance_policy_insurer_id_insurer_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insured_object" ADD CONSTRAINT "insured_object_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insured_object" ADD CONSTRAINT "insured_object_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insured_person" ADD CONSTRAINT "insured_person_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insured_person" ADD CONSTRAINT "insured_person_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurer" ADD CONSTRAINT "insurer_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_document" ADD CONSTRAINT "policy_document_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_document" ADD CONSTRAINT "policy_document_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_term" ADD CONSTRAINT "policy_term_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_term" ADD CONSTRAINT "policy_term_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_term" ADD CONSTRAINT "policy_term_source_document_id_policy_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."policy_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_deadline_id_contract_deadline_id_fk" FOREIGN KEY ("deadline_id") REFERENCES "public"."contract_deadline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_policy_id_insurance_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_document_id_policy_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."policy_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_deadline_id_contract_deadline_id_fk" FOREIGN KEY ("deadline_id") REFERENCES "public"."contract_deadline"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_analysis_subject_idx" ON "ai_analysis" USING btree ("household_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "audit_household_idx" ON "audit_event" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_conversation_household_idx" ON "chat_conversation" USING btree ("household_id","updated_at");--> statement-breakpoint
CREATE INDEX "chat_message_conversation_idx" ON "chat_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "claim_household_idx" ON "claim" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "claim_event_claim_idx" ON "claim_event" USING btree ("claim_id","created_at");--> statement-breakpoint
CREATE INDEX "claim_evidence_claim_idx" ON "claim_evidence" USING btree ("claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_evidence_origin_uq" ON "claim_evidence" USING btree ("claim_id","origin_key");--> statement-breakpoint
CREATE INDEX "communication_claim_idx" ON "communication" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "deadline_household_due_idx" ON "contract_deadline" USING btree ("household_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "deadline_origin_uq" ON "contract_deadline" USING btree ("household_id","origin_key");--> statement-breakpoint
CREATE INDEX "chunk_household_idx" ON "document_chunk" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "chunk_document_idx" ON "document_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunk_tsv_idx" ON "document_chunk" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "chunk_trgm_idx" ON "document_chunk" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "chunk_embedding_idx" ON "document_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "document_page_uq" ON "document_page" USING btree ("version_id","page_no");--> statement-breakpoint
CREATE UNIQUE INDEX "document_version_no_uq" ON "document_version" USING btree ("document_id","version_no");--> statement-breakpoint
CREATE INDEX "document_version_household_sha_idx" ON "document_version" USING btree ("household_id","sha256");--> statement-breakpoint
CREATE INDEX "document_version_status_idx" ON "document_version" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fact_document_idx" ON "extracted_fact" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "fact_household_field_idx" ON "extracted_fact" USING btree ("household_id","field");--> statement-breakpoint
CREATE INDEX "generated_document_claim_idx" ON "generated_document" USING btree ("claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "household_member_user_uq" ON "household_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "policy_household_idx" ON "insurance_policy" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "policy_number_idx" ON "insurance_policy" USING btree ("household_id","policy_number");--> statement-breakpoint
CREATE INDEX "insured_object_policy_idx" ON "insured_object" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "insured_person_policy_idx" ON "insured_person" USING btree ("policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "insurer_household_name_uq" ON "insurer" USING btree ("household_id","name");--> statement-breakpoint
CREATE INDEX "notification_household_idx" ON "notification" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "document_household_idx" ON "policy_document" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "document_policy_idx" ON "policy_document" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "document_claim_idx" ON "policy_document" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "policy_term_policy_idx" ON "policy_term" USING btree ("policy_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_uq" ON "reminder" USING btree ("deadline_id","offset_days");--> statement-breakpoint
CREATE INDEX "reminder_due_idx" ON "reminder" USING btree ("remind_on");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_household_idx" ON "task" USING btree ("household_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "task_origin_uq" ON "task" USING btree ("household_id","origin_key");--> statement-breakpoint
CREATE INDEX "two_factor_user_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factor_secret_idx" ON "two_factor" USING btree ("secret");