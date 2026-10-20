"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import { askAction } from "@/server/actions/chat";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} className="self-end">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Unterlagen werden durchsucht …
        </>
      ) : (
        <>
          <Send className="h-4 w-4" aria-hidden /> Fragen
        </>
      )}
    </Button>
  );
}

export function AskForm({ conversationId, initialQuestion, autoSubmit }: { conversationId?: string; initialQuestion?: string; autoSubmit?: boolean }) {
  const [state, action] = useActionState(askAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (autoSubmit && initialQuestion && !done.current) {
      done.current = true;
      ref.current?.requestSubmit();
    }
  }, [autoSubmit, initialQuestion]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      {conversationId && <input type="hidden" name="conversationId" value={conversationId} />}
      <label htmlFor="question" className="sr-only">
        Deine Frage
      </label>
      <Textarea
        id="question"
        name="question"
        required
        minLength={3}
        maxLength={2000}
        defaultValue={initialQuestion}
        placeholder="Beschreibe deine Frage oder deinen Fall …"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ref.current?.requestSubmit();
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Strg/⌘ + Enter zum Senden. Keine Rechtsberatung; Aussagen über Verträge werden mit Fundstellen belegt.</p>
        <Submit />
      </div>
      <FormMessage state={state} />
    </form>
  );
}
