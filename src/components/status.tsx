import { Badge } from "@/components/ui/badge";
import { CERTAINTY_LABEL, CLAIM_STATUS_LABEL, CONFIDENCE_LABEL, PROCESSING_LABEL, REVIEW_LABEL, ASSESSMENT_LABEL } from "@/lib/labels";

export function ProcessingBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "success" : status === "failed" ? "danger" : status === "needs_review" ? "warning" : "info";
  return <Badge tone={tone}>{PROCESSING_LABEL[status] ?? status}</Badge>;
}

export function ReviewBadge({ review }: { review: string }) {
  const tone = review === "confirmed" || review === "corrected" ? "success" : review === "unclear" ? "warning" : review === "rejected" ? "danger" : "neutral";
  return <Badge tone={tone}>{REVIEW_LABEL[review] ?? review}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const tone = confidence === "high" ? "success" : confidence === "medium" ? "info" : "warning";
  return <Badge tone={tone}>{CONFIDENCE_LABEL[confidence] ?? confidence}</Badge>;
}

export function CertaintyBadge({ certainty }: { certainty: string }) {
  const tone = certainty === "confirmed" ? "success" : certainty === "derived" ? "info" : "warning";
  return <Badge tone={tone}>{CERTAINTY_LABEL[certainty] ?? certainty}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "urgent") return <Badge tone="danger">dringend</Badge>;
  if (priority === "soon") return <Badge tone="warning">bald relevant</Badge>;
  return <Badge tone="neutral">zur Info</Badge>;
}

export function ClaimStatusBadge({ status }: { status: string }) {
  const tone = ["approved", "closed"].includes(status) ? "success" : status === "rejected" ? "danger" : ["info_missing", "facts_incomplete", "evidence_requested"].includes(status) ? "warning" : "info";
  return <Badge tone={tone}>{CLAIM_STATUS_LABEL[status] ?? status}</Badge>;
}

export function AssessmentBadge({ assessment }: { assessment: string }) {
  const tone = assessment === "possible" ? "success" : assessment === "unlikely" ? "danger" : assessment === "not_relevant" ? "neutral" : "warning";
  return <Badge tone={tone}>{ASSESSMENT_LABEL[assessment] ?? assessment}</Badge>;
}
