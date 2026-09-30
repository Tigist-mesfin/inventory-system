export type FeatureItem = {
  id: string;
  title: string;
  description: string;
  icon:
    | "package"
    | "activity"
    | "warehouse"
    | "shopping-cart"
    | "truck"
    | "chart"
    | "bell"
    | "sparkles"
    | "users"
    | "file-text";
};

/**
 * Features verified from the Nigd Stock product codebase
 * (catalog, inventory, warehouses, purchasing, sales, reports, AI modules).
 */
export const features: FeatureItem[] = [
  {
    id: "products",
    title: "Product and stock records",
    description:
      "Maintain organized product catalogs with clear stock records so teams can find what is on hand without relying on scattered spreadsheets.",
    icon: "package",
  },
  {
    id: "tracking",
    title: "Inventory tracking",
    description:
      "Track product quantities across your operation and keep inventory levels visible as stock moves through day-to-day business activity.",
    icon: "activity",
  },
  {
    id: "movements",
    title: "Stock movement visibility",
    description:
      "Review stock transactions, transfers, and adjustments so you can see how inventory changes over time—not only what the current balance is.",
    icon: "truck",
  },
  {
    id: "warehouses",
    title: "Multiple warehouses",
    description:
      "Manage inventory across more than one warehouse or branch location, helping growing businesses keep separate stock positions in one system.",
    icon: "warehouse",
  },
  {
    id: "purchasing",
    title: "Purchase workflows",
    description:
      "Support purchasing with purchase orders and stock receipts so inbound inventory can be recorded as goods arrive.",
    icon: "shopping-cart",
  },
  {
    id: "sales",
    title: "Sales workflows",
    description:
      "Record sales activity connected to inventory so stock levels stay aligned with what your business sells.",
    icon: "file-text",
  },
  {
    id: "reporting",
    title: "Inventory reporting and insights",
    description:
      "Review inventory and business information through reports and insight views that help owners understand stock and related activity.",
    icon: "chart",
  },
  {
    id: "low-stock",
    title: "Low-stock monitoring",
    description:
      "Identify stock-risk situations earlier with monitoring tools that highlight items needing attention before shelves run empty.",
    icon: "bell",
  },
  {
    id: "ai",
    title: "AI-assisted inventory insights",
    description:
      "Ask questions and review AI-supported summaries and insights that help interpret inventory and related business data more quickly.",
    icon: "sparkles",
  },
  {
    id: "team",
    title: "Team access and roles",
    description:
      "Give staff controlled access with roles and permissions so the right people can work in the system without exposing every setting.",
    icon: "users",
  },
];

export const problemPoints = [
  {
    title: "Inaccurate stock records",
    description:
      "When counts live in notebooks or outdated spreadsheets, teams sell items that are already gone—or reorder products that are still sitting in the store.",
  },
  {
    title: "Difficulty tracking stock movements",
    description:
      "Transfers between branches, returns to shelves, and receiving shipments become hard to reconstruct without a clear movement history.",
  },
  {
    title: "Limited visibility into product quantities",
    description:
      "Owners and managers need a reliable view of what is available now, not estimates pieced together at the end of the week.",
  },
  {
    title: "Manual recordkeeping",
    description:
      "Handwritten ledgers and ad-hoc messages slow teams down and make audits or end-of-month reviews more stressful than they need to be.",
  },
  {
    title: "Difficulty reviewing inventory information",
    description:
      "Without structured reports and searchable records, answering simple questions about stock and sales can take hours instead of minutes.",
  },
];

export const industries = [
  {
    title: "Retail shops",
    description:
      "Keep everyday stock levels visible for shops that need fast answers about what is available to sell.",
  },
  {
    title: "Wholesalers",
    description:
      "Organize larger product catalogs and monitor quantities as goods move in and out of wholesale operations.",
  },
  {
    title: "Distributors",
    description:
      "Support distribution workflows where products move between suppliers, storage points, and customers.",
  },
  {
    title: "Warehouses",
    description:
      "Track warehouse inventory positions and stock movements as items are received, stored, and transferred.",
  },
  {
    title: "Supermarkets",
    description:
      "Help supermarket teams review product quantities and replenishment needs across busy assortments.",
  },
  {
    title: "Pharmacies",
    description:
      "A target use case for businesses that need careful product records and clearer stock monitoring. Confirm specialized pharmacy workflows with our team.",
  },
  {
    title: "Boutiques",
    description:
      "Manage boutique product lists and stock counts with less reliance on paper notes.",
  },
  {
    title: "Building materials suppliers",
    description:
      "Track materials and related stock where quantities and suppliers matter to daily sales.",
  },
  {
    title: "Spare-parts businesses",
    description:
      "Organize parts catalogs and inventory levels so teams can locate and fulfill demand more confidently.",
  },
];
