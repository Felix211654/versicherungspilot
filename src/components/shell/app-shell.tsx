"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AlertCircle, BarChart3, Bell, CalendarClock, FolderOpen, Home, LogOut, Menu, MessageSquareText, Settings, ShieldCheck, X } from "lucide-react";
import { NAV } from "./nav";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const ICONS = { home: Home, shield: ShieldCheck, folder: FolderOpen, chat: MessageSquareText, alert: AlertCircle, calendar: CalendarClock, chart: BarChart3, settings: Settings };

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className="space-y-0.5">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        const Icon = ICONS[n.icon];
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", active ? "bg-primary-soft font-medium text-primary" : "text-text/80 hover:bg-surface-muted")}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SignOut() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- bewusst volle Navigation nach Wechsel des Anmeldestatus (kein Client-Zustand der alten Sitzung)
        window.location.href = "/anmelden";
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text/80 hover:bg-surface-muted disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" aria-hidden /> {busy ? "Abmelden …" : "Abmelden"}
    </button>
  );
}

export function AppShell({ children, userName, unread }: { children: ReactNode; userName: string; unread: number }) {
  const [open, setOpen] = useState(false);
  const brand = (
    <Link href="/" className="flex items-center gap-2 px-3 font-semibold">
      <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> VersicherungsPilot
    </Link>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-4 border-r border-border bg-surface px-3 py-5 lg:flex" aria-label="Hauptnavigation">
        {brand}
        <nav className="flex-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="border-t border-border pt-3">
          <p className="truncate px-3 pb-2 text-xs text-muted">Angemeldet als {userName}</p>
          <SignOut />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        {brand}
        <div className="flex items-center gap-1">
          <Link href="/#hinweise" className="relative rounded-lg p-2 hover:bg-surface-muted" aria-label={`Benachrichtigungen (${unread} ungelesen)`}>
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-surface-muted" aria-label="Menü öffnen" aria-expanded={open}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute right-0 top-0 flex h-full w-72 flex-col gap-4 bg-surface p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Menü</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-surface-muted" aria-label="Menü schließen">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-border pt-3">
              <SignOut />
            </div>
          </nav>
        </div>
      )}
      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
