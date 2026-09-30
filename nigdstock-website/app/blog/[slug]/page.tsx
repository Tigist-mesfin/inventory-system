import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle } from "@/content/articles";
import { StructuredData } from "@/components/structured-data";
import { buildPageMetadata } from "@/lib/metadata";
import {
  articleSchema,
  breadcrumbSchema,
  organizationSchema,
} from "@/lib/schema";
import { COMPANY } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) {
    return buildPageMetadata({
      title: "Article not found",
      description: "The requested article could not be found.",
      path: "/blog/",
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `${article.title} | Nigd Stock`,
    description: article.description,
    path: `/blog/${article.slug}/`,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.publishedAt,
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog/" },
            { name: article.title, path: `/blog/${article.slug}/` },
          ]),
          articleSchema({
            title: article.title,
            description: article.description,
            slug: article.slug,
            publishedAt: article.publishedAt,
          }),
        ]}
      />
      <article className="section">
        <div className="container-page max-w-3xl">
          <p className="eyebrow">{article.publishedAt}</p>
          <h1 className="section-title text-[clamp(2rem,4vw,2.8rem)]">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            By {COMPANY.legalName}
          </p>
          <div className="mt-8 space-y-4 text-muted">
            {article.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/contact/#demo" className="btn btn-primary">
              Request a Demo
            </Link>
            <Link href="/blog/" className="btn btn-secondary">
              All guides
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
