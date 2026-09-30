function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function normalizeSiteUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function toYoutubeEmbedUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : raw;
    }
    if (url.hostname.includes("youtube.com")) {
      const id =
        url.searchParams.get("v") ||
        url.pathname.split("/embed/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : raw;
    }
  } catch {
    /* keep fallback */
  }
  return raw;
}

export const SITE_URL = normalizeSiteUrl(
  env("NEXT_PUBLIC_SITE_URL", "https://nigdstock.com"),
);
export const WEB_APP_URL = env(
  "NEXT_PUBLIC_WEB_APP_URL",
  "https://system.nigdstock.com",
);
export const PLAY_STORE_URL = env(
  "NEXT_PUBLIC_PLAY_STORE_URL",
  "https://play.google.com/store/apps",
);
export const APP_STORE_URL = env(
  "NEXT_PUBLIC_APP_STORE_URL",
  "https://apps.apple.com/",
);

/** True only when env points at a real app listing, not a generic store front. */
export const HAS_PLAY_STORE_LISTING = /play\.google\.com\/store\/apps\/details/i.test(
  PLAY_STORE_URL,
);
export const HAS_APP_STORE_LISTING =
  /apps\.apple\.com\/.+\/app\//i.test(APP_STORE_URL) ||
  /apps\.apple\.com\/app\//i.test(APP_STORE_URL);

export const SUPPORTED_PLATFORMS = ["Web", "Android", "iOS"] as const;

export const TUTORIAL_YOUTUBE_URL = env(
  "NEXT_PUBLIC_TUTORIAL_YOUTUBE_URL",
  "https://www.youtube.com/watch?v=83gqImG-sS0",
);
export const TUTORIAL_EMBED_URL = toYoutubeEmbedUrl(TUTORIAL_YOUTUBE_URL);

export const WORKFLOW_YOUTUBE_URL = env(
  "NEXT_PUBLIC_WORKFLOW_YOUTUBE_URL",
  TUTORIAL_YOUTUBE_URL,
);
export const WORKFLOW_EMBED_URL = toYoutubeEmbedUrl(WORKFLOW_YOUTUBE_URL);

export const GOOGLE_SITE_VERIFICATION = env(
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
  "",
);
export const BING_SITE_VERIFICATION = env(
  "NEXT_PUBLIC_BING_SITE_VERIFICATION",
  "",
);

export const LOGO_URL = `${SITE_URL}/images/logo.png`;
export const OG_IMAGE_URL = `${SITE_URL}/images/og-image.png`;

export const COMPANY = {
  legalName: "Abyssinia Software Technology PLC",
  productName: "Nigd Stock",
  email: env(
    "NEXT_PUBLIC_EMAIL",
    "abyssiniasoftwaretechnologyplc@gmail.com",
  ),
  phoneDisplay: env("NEXT_PUBLIC_PHONE_DISPLAY", "+251 951 050 364"),
  phoneTel: env("NEXT_PUBLIC_PHONE_TEL", "+251951050364"),
  phoneLocal: env("NEXT_PUBLIC_PHONE_LOCAL", "0951050364"),
  addressLine: "Megenagna City Mall, 8th Floor",
  city: "Addis Ababa",
  country: "Ethiopia",
  get fullAddress() {
    return `${this.addressLine}, ${this.city}, ${this.country}`;
  },
} as const;

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return `${SITE_URL}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features/", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/blog/", label: "Guides" },
  { href: "/contact/", label: "Contact" },
] as const;

export const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features/", label: "Features" },
  { href: "/about/", label: "About" },
  { href: "/blog/", label: "Guides" },
  { href: "/contact/", label: "Contact" },
  { href: "/privacy-policy/", label: "Privacy Policy" },
  { href: "/am/", label: "አማርኛ" },
] as const;

export const PROMO_HIGHLIGHTS = [
  {
    id: "ai",
    title: "AI-Powered Inventory",
    description:
      "Ask questions and review AI-assisted summaries for stock risk, insights, and faster inventory decisions.",
    accent: "from-emerald-500 to-green-700",
  },
  {
    id: "payments",
    title: "Payment Methods & Tracking",
    description:
      "Record sales and purchases with payment methods your business uses, and keep payment activity organized.",
    accent: "from-teal-500 to-emerald-700",
  },
  {
    id: "shops",
    title: "Manage Multiple Shops",
    description:
      "Run inventory across warehouses and branch locations from one system so each shop stays visible.",
    accent: "from-green-500 to-teal-700",
  },
  {
    id: "sales",
    title: "Sales Management",
    description:
      "Capture sales connected to stock so quantities stay aligned with what your team sells every day.",
    accent: "from-lime-500 to-green-700",
  },
  {
    id: "purchase",
    title: "Purchase Management",
    description:
      "Handle purchase orders and stock receipts so inbound goods are recorded as they arrive.",
    accent: "from-emerald-400 to-green-800",
  },
  {
    id: "all-in-one",
    title: "Everything in One Place",
    description:
      "Inventory, sales, purchasing, warehouses, reporting, and AI insights — one connected workspace.",
    accent: "from-green-600 to-emerald-900",
  },
] as const;
