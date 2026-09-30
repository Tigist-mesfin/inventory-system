import type { ReactNode } from "react";

export default function AmharicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Helps crawlers that execute early scripts associate /am/ with Amharic */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="am";`,
        }}
      />
      <div lang="am">{children}</div>
    </>
  );
}
