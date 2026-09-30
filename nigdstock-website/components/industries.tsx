import { industries } from "@/content/features";

export function Industries() {
  return (
    <section id="industries" className="section scroll-mt-24">
      <div className="container-page">
        <p className="eyebrow">Target industries</p>
        <h2 className="section-title">Built with product-based businesses in mind</h2>
        <p className="section-lead">
          These are target use cases for inventory management software—not a claim
          that every industry-specific workflow is already included. Contact us to
          confirm fit for your operation.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => (
            <article
              key={industry.title}
              className="rounded-2xl border border-line bg-white/80 p-5"
            >
              <h3 className="text-base font-semibold text-navy-900">
                {industry.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{industry.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
