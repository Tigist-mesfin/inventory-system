import { Play } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

type StoreBadgesProps = {
  compact?: boolean;
  className?: string;
  tone?: "light" | "dark";
};

function AppleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.4 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1-.1 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.7zM14.2 6.4c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.5 1 .1 1.9-.5 2.6-1.1z"
      />
    </svg>
  );
}

export function StoreBadges({
  compact = false,
  className = "",
  tone = "light",
}: StoreBadgesProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? "w-full flex-col" : ""
      } ${className}`}
    >
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`store-chip play ${compact ? "w-full justify-center" : ""} ${
          tone === "dark" ? "store-chip-on-dark" : ""
        }`}
        aria-label="Download Nigd Stock on Google Play"
      >
        <Play size={14} fill="currentColor" aria-hidden />
        <span>
          <small>Get it on</small>
          <strong>Google Play</strong>
        </span>
      </a>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`store-chip apple ${compact ? "w-full justify-center" : ""} ${
          tone === "dark" ? "store-chip-on-dark" : ""
        }`}
        aria-label="Download Nigd Stock on the App Store"
      >
        <AppleIcon />
        <span>
          <small>Download on the</small>
          <strong>App Store</strong>
        </span>
      </a>
    </div>
  );
}
