import {
  COMPANY,
  SITE_URL,
  LOGO_URL,
  OG_IMAGE_URL,
  WEB_APP_URL,
  absoluteUrl,
  SUPPORTED_PLATFORMS,
  PLAY_STORE_URL,
  APP_STORE_URL,
} from "./site";
import type { FaqItem } from "@/content/faqs";
import type { Article } from "@/content/articles";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: COMPANY.legalName,
    legalName: COMPANY.legalName,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
    },
    image: LOGO_URL,
    email: COMPANY.email,
    telephone: COMPANY.phoneTel,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.addressLine,
      addressLocality: COMPANY.city,
      addressCountry: "ET",
    },
    areaServed: {
      "@type": "Country",
      name: "Ethiopia",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: COMPANY.phoneTel,
      email: COMPANY.email,
      contactType: "sales",
      areaServed: "ET",
      availableLanguage: ["English", "Amharic"],
    },
  };
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#localbusiness`,
    name: COMPANY.legalName,
    url: absoluteUrl("/"),
    image: LOGO_URL,
    email: COMPANY.email,
    telephone: COMPANY.phoneTel,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.addressLine,
      addressLocality: COMPANY.city,
      addressCountry: "ET",
    },
    areaServed: {
      "@type": "Country",
      name: "Ethiopia",
    },
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: COMPANY.productName,
    alternateName: "ኒግድ ስቶክ",
    url: absoluteUrl("/"),
    inLanguage: ["en", "am"],
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    about: {
      "@id": `${SITE_URL}/#software`,
    },
  };
}

export function softwareApplicationSchema() {
  const downloadUrls = [WEB_APP_URL, PLAY_STORE_URL, APP_STORE_URL];

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: COMPANY.productName,
    alternateName: "ኒግድ ስቶክ",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Inventory Management Software",
    operatingSystem: SUPPORTED_PLATFORMS.join(", "),
    description:
      "AI-powered inventory management and stock control software for businesses in Ethiopia, developed by Abyssinia Software Technology PLC.",
    url: absoluteUrl("/"),
    image: OG_IMAGE_URL,
    featureList: [
      "Product and stock records",
      "Inventory tracking",
      "Multi-warehouse stock",
      "Purchase and sales workflows",
      "Reporting and inventory insights",
      "AI-assisted inventory summaries",
    ],
    // No price Offer until public pricing is published — avoid fake InStock/ETB signals.
    provider: {
      "@id": `${SITE_URL}/#organization`,
    },
    author: {
      "@id": `${SITE_URL}/#organization`,
    },
    countriesSupported: "ET",
    downloadUrl: downloadUrls,
    installUrl: WEB_APP_URL,
  };
}

export function faqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function contactPageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${COMPANY.productName}`,
    url: absoluteUrl("/contact/"),
    mainEntity: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageSchema({
  name,
  description,
  path,
  inLanguage = "en",
}: {
  name: string;
  description: string;
  path: string;
  inLanguage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage,
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    about: {
      "@id": `${SITE_URL}/#software`,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function collectionPageSchema({
  name,
  description,
  path,
  articles,
}: {
  name: string;
  description: string;
  path: string;
  articles: Article[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: "en",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/blog/${article.slug}/`),
        name: article.title,
      })),
    },
  };
}

export function articleSchema({
  title,
  description,
  slug,
  publishedAt,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: publishedAt,
    image: OG_IMAGE_URL,
    author: {
      "@id": `${SITE_URL}/#organization`,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${slug}/`),
    },
    inLanguage: "en",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
  };
}
