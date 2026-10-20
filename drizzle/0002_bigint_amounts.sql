ALTER TABLE "claim" ALTER COLUMN "estimated_damage_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "insured_object" ALTER COLUMN "value_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "policy_term" ALTER COLUMN "amount_cents" SET DATA TYPE bigint;