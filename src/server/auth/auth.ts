import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { db, schema } from "../db";
import { env } from "../env";
import { provisionHousehold } from "../services/households";
import { audit } from "../services/audit";

const e = env();

export const auth = betterAuth({
  appName: "VersicherungsPilot",
  baseURL: e.BETTER_AUTH_URL,
  secret: e.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 Tage
    updateAge: 60 * 60 * 24, // täglich verlängern
    freshAge: 60 * 15, // sensible Aktionen erfordern frische Anmeldung
  },
  rateLimit: {
    // In Produktion immer aktiv; lokal/E2E optional (AUTH_RATE_LIMIT=on), da Tests viele Konten anlegen.
    enabled: e.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "on",
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
      "/two-factor/*": { window: 60, max: 5 },
    },
  },
  advanced: {
    // Secure-Cookies in Produktion; Ausnahme: lokaler Betrieb über http://localhost (Windows-Paket)
    useSecureCookies: e.NODE_ENV === "production" && e.BETTER_AUTH_URL.startsWith("https://"),
    cookiePrefix: "vp",
  },
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          await provisionHousehold(u.id, u.name);
          await audit({ userId: u.id, action: "user.registered" });
        },
      },
    },
  },
  plugins: [twoFactor({ issuer: "VersicherungsPilot" }), nextCookies()],
});
