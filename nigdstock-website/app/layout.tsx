import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { SiteChrome } from "@/components/site-chrome";
import { rootVerification } from "@/lib/metadata";
import { SITE_URL, COMPANY } from "@/lib/site";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const heading = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nigd Stock | AI-Powered Best Inventory Management System in Ethiopia",
  description:
    "Nigd Stock is AI-powered inventory management and stock control software from Abyssinia Software Technology PLC for Ethiopian businesses.",
  applicationName: COMPANY.productName,
  verification: rootVerification,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/images/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/images/logo.png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: COMPANY.productName,
    locale: "en_US",
  },
  other: {
    "geo.region": "ET-AA",
    "geo.placename": "Addis Ababa",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${heading.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
