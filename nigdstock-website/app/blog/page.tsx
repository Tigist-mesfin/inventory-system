import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/content/articles";
import { StructuredData } from "@/components/structured-data";
import { buildPageMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  collectionPageSchema,
  organizationSchema,
} from "@/lib/schema";

export const metadata: Metadata = buildPageMetadata({
  title: "Inventory Software Guides | Nigd Stock Blog",
  description:
    "Practical guides on inventory management software, stock control, and ERP evaluation for Ethiopian businesses considering Nigd Stock.",
  path: "/blog/",
});

export default function BlogIndexPage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          collectionPageSchema({
            name: "Inventory Software Guides | Nigd Stock Blog",
            description:
              "Practical guides on inventory management software, stock control, and ERP evaluation for Ethiopian businesses considering Nigd Stock.",
            path: "/blog/",
            articles,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog/" },
          ]),
        ]}
      />
      <section className="section">
        <div className="container-page">
          <p className="eyebrow">Guides</p>
          <h1 className="section-title text-[clamp(2rem,4vw,2.8rem)]">
            Inventory software guides
          </h1>
          <p className="section-lead mt-3">
            Educational articles to help business owners evaluate inventory
            management software carefully—without fabricated claims.
          </p>
          <ul className="mt-10 grid gap-4">
            {articles.map((article) => (
              <li key={article.slug}>
                <article className="card-surface p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {article.publishedAt}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-navy-900">
                    <Link
                      href={`/blog/${article.slug}/`}
                      className="hover:text-green-700"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-muted">{article.description}</p>
                  <Link
                    href={`/blog/${article.slug}/`}
                    className="mt-4 inline-flex text-sm font-semibold text-green-700 hover:underline"
                  >
                    Read article
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
