import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <head>
        <script
          // Applique le theme avant la 1ere peinture React pour eviter le flash.
          // Server Component : le script s'execute, React ne le re-render pas.
          dangerouslySetInnerHTML={{ __html: themeNoFlashScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
