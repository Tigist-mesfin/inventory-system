"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { COMPANY, NAV_LINKS } from "@/lib/site";
import { StartNowModal } from "./start-now-modal";
import { StoreBadges } from "./store-badges";

type HeaderProps = {
  locale?: "en" | "am";
};

const amNav = [
  { href: "/am/", label: "መነሻ" },
  { href: "/features/", label: "ባህሪያት" },
  { href: "/am/#how-it-works", label: "እንዴት ይሰራል" },
  { href: "/contact/", label: "አግኙን" },
];

export function Header({ locale = "en" }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const links = locale === "am" ? amNav : NAV_LINKS;
  const homeHref = locale === "am" ? "/am/" : "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-colors ${
          scrolled
            ? "border-green-100 bg-white/92 backdrop-blur-md shadow-[var(--shadow-sm)]"
            : "border-transparent bg-white/70 backdrop-blur-sm"
        }`}
      >
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-3">
          <Link
            href={homeHref}
            className="flex items-center gap-2.5 font-semibold text-navy-900"
            aria-label={`${COMPANY.productName} home`}
          >
            <Image
              src="/images/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
              priority
            />
            <span className="font-heading text-lg tracking-tight text-green-700">
              {COMPANY.productName}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-navy-800/85 transition hover:bg-green-50 hover:text-green-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <StoreBadges />
            <a
              href={`tel:${COMPANY.phoneTel}`}
              className="btn btn-primary !min-h-10 !px-4"
            >
              <Phone size={16} aria-hidden />
              Call
            </a>
            <button
              type="button"
              className="btn btn-primary btn-pulse !min-h-10"
              onClick={() => setStartOpen(true)}
            >
              Start Now
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-navy-900 xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open ? (
          <div
            id="mobile-nav"
            className="max-h-[80vh] overflow-auto border-t border-line bg-white xl:hidden"
          >
            <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-navy-900 hover:bg-green-50"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 space-y-2">
                <StoreBadges compact />
                <a
                  href={`tel:${COMPANY.phoneTel}`}
                  className="btn btn-primary w-full"
                  onClick={() => setOpen(false)}
                >
                  <Phone size={16} aria-hidden />
                  Call
                </a>
                <button
                  type="button"
                  className="btn btn-primary btn-pulse w-full"
                  onClick={() => {
                    setOpen(false);
                    setStartOpen(true);
                  }}
                >
                  Start Now
                </button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>
      <StartNowModal open={startOpen} onClose={() => setStartOpen(false)} />
    </>
  );
}
