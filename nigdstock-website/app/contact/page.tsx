import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { StructuredData } from "@/components/structured-data";
import { contactMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  contactPageSchema,
  organizationSchema,
  webPageSchema,
} from "@/lib/schema";
import { COMPANY } from "@/lib/site";

export const metadata: Metadata = contactMetadata;

export default function ContactPage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          contactPageSchema(),
          webPageSchema({
            name: "Contact Nigd Stock | Request a Demo in Ethiopia",
            description:
              "Contact Abyssinia Software Technology PLC in Addis Ababa to request a Nigd Stock demonstration.",
            path: "/contact/",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact/" },
          ]),
        ]}
      />
      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Contact</p>
            <h1 className="section-title text-[clamp(2rem,4vw,2.8rem)]">
              Contact Nigd Stock
            </h1>
            <p className="section-lead mt-3">
              Request a demonstration or ask about inventory workflows for your
              business. We respond through the contact details below.
            </p>
            <address className="mt-8 space-y-3 rounded-3xl border border-line bg-white p-6 text-sm not-italic text-muted">
              <p className="text-base font-semibold text-navy-900">
                {COMPANY.legalName}
              </p>
              <p>{COMPANY.fullAddress}</p>
              <p>
                Phone:{" "}
                <a
                  className="font-medium text-green-700 hover:underline"
                  href={`tel:${COMPANY.phoneTel}`}
                >
                  {COMPANY.phoneDisplay}
                </a>{" "}
                <span className="text-muted">({COMPANY.phoneLocal})</span>
              </p>
              <p>
                Email:{" "}
                <a
                  className="break-all font-medium text-green-700 hover:underline"
                  href={`mailto:${COMPANY.email}`}
                >
                  {COMPANY.email}
                </a>
              </p>
            </address>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
