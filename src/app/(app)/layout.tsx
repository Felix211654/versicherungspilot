import { and, eq, isNull, sql } from "drizzle-orm";
import { requireViewer } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.notification)
    .where(and(eq(schema.notification.householdId, viewer.householdId), isNull(schema.notification.readAt)));
  return (
    <AppShell userName={viewer.name || viewer.email} unread={n}>
      {children}
    </AppShell>
  );
}
