import type { Metadata } from "next";
import Link from "next/link";

// Next.js already applies noindex on not-found; keep absolute title only.
export const metadata: Metadata = {
  title: { absolute: "Page not found | Nigd Stock" },
  description:
    "The requested page could not be found on the Nigd Stock website.",
};

export default function NotFound() {
  return (
    <section className="section">
      <div className="container-page max-w-2xl py-16 text-center">
        <p className="eyebrow justify-center">404</p>
        <h1 className="section-title">This page could not be found</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          The page may have moved, or the link may be incorrect. Return to the
          Nigd Stock homepage to continue.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Back to homepage
          </Link>
          <Link href="/contact/" className="btn btn-secondary">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
