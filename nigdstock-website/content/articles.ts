export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  body: string[];
};

export const articles: Article[] = [
  {
    slug: "what-is-inventory-management-software",
    title: "What Is Inventory Management Software?",
    description:
      "A plain-language explanation of inventory management software, stock control, and how Ethiopian businesses can evaluate tools like Nigd Stock.",
    publishedAt: "2026-09-26",
    body: [
      "Inventory management software is a system for recording products, monitoring quantities, and tracking how stock moves through a business. It helps replace disconnected notebooks and spreadsheets with a shared, searchable record.",
      "Stock control is closely related: it focuses on keeping on-hand levels accurate enough to support purchasing and sales decisions. Inventory tracking is the day-to-day visibility into what is available and what has changed.",
      "When Ethiopian business owners evaluate software, useful questions include: Can we maintain product records clearly? Can we see stock by location? Can we review movements and reports? Does the vendor confirm the workflows we need before we buy?",
      "Nigd Stock is inventory and stock-oriented software from Abyssinia Software Technology PLC. Request a demonstration to compare your workflows with the capabilities available today.",
    ],
  },
  {
    slug: "inventory-management-vs-erp",
    title: "Inventory Management vs ERP: Which Do You Need?",
    description:
      "Learn the difference between inventory management software and ERP systems so you can choose a category that matches your business needs in Ethiopia.",
    publishedAt: "2026-09-26",
    body: [
      "Inventory management software concentrates on products, quantities, warehouses or stores, and related purchasing or sales stock updates. Many growing shops and wholesale operations start here because stock visibility is the urgent problem.",
      "ERP systems typically cover a wider set of company processes—finance, human resources, manufacturing planning, and more—often in one large platform. That breadth can be valuable later, but it is not automatically required on day one.",
      "Point-of-sale (POS) tools focus on checkout. A business may need inventory software, POS, ERP, or a combination. Confirm each requirement with the vendor rather than assuming every label means the same set of features.",
      "If your priority is clearer stock records and inventory workflows, begin with an inventory management conversation. Contact Abyssinia Software Technology PLC to see how Nigd Stock maps to your needs.",
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
