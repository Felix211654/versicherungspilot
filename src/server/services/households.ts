import "server-only";
import { db, schema } from "../db";

/** Legt beim Registrieren den privaten Haushalt (Mandant) und Einstellungen an. */
export async function provisionHousehold(userId: string, name: string) {
  await db.transaction(async (tx) => {
    const [h] = await tx
      .insert(schema.household)
      .values({ name: name ? `Haushalt ${name}` : "Mein Haushalt" })
      .returning({ id: schema.household.id });
    await tx.insert(schema.householdMember).values({ householdId: h.id, userId, role: "owner" });
    await tx.insert(schema.userSettings).values({ userId }).onConflictDoNothing();
  });
}
