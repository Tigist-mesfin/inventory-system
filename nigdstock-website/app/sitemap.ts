import type { MetadataRoute } from "next";
import { articles } from "@/content/articles";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const paths = [
    "/",
    "/about/",
    "/features/",
    "/contact/",
    "/privacy-policy/",
    "/am/",
    "/blog/",
    ...articles.map((article) => `/blog/${article.slug}/`),
  ];

  return paths.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency:
      path === "/" || path === "/am/" || path.startsWith("/blog")
        ? "weekly"
        : "monthly",
    priority:
      path === "/"
        ? 1
        : path === "/am/" || path === "/features/" || path === "/contact/"
          ? 0.9
          : path.startsWith("/blog")
            ? 0.65
            : 0.7,
  }));
}
