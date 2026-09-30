import type { Metadata } from "next";
import {
  SITE_URL,
  COMPANY,
  OG_IMAGE_URL,
  absoluteUrl,
  GOOGLE_SITE_VERIFICATION,
  BING_SITE_VERIFICATION,
} from "./site";

export const defaultOgImage = {
  url: OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: `${COMPANY.productName} — AI-Powered Best Inventory Management System in Ethiopia`,
};

type PageMetaInput = {
  title: string;
  description: string;
  path?: string;
  locale?: "en_US" | "am_ET";
  languageAlternates?: Record<string, string>;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export function buildPageMetadata({
  title,
  description,
  path = "/",
  locale = "en_US",
  languageAlternates,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);

  return {
    // absolute avoids root layout template doubling ("… | Nigd Stock | Nigd Stock")
    title: { absolute: title },
    description,
    metadataBase: new URL(SITE_URL),
    applicationName: COMPANY.productName,
    authors: [{ name: COMPANY.legalName, url: absoluteUrl("/about/") }],
    creator: COMPANY.legalName,
    publisher: COMPANY.legalName,
    category: "Business Software",
    keywords: [
      "inventory management software Ethiopia",
      "stock control software Addis Ababa",
      "Nigd Stock",
      "AI inventory management",
      "warehouse stock tracking Ethiopia",
      "inventory software for shops",
    ],
    alternates: {
      canonical: url,
      languages: languageAlternates,
    },
    robots: noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: COMPANY.productName,
      locale,
      images: [defaultOgImage],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOgImage.url],
    },
    formatDetection: {
      telephone: true,
      email: true,
      address: true,
    },
  };
}

export const rootVerification: Metadata["verification"] = {
  ...(GOOGLE_SITE_VERIFICATION
    ? { google: GOOGLE_SITE_VERIFICATION }
    : {}),
  ...(BING_SITE_VERIFICATION
    ? { other: { "msvalidate.01": BING_SITE_VERIFICATION } }
    : {}),
};

export const homeMetadata = buildPageMetadata({
  title: "Nigd Stock | AI-Powered Best Inventory Management System in Ethiopia",
  description:
    "Nigd Stock is AI-powered inventory management and stock control software from Abyssinia Software Technology PLC. Built for Ethiopian businesses that need clearer stock visibility, inventory tracking, and practical inventory workflows.",
  path: "/",
  languageAlternates: {
    en: absoluteUrl("/"),
    am: absoluteUrl("/am/"),
    "x-default": absoluteUrl("/"),
  },
});

export const aboutMetadata = buildPageMetadata({
  title: "About Nigd Stock | Abyssinia Software Technology PLC",
  description:
    "Learn about Nigd Stock and Abyssinia Software Technology PLC — developers of inventory management software serving businesses in Ethiopia from Addis Ababa.",
  path: "/about/",
});

export const featuresMetadata = buildPageMetadata({
  title: "Nigd Stock Features | Inventory & Stock Management Tools",
  description:
    "Explore Nigd Stock capabilities: product records, inventory tracking, warehouses, purchasing and sales workflows, reporting, and AI-assisted inventory insights.",
  path: "/features/",
});

export const contactMetadata = buildPageMetadata({
  title: "Contact Nigd Stock | Request a Demo in Ethiopia",
  description:
    "Contact Abyssinia Software Technology PLC in Addis Ababa to request a Nigd Stock demonstration. Call +251 951 050 364 or email abyssiniasoftwaretechnologyplc@gmail.com.",
  path: "/contact/",
});

export const privacyMetadata = buildPageMetadata({
  title: "Privacy Policy | Nigd Stock",
  description:
    "Privacy policy for the Nigd Stock marketing website operated by Abyssinia Software Technology PLC.",
  path: "/privacy-policy/",
});

export const amHomeMetadata = buildPageMetadata({
  title: "ኒግድ ስቶክ | የእቃ አስተዳደር ሲስተም በኢትዮጵያ",
  description:
    "ኒግድ ስቶክ በአቢሲኒያ ሶፍትዌር ቴክኖሎጂ ፒኤልሲ የተሰራ የእቃ አስተዳደር እና የስቶክ መቆጣጠሪያ ሶፍትዌር ነው። ለኢትዮጵያ ንግዶች የተሻለ የእቃ እይታ እና የእቃ አስተዳደር ሂደት ለማግኘት ይረዳል።",
  path: "/am/",
  locale: "am_ET",
  languageAlternates: {
    en: absoluteUrl("/"),
    am: absoluteUrl("/am/"),
    "x-default": absoluteUrl("/"),
  },
});
