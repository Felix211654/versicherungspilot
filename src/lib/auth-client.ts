"use client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- bewusst volle Navigation nach Wechsel des Anmeldestatus (kein Client-Zustand der alten Sitzung)
        window.location.href = "/anmelden/zwei-faktor";
      },
    }),
  ],
});
