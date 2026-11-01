import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Word Tiles — Jeu de mots",
  description:
    "Trouve les mots cachés en sélectionnant les tuiles de lettres. Un jeu de puzzle de mots relaxant en français.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Word Tiles",
  },
  applicationName: "Word Tiles",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-background font-sans">
        <ConfirmProvider>{children}</ConfirmProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
