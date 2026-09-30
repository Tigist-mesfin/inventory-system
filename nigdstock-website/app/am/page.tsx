import type { Metadata } from "next";
import Link from "next/link";
import { ProductDashboard } from "@/components/product-dashboard";
import { StructuredData } from "@/components/structured-data";
import { amHomeMetadata } from "@/lib/metadata";
import {
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
  faqPageSchema,
  webPageSchema,
} from "@/lib/schema";
import { COMPANY } from "@/lib/site";

export const metadata: Metadata = {
  ...amHomeMetadata,
  other: {
    "content-language": "am",
  },
};

const amFeatures = [
  {
    title: "የእቃ መዝገቦች",
    body: "የምርት ዝርዝር እና የስቶክ መረጃ በአንድ ቦታ በማደራጀት ቡድንዎ ተመሳሳይ መረጃ እንዲጠቀም ይረዳል።",
  },
  {
    title: "የእቃ ክትትል",
    body: "የእቃ ብዛት እና የስቶክ እንቅስቃሴን ለመከታተል የሚረዱ መሣሪያዎችን ያቀርባል።",
  },
  {
    title: "ብዙ መጋዘኖች",
    body: "ከአንድ በላይ መጋዘን ወይም ቅርንጫፍ ላይ ያለን ስቶክ በአንድ ሲስተም ማስተዳደር ይቻላል።",
  },
  {
    title: "ግዢ እና ሽያጭ",
    body: "ከግዢ ትዕዛዞች፣ የእቃ መቀበል እና ከሽያጭ ጋር የተያያዙ የእቃ ሂደቶችን ይደግፋል።",
  },
  {
    title: "ሪፖርት እና እይታ",
    body: "የእቃ መረጃን ለንግድ ውሳኔ ለማገዝ ሪፖርቶችን እና የእይታ መሣሪያዎችን ያቀርባል።",
  },
  {
    title: "በAI የተደገፈ እይታ",
    body: "የእቃ እና ተዛማጅ መረጃን በፍጥነት ለመረዳት AI የሚደግፉ ማጠቃለያዎችን እና ጥያቄዎችን ያቀርባል።",
  },
];

const amFaqs = [
  {
    id: "am-what",
    question: "ኒግድ ስቶክ ምንድን ነው?",
    answer:
      "ኒግድ ስቶክ በአቢሲኒያ ሶፍትዌር ቴክኖሎጂ ፒኤልሲ የተሰራ የእቃ አስተዳደር እና የስቶክ መቆጣጠሪያ ሶፍትዌር ነው።",
  },
  {
    id: "am-demo",
    question: "ዴሞ እንዴት እጠይቃለሁ?",
    answer:
      "በስልክ +251 951 050 364፣ በኢሜይል abyssiniasoftwaretechnologyplc@gmail.com ወይም በዚህ ድረ-ገጽ የጥያቄ ቅጽ በመጠቀም ዴሞ መጠየቅ ይችላሉ። ቅጹ ኢሜይልዎን ያዘጋጃል፤ እርስዎ ራስዎ መላክ አለብዎት።",
  },
  {
    id: "am-price",
    question: "ዋጋው ስንት ነው?",
    answer:
      "ለአሁኑ የኒግድ ስቶክ ዋጋ አቢሲኒያ ሶፍትዌር ቴክኖሎጂ ፒኤልሲን ያግኙ። በዚህ ድረ-ገጽ ላይ ቋሚ ዋጋ አልተለቀቀም።",
  },
  {
    id: "am-offline",
    question: "ከመስመር ውጭ (offline) ይሰራል?",
    answer:
      "የoffline አገልግሎት እንደ ማዋቀር ሊለያይ ይችላል። ለእርስዎ አቀማመጥ ይገኝ እንደሆነ ቡድናችንን ያረጋግጡ።",
  },
];

export default function AmharicHomePage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          websiteSchema(),
          softwareApplicationSchema(),
          webPageSchema({
            name: "ኒግድ ስቶክ | የእቃ አስተዳደር ሲስተም በኢትዮጵያ",
            description:
              "ኒግድ ስቶክ በአቢሲኒያ ሶፍትዌር ቴክኖሎጂ ፒኤልሲ የተሰራ የእቃ አስተዳደር እና የስቶክ መቆጣጠሪያ ሶፍትዌር ነው።",
            path: "/am/",
            inLanguage: "am",
          }),
          faqPageSchema(amFaqs),
        ]}
      />

      <section className="section pb-10 pt-10 sm:pt-14">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="fade-up">
            <p className="eyebrow">የእቃ አስተዳደር ሶፍትዌር በኢትዮጵያ</p>
            <h1 className="font-heading text-[clamp(2rem,4.5vw,3.1rem)] leading-[1.15] tracking-[-0.02em] text-navy-950">
              በAI የተደገፈ የእቃ አስተዳደር ሲስተም በኢትዮጵያ
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
              ኒግድ ስቶክ በ{COMPANY.legalName} የተሰራ የእቃ አስተዳደር እና የስቶክ ማኔጅመንት
              ሶፍትዌር ነው። ለንግድ ባለቤቶች የተሻለ የእቃ እይታ፣ የስቶክ ክትትል እና የእቃ አስተዳደር
              ሂደት ለማግኘት ይረዳል።
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact/#demo" className="btn btn-primary">
                ዴሞ ይጠይቁ
              </Link>
              <Link href="/contact/" className="btn btn-secondary">
                ቡድናችንን ያግኙ
              </Link>
            </div>
          </div>
          <ProductDashboard />
        </div>
      </section>

      <section className="section pt-0">
        <div className="container-page rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 className="section-title">ኒግድ ስቶክ በአቢሲኒያ ሶፍትዌር ቴክኖሎጂ ፒኤልሲ</h2>
          <p className="mt-3 max-w-3xl text-muted">
            ኒግድ ስቶክ የእቃ አስተዳደር ሲስተም፣ የስቶክ መቆጣጠሪያ ሲስተም እና የመጋዘን አስተዳደር
            ሲስተም ለሚፈልጉ የችርቻሮ፣ የጅምላ፣ የስርጭት፣ መደብር እና መጋዘን ንግዶች የተዘጋጀ ነው።
            ሰፊ የኢአርፒ ሲስተም ወይም ልዩ የPOS አገልግሎት ካስፈለገዎት ከመደምደምዎ በፊት ቡድናችንን
            ያረጋግጡ።
          </p>
        </div>
      </section>

      <section id="features" className="section scroll-mt-24">
        <div className="container-page">
          <h2 className="section-title">ዋና ባህሪያት</h2>
          <p className="section-lead">
            ከዚህ በታች ያሉት ባህሪያት በምርቱ ውስጥ ከተረጋገጡ ችሎታዎች ጋር የሚስማሙ ናቸው።
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {amFeatures.map((item) => (
              <article
                key={item.title}
                className="card-surface p-5"
              >
                <h3 className="text-lg font-semibold text-navy-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="industries" className="section scroll-mt-24 bg-white/50">
        <div className="container-page">
          <h2 className="section-title">ለማን ተስማሚ ነው?</h2>
          <p className="section-lead">
            የችርቻሮ መደብሮች፣ ጅምላ ነጋዴዎች፣ አከፋፋዮች፣ መጋዘኖች፣ ሱፐርማርኬቶች፣ ፋርማሲዎች፣
            ቡቲኮች፣ የግንባታ ቁሳቁስ አቅራቢዎች እና የመለዋወጫ ንግዶች እንደ ዒላማ አገልግሎት
            ተደርገው ይታሰባሉ—ይህ ማለት ሁሉም ኢንዱስትሪ-ተኮር ሂደት አስቀድሞ ተጠናቋል ማለት አይደለም።
          </p>
        </div>
      </section>

      <section id="how-it-works" className="section scroll-mt-24">
        <div className="container-page">
          <h2 className="section-title">እንዴት ይሰራል</h2>
          <ol className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              "የምርት እና የስቶክ መረጃን ያደራጁ።",
              "በኒግድ ስቶክ የሚገኙ የእቃ አስተዳደር ሂደቶችን ይጠቀሙ።",
              "ለንግድ ውሳኔ የሚረዳ የእቃ መረጃን ይገምግሙ።",
            ].map((text, index) => (
              <li
                key={text}
                className="rounded-2xl border border-line bg-white p-5"
              >
                <span className="font-heading text-2xl text-green-600">
                  0{index + 1}
                </span>
                <p className="mt-3 font-medium text-navy-900">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="section scroll-mt-24">
        <div className="container-page max-w-3xl">
          <h2 className="section-title">ተደጋጋሚ ጥያቄዎች</h2>
          <div className="mt-8 space-y-3">
            {amFaqs.map((item) => (
              <details
                key={item.id}
                className="rounded-2xl border border-line bg-white p-4"
              >
                <summary className="cursor-pointer font-semibold text-navy-900">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="section scroll-mt-24">
        <div className="container-page rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 className="section-title">ያግኙን</h2>
          <address className="mt-4 space-y-2 text-sm not-italic text-muted">
            <p className="font-semibold text-navy-900">{COMPANY.legalName}</p>
            <p>{COMPANY.fullAddress}</p>
            <p>
              ስልክ፦{" "}
              <a
                className="text-green-700 hover:underline"
                href={`tel:${COMPANY.phoneTel}`}
              >
                {COMPANY.phoneDisplay}
              </a>
            </p>
            <p>
              ኢሜይል፦{" "}
              <a
                className="text-green-700 hover:underline"
                href={`mailto:${COMPANY.email}`}
              >
                {COMPANY.email}
              </a>
            </p>
          </address>
          <Link href="/contact/#demo" className="btn btn-primary mt-6">
            ዴሞ ይጠይቁ
          </Link>
          <p className="mt-4 text-sm text-muted">
            <Link href="/" className="text-green-700 hover:underline" hrefLang="en">
              Read this site in English
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
