import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, themeNoFlashScript } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Le Bissap Artisanal",
    default: "Le Bissap Artisanal",
  },
  description:
    "Application de gestion intégrée pour Le Bissap Artisanal (Bissapa, La Réunion) : production, stock, livraisons, facturation B2B et finance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Applique le theme avant la 1ere peinture pour eviter le flash.
            next/script + beforeInteractive : injecte avant l'hydratation
            sans declencher l'avertissement React 19 sur les <script> inline. */}
        <Script id="theme-no-flash" strategy="beforeInteractive">
          {themeNoFlashScript}
        </Script>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
