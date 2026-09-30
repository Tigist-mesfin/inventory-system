"use client";

import {
  Activity,
  Bell,
  ChartColumn,
  FileText,
  Package,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { features, type FeatureItem } from "@/content/features";
import { Reveal } from "./reveal";

const iconMap: Record<FeatureItem["icon"], LucideIcon> = {
  package: Package,
  activity: Activity,
  warehouse: Warehouse,
  "shopping-cart": ShoppingCart,
  truck: Truck,
  chart: ChartColumn,
  bell: Bell,
  sparkles: Sparkles,
  users: Users,
  "file-text": FileText,
};

export function FeatureGrid({
  items = features,
  compact = false,
}: {
  items?: FeatureItem[];
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-4 ${
        compact
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 xl:grid-cols-3"
      }`}
    >
      {items.map((feature, index) => {
        const Icon = iconMap[feature.icon];
        return (
          <Reveal
            key={feature.id}
            delayMs={index * 80}
            as="article"
            className="h-full"
          >
            <div className="feature-card card-surface group h-full p-5">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-white shadow-[0_10px_20px_rgb(15_122_74_/_0.25)] transition group-hover:scale-110">
                <Icon size={20} aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-navy-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
