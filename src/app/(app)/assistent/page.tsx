import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { MessageSquareText, Plus } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getConversation, listConversations } from "@/server/services/chat";
import { deleteConversationAction } from "@/server/actions/chat";
import { integrationStatus } from "@/server/env";
import { db, schema } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/action-form";
import { AnswerView } from "@/components/answer-view";
import { AskForm } from "./ask-form";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "KI-Assistent" };

const EXAMPLES = [
  "Welche meiner Versicherungen decken Schäden an meinem Laptop ab?",
  "Mein Fahrrad wurde aus dem Keller gestohlen. Welche Versicherung könnte greifen?",
  "Ich habe beim Umzug versehentlich den Fernseher eines Freundes beschädigt. Bin ich versichert?",
  "Welche meiner Verträge haben eine Selbstbeteiligung?",
  "Wo bin ich gegen Elementarschäden abgesichert?",
  "Welche Nachweise muss ich nach einem Wasserschaden sammeln?",
];

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const viewer = await requireViewer();
  const { c, q } = await searchParams;
  const [conversations, conv, [settings]] = await Promise.all([
    listConversations(viewer.householdId),
    c ? getConversation(viewer.householdId, c) : Promise.resolve(null),
    db.select({ consent: schema.userSettings.aiProcessingConsentAt }).from(schema.userSettings).where(eq(schema.userSettings.userId, viewer.userId)),
  ]);
  if (c && !conv) notFound();
  const ai = integrationStatus().ai;

  return (
    <>
      <PageHeader title="KI-Assistent" description="Fragen zu deinen Verträgen und konkreten Schadensfällen – beantwortet aus deinen eigenen Unterlagen, mit überprüfbaren Fundstellen." />
      {!ai.configured ? (
        <Alert tone="warning" className="mb-4" title="KI-Anbieter nicht konfiguriert">
          {ai.detail}. Der Assistent zeigt deshalb nur die relevantesten Fundstellen aus deinen Unterlagen – ohne Bewertung. Einrichtung: siehe README („KI aktivieren“).
        </Alert>
      ) : !settings?.consent ? (
        <Alert tone="info" className="mb-4" title="Einwilligung erforderlich">
          Für KI-Antworten werden relevante Textauszüge an {ai.detail} übermittelt. <Link href="/einstellungen#datenschutz" className="underline">In den Einstellungen freigeben</Link>. Bis dahin siehst du nur Fundstellen.
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2" aria-label="Unterhaltungen">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/assistent">
              <Plus className="h-4 w-4" aria-hidden /> Neue Frage
            </Link>
          </Button>
          <ul className="space-y-1">
            {conversations.map((x) => (
              <li key={x.id}>
                <Link href={`/assistent?c=${x.id}`} className={cn("block truncate rounded-lg px-3 py-2 text-sm hover:bg-surface-muted", x.id === c && "bg-primary-soft text-primary")}>
                  {x.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 space-y-4">
          {conv ? (
            <>
              {conv.messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-contrast">
                    {m.content}
                  </div>
                ) : (
                  <Card key={m.id}>
                    <CardContent>{m.answer ? <AnswerView answer={m.answer} /> : <p className="text-sm">{m.content}</p>}</CardContent>
                  </Card>
                ),
              )}
              <div id="ende" />
              <Card>
                <CardContent>
                  <AskForm conversationId={conv.conversation.id} />
                </CardContent>
              </Card>
              <ActionButton action={deleteConversationAction.bind(null, conv.conversation.id)} variant="ghost" size="sm" confirm="Unterhaltung löschen?">
                Unterhaltung löschen
              </ActionButton>
            </>
          ) : (
            <>
              <Card>
                <CardContent>
                  <AskForm initialQuestion={q} autoSubmit={Boolean(q)} />
                </CardContent>
              </Card>
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MessageSquareText className="h-4 w-4" aria-hidden /> Beispiele
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {EXAMPLES.map((e) => (
                    <li key={e}>
                      <Link href={`/assistent?q=${encodeURIComponent(e)}`} className="block rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-primary/40">
                        {e}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
