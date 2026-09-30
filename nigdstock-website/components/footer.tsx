import Link from "next/link";
import { COMPANY, FOOTER_LINKS, WEB_APP_URL } from "@/lib/site";
import { StoreBadges } from "./store-badges";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-navy-950 text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-heading text-2xl tracking-tight text-green-500">
            {COMPANY.productName}
          </p>
          <p className="mt-2 text-sm text-white/70">
            Inventory management software by {COMPANY.legalName}
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
            Helping Ethiopian businesses organize products, track stock, and
            review inventory information with greater clarity.
          </p>
          <div className="mt-5 space-y-3">
            <a
              href={WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="store-chip play store-chip-on-dark inline-flex"
            >
              <strong className="!text-xs">Open web app</strong>
            </a>
            <StoreBadges tone="dark" />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/50">
            Explore
          </h2>
          <ul className="mt-4 space-y-2.5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/80 transition hover:text-green-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/50">
            Contact
          </h2>
          <address className="mt-4 space-y-2.5 text-sm not-italic text-white/80">
            <p>{COMPANY.legalName}</p>
            <p>{COMPANY.fullAddress}</p>
            <p>
              <a
                href={`tel:${COMPANY.phoneTel}`}
                className="hover:text-green-500"
              >
                {COMPANY.phoneDisplay}
              </a>
            </p>
            <p>
              <a
                href={`mailto:${COMPANY.email}`}
                className="break-all hover:text-green-500"
              >
                {COMPANY.email}
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {COMPANY.legalName}. All rights reserved.
          </p>
          <p>
            {COMPANY.productName} ·{" "}
            <Link href="/privacy-policy/" className="hover:text-green-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
