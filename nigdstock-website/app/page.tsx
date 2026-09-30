import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { SolutionsShowcase } from "@/components/solutions-showcase";
import { PromoShowcase } from "@/components/promo-showcase";
import { FeatureGrid } from "@/components/feature-grid";
import { Industries } from "@/components/industries";
import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { ContactForm } from "@/components/contact-form";
import { StructuredData } from "@/components/structured-data";
import { Reveal } from "@/components/reveal";
import { problemPoints } from "@/content/features";
import { faqs } from "@/content/faqs";
import { articles } from "@/content/articles";
import { homeMetadata } from "@/lib/metadata";
import { COMPANY, SUPPORTED_PLATFORMS, WEB_APP_URL } from "@/lib/site";
import { StoreBadges } from "@/components/store-badges";
import {
  faqPageSchema,
  localBusinessSchema,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
  webPageSchema,
} from "@/lib/schema";

export const metadata: Metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          localBusinessSchema(),
          websiteSchema(),
          softwareApplicationSchema(),
          webPageSchema({
            name: "Nigd Stock | AI-Powered Best Inventory Management System in Ethiopia",
            description:
              "AI-powered inventory management and stock control software for Ethiopian businesses.",
            path: "/",
          }),
          faqPageSchema(faqs),
        ]}
      />

      <Hero />

      <section className="section pt-8 sm:pt-10">
        <div className="container-page">
          <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-line bg-white/90 px-5 py-6 shadow-[var(--shadow-sm)] sm:flex-row sm:px-8">
            <div>
              <p className="eyebrow mb-2">Download the app</p>
              <h2 className="text-xl font-semibold text-navy-900 sm:text-2xl">
                Get Nigd Stock on Google Play and the App Store
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Install on Android or iPhone, or open the web app on any browser.
              </p>
            </div>
            <StoreBadges />
          </div>
        </div>
      </section>

      <SolutionsShowcase />
      <PromoShowcase />

      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
          <div className="rounded-3xl border border-line bg-white/90 p-6 shadow-[var(--shadow-sm)] sm:p-8 md:flex md:items-end md:justify-between md:gap-8">
            <div>
              <p className="eyebrow">Product identity</p>
              <h2 className="section-title mb-3">
                Nigd Stock by Abyssinia Software Technology PLC
              </h2>
              <p className="max-w-2xl text-muted">
                Nigd Stock is AI-powered inventory management and stock control
                software for Ethiopian business owners, wholesalers, retailers,
                distributors, shops, warehouses, and companies that need clearer
                inventory tracking. It is developed and supported by{" "}
                {COMPANY.legalName}, based in Addis Ababa.
              </p>
              <dl className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-navy-900">Product</dt>
                  <dd>{COMPANY.productName}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy-900">Developer</dt>
                  <dd>{COMPANY.legalName}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy-900">Market</dt>
                  <dd>Ethiopia (Addis Ababa office)</dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy-900">Platforms</dt>
                  <dd>{SUPPORTED_PLATFORMS.join(", ")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy-900">Web app</dt>
                  <dd>
                    <a
                      href={WEB_APP_URL}
                      className="font-medium text-green-700 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {WEB_APP_URL.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy-900">Contact</dt>
                  <dd>
                    <a
                      href={`tel:${COMPANY.phoneTel}`}
                      className="font-medium text-green-700 hover:underline"
                    >
                      {COMPANY.phoneDisplay}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
            <Link href="/about/" className="btn btn-secondary mt-6 shrink-0 md:mt-0">
              About the company
            </Link>
          </div>
          </Reveal>
        </div>
      </section>

      <section className="section bg-white/50">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The problem</p>
            <h2 className="section-title">Common inventory challenges</h2>
            <p className="section-lead">
              Growing businesses often struggle to keep stock records accurate as
              sales, purchases, and transfers accelerate.
            </p>
            <ul className="mt-8 space-y-4">
              {problemPoints.map((item) => (
                <li key={item.title} className="rounded-2xl border border-line bg-white p-4">
                  <h3 className="font-semibold text-navy-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">The solution</p>
            <h2 className="section-title">How inventory software helps</h2>
            <p className="section-lead">
              Inventory management software gives teams a shared, up-to-date view of
              products and quantities. That general benefit applies across modern
              stock systems.
            </p>
            <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
              <p>
                With a dedicated stock management system, businesses can reduce
                manual recordkeeping, document stock movements, and review
                inventory information when making purchasing or sales decisions.
              </p>
              <p>
                Nigd Stock focuses on verified capabilities such as product
                records, inventory tracking, warehouse stock positions, purchase
                and sales workflows, reporting, low-stock monitoring, and
                AI-assisted insights. Capabilities outside that set should be
                confirmed with our team before you plan around them.
              </p>
              <Link href="/features/" className="btn btn-primary">
                Explore features
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section scroll-mt-24">
        <div className="container-page">
          <p className="eyebrow">Product features</p>
          <h2 className="section-title">Capabilities verified in Nigd Stock</h2>
          <p className="section-lead">
            Feature descriptions below reflect capabilities present in the Nigd
            Stock product. They are not aspirational marketing claims.
          </p>
          <div className="mt-10">
            <FeatureGrid />
          </div>
        </div>
      </section>

      <Industries />
      <HowItWorks />

      <section className="section bg-navy-950 text-white">
        <div className="container-page grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-green-500">
              Why it matters in Ethiopia
            </p>
            <h2 className="mt-3 font-heading text-[clamp(1.7rem,3vw,2.3rem)] leading-tight tracking-tight">
              Why Ethiopian businesses need inventory software
            </h2>
            <div className="mt-5 space-y-4 text-white/75">
              <p>
                Across Addis Ababa and other commercial centers, product-based
                businesses often grow faster than their recordkeeping habits. When
                stock lives in exercise books, chat messages, or one person’s
                memory, mistakes become expensive—especially for wholesalers and
                multi-branch shops.
              </p>
              <p>
                A stock management system helps owners answer practical questions:
                What do we have? Where is it? What moved this week? Inventory
                management software is not the same as a full ERP, and it is not
                automatically a point-of-sale terminal. Choosing the right category
                starts with understanding what you need most.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              {
                title: "Inventory management",
                body: "Focuses on products, quantities, stock movements, and warehouse or store visibility.",
              },
              {
                title: "Stock control",
                body: "Emphasizes keeping on-hand levels accurate and preventing shortages or overstocking.",
              },
              {
                title: "POS",
                body: "Usually centers on checkout and front-counter sales. Confirm POS needs separately.",
              },
              {
                title: "ERP",
                body: "Typically spans finance, HR, operations, and more. Broader than inventory-first tools.",
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <h3 className="font-semibold text-white">{card.title}</h3>
                <p className="mt-1 text-sm text-white/65">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Faq />

      <section className="section pt-0">
        <div className="container-page">
          <p className="eyebrow">Guides</p>
          <h2 className="section-title">Learn about inventory software</h2>
          <p className="section-lead">
            Short educational articles to help Ethiopian businesses evaluate
            inventory tools carefully.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/blog/${article.slug}/`}
                  className="block rounded-2xl border border-line bg-white p-5 transition hover:border-green-300 hover:shadow-[var(--shadow-sm)]"
                >
                  <h3 className="font-semibold text-navy-900">{article.title}</h3>
                  <p className="mt-2 text-sm text-muted">{article.description}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-green-700">
                    Read guide
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/blog/" className="btn btn-secondary mt-6">
            All inventory guides
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <article className="rounded-3xl border border-line bg-white p-6 sm:p-10">
            <h2 className="section-title">
              Inventory Management Software for Ethiopian Businesses
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-muted">
              <p lang="am" className="rounded-2xl bg-green-50 px-4 py-3 text-navy-900">
                ኒግድ ስቶክ የእቃ አስተዳደር ሲስተም፣ የስቶክ መቆጣጠሪያ ሲስተም እና የመጋዘን አስተዳደር
                ምቹ መፍትሄ ለሚፈልጉ ኢትዮጵያውያን ንግዶች የተዘጋጀ ሶፍትዌር ነው። የሽያጭ እና የስቶክ
                ማኔጅመንት እንዲሁም ሰፊ የኢአርፒ ሲስተም ፍላጎት ካለዎት፣ ቡድናችን ምን እንደሚገኝ
                ለማረጋገጥ ያግኙን።
              </p>
              <p>
                Stock management software helps companies record products, monitor
                inventory control, and maintain inventory tracking as goods are
                purchased, stored, transferred, and sold. For Ethiopian businesses
                evaluating options, useful criteria include clarity of stock
                records, support for multiple storage locations, visibility into
                movements, reporting quality, and whether AI-assisted insights are
                available for day-to-day decisions.
              </p>
              <p>
                If you are comparing inventory software in Addis Ababa or elsewhere
                in Ethiopia—including searches related to ERP software Ethiopia,
                warehouse inventory software, or sales and inventory software—start
                by listing the workflows you need most. Then request a demonstration
                of Nigd Stock to see how those workflows map to the product.
              </p>
              <p>
                Pricing for stock management software in Ethiopia varies by scope.
                Contact {COMPANY.legalName} for current Nigd Stock pricing rather
                than relying on unofficial estimates.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="contact" className="section scroll-mt-24 pt-0">
        <div className="container-page grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Contact & demo</p>
            <h2 className="section-title">Talk with our team</h2>
            <p className="section-lead">
              Reach {COMPANY.legalName} to request a Nigd Stock demonstration or
              ask whether specific workflows are available for your business.
            </p>
            <address className="mt-8 space-y-3 text-sm not-italic text-muted">
              <p className="font-semibold text-navy-900">{COMPANY.legalName}</p>
              <p>{COMPANY.fullAddress}</p>
              <p>
                Phone:{" "}
                <a
                  className="font-medium text-green-700 hover:underline"
                  href={`tel:${COMPANY.phoneTel}`}
                >
                  {COMPANY.phoneDisplay}
                </a>
              </p>
              <p>
                Email:{" "}
                <a
                  className="font-medium text-green-700 hover:underline"
                  href={`mailto:${COMPANY.email}`}
                >
                  {COMPANY.email}
                </a>
              </p>
            </address>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`tel:${COMPANY.phoneTel}`} className="btn btn-call">
                Call Now
              </a>
              <Link href="/contact/#demo" className="btn btn-primary btn-pulse">
                Request a Demo
              </Link>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-navy-900">
                Download the app
              </p>
              <StoreBadges />
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
