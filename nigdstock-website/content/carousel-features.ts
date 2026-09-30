export type CarouselFeature = {
  id: string;
  title: string;
  description: string;
  icon: "bot" | "card" | "layers" | "sales" | "purchase" | "branch";
};

export const carouselFeatures: CarouselFeature[] = [
  {
    id: "ai",
    title: "AI-Powered Inventory",
    description:
      "Ask questions and review AI-assisted summaries for stock risk, insights, and faster inventory decisions.",
    icon: "bot",
  },
  {
    id: "payments",
    title: "Payment Methods & Tracking",
    description:
      "Record sales and purchases with payment methods your business uses, and keep payment activity organized.",
    icon: "card",
  },
  {
    id: "all-in-one",
    title: "Everything in One Place",
    description:
      "Inventory, sales, purchasing, warehouses, reporting, and AI insights — one connected workspace.",
    icon: "layers",
  },
  {
    id: "sales",
    title: "Sales Management",
    description:
      "Capture sales connected to stock so quantities stay aligned with what your team sells every day.",
    icon: "sales",
  },
  {
    id: "purchasing",
    title: "Purchase Management",
    description:
      "Handle purchase orders and stock receipts so inbound goods are recorded as they arrive.",
    icon: "purchase",
  },
  {
    id: "branches",
    title: "Multi-Branch Control",
    description:
      "Run inventory across warehouses and branch locations from one system so each shop stays visible.",
    icon: "branch",
  },
];
