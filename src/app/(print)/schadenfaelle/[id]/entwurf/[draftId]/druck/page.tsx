import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { getDraft } from "@/server/services/claims";
import { PrintButton } from "./print-button";

export default async function PrintDraft({ params }: { params: Promise<{ id: string; draftId: string }> }) {
  const viewer = await requireViewer();
  const { id, draftId } = await params;
  const d = await getDraft(viewer.householdId, draftId);
  if (!d || d.claimId !== id) notFound();
  return (
    <>
      <PrintButton />
      <pre className="whitespace-pre-wrap font-sans text-[11pt] leading-relaxed">{d.content}</pre>
    </>
  );
}
