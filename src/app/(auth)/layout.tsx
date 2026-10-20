import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getViewer()) redirect("/");
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden /> VersicherungsPilot
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted">
          Deine Unterlagen werden verschlüsselt gespeichert. Keine Rechts- oder Versicherungsberatung.{" "}
          <a className="underline" href="/datenschutz">Datenschutz</a>
        </p>
      </div>
    </main>
  );
}
