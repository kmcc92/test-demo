import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/ui/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import Web3Provider from "@/components/providers/Web3Provider";
import AuthProvider from "@/components/providers/AuthProvider";
import OwnershipProvider from "@/components/providers/OwnershipProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TEST — Authenticated Fashion",
  description: "Every piece authenticated. Every certificate permanent. Every owner verified.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = (await headers()).get("cookie");

  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Web3Provider cookie={cookie}>
          <ToastProvider>
            <AuthProvider>
              <OwnershipProvider>
                <Navbar />
                <PageTransition>
                  <main className="flex-1 flex flex-col pt-16">{children}</main>
                </PageTransition>
                <Footer />
              </OwnershipProvider>
            </AuthProvider>
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
