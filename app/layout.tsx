import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Saira, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import PwaInit from "./pwa-init";

// Chakra Petch's squared-off forms read like gauge markings; Saira stays
// readable for the long analysis text; Share Tech Mono is the LCD readout.
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
});

const shareTech = Share_Tech_Mono({
  variable: "--font-sharetech",
  subsets: ["latin"],
  weight: "400",
});

// Shared /c/<id> links need absolute URLs for their OG images. Preview
// deployments get VERCEL_URL; production falls back to the real domain.
const siteUrl = process.env.VERCEL_ENV === "production"
  ? "https://www.motormind.nz"
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Motormind — NZ Car Buying Copilot",
  description: "AI-powered enthusiast analysis for NZ car listings. Paste the listing text or upload screenshots.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b151b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${chakra.variable} ${saira.variable} ${shareTech.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaInit />
        {children}
      </body>
    </html>
  );
}
