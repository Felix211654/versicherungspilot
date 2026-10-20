import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistische Umleitung nicht angemeldeter Nutzer (nur Cookie-Prüfung).
 * Die eigentliche Autorisierung erfolgt serverseitig in jeder Seite/API (Data Access Layer).
 */
const PUBLIC = ["/anmelden", "/registrieren", "/datenschutz", "/impressum", "/api/auth", "/manifest.webmanifest", "/sw.js", "/icons", "/offline"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  const hasSession = req.cookies.getAll().some((c) => c.name.endsWith("vp.session_token"));
  if (!hasSession) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/anmelden";
    url.search = pathname !== "/" ? `?weiter=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Upload-Route ausgenommen (eigene Auth-Prüfung), damit große Dateien nicht im Proxy gepuffert werden
  matcher: ["/((?!_next/static|_next/image|api/documents/upload|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
