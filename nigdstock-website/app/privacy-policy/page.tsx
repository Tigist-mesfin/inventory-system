import type { Metadata } from "next";
import Link from "next/link";
import { privacyMetadata } from "@/lib/metadata";
import { StructuredData } from "@/components/structured-data";
import {
  breadcrumbSchema,
  organizationSchema,
  webPageSchema,
} from "@/lib/schema";
import { COMPANY, SITE_URL } from "@/lib/site";

export const metadata: Metadata = privacyMetadata;

export default function PrivacyPolicyPage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          webPageSchema({
            name: "Privacy Policy | Nigd Stock",
            description:
              "Privacy policy for the Nigd Stock marketing website operated by Abyssinia Software Technology PLC.",
            path: "/privacy-policy/",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy-policy/" },
          ]),
        ]}
      />
      <section className="section">
        <div className="container-page max-w-3xl">
          <p className="eyebrow">Legal</p>
          <h1 className="section-title text-[clamp(2rem,4vw,2.8rem)]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted">
            Last updated: 26 September 2026
          </p>
          <div className="mt-8 space-y-5 text-muted">
            <p>
              This privacy policy describes how {COMPANY.legalName} handles
              information related to the public marketing website at{" "}
              <a className="text-green-700 hover:underline" href={SITE_URL}>
                {SITE_URL}
              </a>
              .
            </p>
            <h2 className="text-lg font-semibold text-navy-900">
              Website inquiries
            </h2>
            <p>
              The demo request form on this website does not store submissions on
              a server operated by this static site. When you submit the form,
              your device prepares an email addressed to {COMPANY.email}. You
              choose whether to send that email through your own email
              application. Message content you send by email is handled according
              to ordinary business communication practices.
            </p>
            <h2 className="text-lg font-semibold text-navy-900">
              Server and analytics logs
            </h2>
            <p>
              Hosting providers may collect standard technical logs such as IP
              address, browser type, and requested pages. This marketing site is
              designed to work without requiring paid third-party analytics. If
              analytics tools are added later, this policy should be updated.
            </p>
            <h2 className="text-lg font-semibold text-navy-900">Contact</h2>
            <p>
              For privacy questions about this website, contact{" "}
              <a
                className="text-green-700 hover:underline"
                href={`mailto:${COMPANY.email}`}
              >
                {COMPANY.email}
              </a>{" "}
              or call{" "}
              <a
                className="text-green-700 hover:underline"
                href={`tel:${COMPANY.phoneTel}`}
              >
                {COMPANY.phoneDisplay}
              </a>
              .
            </p>
            <p>
              Office: {COMPANY.fullAddress}.
            </p>
          </div>
          <Link href="/" className="btn btn-secondary mt-8">
            Back to homepage
          </Link>
        </div>
      </section>
    </>
  );
}
