"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAm = pathname === "/am" || pathname?.startsWith("/am/");

  useEffect(() => {
    document.documentElement.lang = isAm ? "am" : "en";
  }, [isAm]);

  return (
    <div lang={isAm ? "am" : "en"} className="flex min-h-full flex-1 flex-col">
      <Header locale={isAm ? "am" : "en"} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
