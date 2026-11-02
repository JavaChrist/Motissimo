import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { UpdateManager } from "@/components/UpdateManager";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Motissimo",
  description:
    "Trouve les mots cachés en sélectionnant les tuiles de lettres. Un jeu de puzzle de mots relaxant en français.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Motissimo",
  },
  applicationName: "Motissimo",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0e7490",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-app flex flex-col bg-background font-sans">
        <ConfirmProvider>
          {children}
          <UpdateManager pageVersion={process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"} />
        </ConfirmProvider>
      </body>
    </html>
  );
}
