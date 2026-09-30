import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data";
import { featuresMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  organizationSchema,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/schema";
import FeaturesPageClient from "./features-page-client";

export const metadata: Metadata = featuresMetadata;

export default function FeaturesPage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          softwareApplicationSchema(),
          webPageSchema({
            name: "Nigd Stock Features | Inventory & Stock Management Tools",
            description:
              "Explore Nigd Stock capabilities: product records, inventory tracking, warehouses, purchasing and sales workflows, reporting, and AI-assisted inventory insights.",
            path: "/features/",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features/" },
          ]),
        ]}
      />
      <FeaturesPageClient />
    </>
  );
}
