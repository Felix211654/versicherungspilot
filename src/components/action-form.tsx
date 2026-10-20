"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/server/actions/util";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Formular mit echtem Aktionsstatus (läuft / Erfolg / Fehler) und Feldfehlern. */
export function ActionForm({ action, children, className, showMessage = true }: { action: Action; children: ReactNode | ((state: ActionState) => ReactNode); className?: string; showMessage?: boolean }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {typeof children === "function" ? children(state) : children}
      {showMessage && (
        <div className="mt-3 empty:hidden">
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}

export function SubmitButton({ children, pendingText, ...props }: { children: ReactNode; pendingText?: string } & VariantProps<typeof buttonVariants> & { className?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText ?? "Wird ausgeführt …" : children}
    </Button>
  );
}

/** Einzelne Aktion als Button (z. B. „erledigt“), mit Status und optionaler Rückfrage. */
export function ActionButton({ action, children, confirm, pendingText, ...props }: { action: () => Promise<ActionState>; children: ReactNode; confirm?: string; pendingText?: string } & VariantProps<typeof buttonVariants> & { className?: string }) {
  const [state, formAction] = useActionState(async () => action(), null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col gap-1"
    >
      <SubmitButton pendingText={pendingText} {...props}>
        {children}
      </SubmitButton>
      {state?.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
      {state?.message && (
        <span role="status" className="text-xs text-success">
          {state.message}
        </span>
      )}
    </form>
  );
}
