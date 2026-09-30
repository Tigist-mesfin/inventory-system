import type { Metadata } from "next";
import Link from "next/link";
import { aboutMetadata } from "@/lib/metadata";
import { StructuredData } from "@/components/structured-data";
import {
  breadcrumbSchema,
  organizationSchema,
  webPageSchema,
} from "@/lib/schema";
import { COMPANY } from "@/lib/site";

export const metadata: Metadata = aboutMetadata;

export default function AboutPage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          webPageSchema({
            name: "About Nigd Stock | Abyssinia Software Technology PLC",
            description:
              "Learn about Nigd Stock and Abyssinia Software Technology PLC — developers of inventory management software serving businesses in Ethiopia from Addis Ababa.",
            path: "/about/",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about/" },
          ]),
        ]}
      />
      <section className="section">
        <div className="container-page max-w-3xl">
          <p className="eyebrow">About</p>
          <h1 className="section-title text-[clamp(2rem,4vw,2.8rem)]">
            About Nigd Stock and Abyssinia Software Technology PLC
          </h1>
          <div className="mt-6 space-y-4 text-muted">
            <p>
              <strong className="text-navy-900">{COMPANY.productName}</strong> is
              an AI-powered inventory management and stock control product for
              businesses that need clearer visibility into products, quantities,
              and inventory workflows.
            </p>
            <p>
              The product is developed by{" "}
              <strong className="text-navy-900">{COMPANY.legalName}</strong>, a
              software company based at {COMPANY.fullAddress}.
            </p>
            <p>
              Nigd Stock is intended for Ethiopian business owners, wholesalers,
              retailers, distributors, shops, warehouses, and companies evaluating
              inventory management software, stock management systems, and related
              business tools.
            </p>
            <p>
              We do not publish unverified customer counts, awards, or partnership
              claims on this site. To learn whether Nigd Stock fits your operation,
              request a demonstration and speak with our team.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact/#demo" className="btn btn-primary">
              Request a Demo
            </Link>
            <Link href="/features/" className="btn btn-secondary">
              View features
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
