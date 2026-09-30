export type SolutionItem = {
  id: string;
  title: string;
  description: string;
  contents: string[];
  icon:
    | "sparkles"
    | "warehouse"
    | "shopping-bag"
    | "truck"
    | "wallet"
    | "graduation-cap";
  ctaLabel: string;
  href: string;
};

/**
 * Solution pathways based on verified Nigd Stock capabilities.
 * Framed as practical business solutions (not invented course catalogs).
 */
export const solutions: SolutionItem[] = [
  {
    id: "ai-inventory",
    title: "AI Inventory Insights",
    description:
      "Use AI-assisted summaries and stock-risk views to understand inventory faster and act with more confidence.",
    contents: [
      "Daily and monthly AI summaries",
      "Stock-risk and insight views",
      "Ask inventory questions in natural language",
    ],
    icon: "sparkles",
    ctaLabel: "Learn More",
    href: "/features/",
  },
  {
    id: "multi-shop",
    title: "Multi-Shop Stock Control",
    description:
      "Keep warehouse and branch stock positions visible in one system as your business grows across locations.",
    contents: [
      "Multiple warehouses and branches",
      "Stock transfers between locations",
      "Clear on-hand quantities by store",
    ],
    icon: "warehouse",
    ctaLabel: "View Solution",
    href: "/features/",
  },
  {
    id: "sales-ops",
    title: "Sales & Stock Alignment",
    description:
      "Record sales connected to inventory so quantities stay aligned with what your team sells every day.",
    contents: [
      "Sales workflows linked to stock",
      "Customer and order visibility",
      "Payment methods for sales activity",
    ],
    icon: "shopping-bag",
    ctaLabel: "Learn More",
    href: "/features/",
  },
  {
    id: "purchasing",
    title: "Purchase & Receiving",
    description:
      "Organize inbound inventory with purchase orders and stock receipts as goods arrive into your operation.",
    contents: [
      "Purchase order workflows",
      "Stock receipts on arrival",
      "Supplier-linked purchasing records",
    ],
    icon: "truck",
    ctaLabel: "View Solution",
    href: "/features/",
  },
  {
    id: "payments",
    title: "Payments & Business Tracking",
    description:
      "Keep payment methods and related business activity organized alongside inventory and sales workflows.",
    contents: [
      "Configurable payment methods",
      "Sales and purchase payment records",
      "Clearer day-to-day money tracking",
    ],
    icon: "wallet",
    ctaLabel: "Learn More",
    href: "/contact/",
  },
  {
    id: "getting-started",
    title: "Getting Started Workflow",
    description:
      "A practical path from organizing products to reviewing inventory information and making better decisions.",
    contents: [
      "Organize product and stock records",
      "Run inventory workflows in Nigd Stock",
      "Review reports and AI-assisted insights",
    ],
    icon: "graduation-cap",
    ctaLabel: "Watch Tutorial",
    href: "/#how-it-works",
  },
];
