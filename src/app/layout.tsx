import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VersicherungsPilot", template: "%s · VersicherungsPilot" },
  description: "Dein persönlicher, datenschutzbewusster Versicherungsmanager.",
  manifest: "/manifest.webmanifest",
  applicationName: "VersicherungsPilot",
  robots: { index: false, follow: false },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1216" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
          Zum Inhalt springen
        </a>
        {children}
        <script
          // Service Worker für PWA-Installierbarkeit (cacht keine personenbezogenen Daten)
          dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}` }}
        />
      </body>
    </html>
  );
}
