import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db, schema } from "../db";

export type Viewer = {
  userId: string;
  householdId: string;
  email: string;
  name: string;
  twoFactorEnabled: boolean;
};

/** Liefert den angemeldeten Nutzer inkl. Haushalt oder null. Pro Request gecacht. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const [m] = await db
    .select({ householdId: schema.householdMember.householdId })
    .from(schema.householdMember)
    .where(eq(schema.householdMember.userId, s.user.id))
    .limit(1);
  if (!m) return null;
  return {
    userId: s.user.id,
    householdId: m.householdId,
    email: s.user.email,
    name: s.user.name,
    twoFactorEnabled: Boolean((s.user as { twoFactorEnabled?: boolean }).twoFactorEnabled),
  };
});

/** Für Seiten/Server Actions: leitet zur Anmeldung um, wenn keine Sitzung besteht. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/anmelden");
  return v;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Nicht angemeldet");
  }
}

/** Für Route Handler: wirft statt umzuleiten. */
export async function requireViewerApi(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new UnauthorizedError();
  return v;
}
