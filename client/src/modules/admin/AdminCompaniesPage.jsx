import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";
import PeriodFilter, { periodQuery } from "./PeriodFilter";
import { telHref } from "./phoneCall";

const PAGE_SIZE = 100;
const MAX_SMS_CHARS = 335;

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const previewMessage = (title, body) => {
  const t = String(title || "").trim();
  const b = String(body || "").trim();
  if (!t) return b;
  if (!b) return t;
  return `${t}\n\n${b}`;
};

function SmsModal({ mode, company, onClose, onQueued }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState(null);

  const preview = previewMessage(title, body);
  const overLimit = preview.length > MAX_SMS_CHARS;

  useEffect(() => {
    if (!job?.id) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await api(`/api/platform/sms/jobs/${job.id}`);
        if (cancelled) return;
        setJob(res.data);
        if (["completed", "partial", "failed"].includes(res.data?.status)) {
          return;
        }
        timer = setTimeout(tick, 1500);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    let timer = setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job?.id]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!preview.trim()) {
      setError("Enter a title and/or body.");
      return;
    }
    if (overLimit) {
      setError(`Message must be at most ${MAX_SMS_CHARS} characters.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "single") {
        await api(`/api/platform/companies/${company.id}/sms`, {
          method: "POST",
          body: { title, body },
        });
        setNotice(`SMS sent to ${company.name} (${company.phone}).`);
      } else {
        const res = await api("/api/platform/sms/bulk", {
          method: "POST",
          body: { title, body },
        });
        const queued = res.data || {};
        setJob({
          id: queued.jobId,
          status: queued.status || "queued",
          total: queued.total || 0,
          processed: 0,
          sent: 0,
          failed: 0,
        });
        setNotice(
          `Queued ${queued.total || 0} messages` +
            (queued.skipped ? ` (${queued.skipped} skipped)` : "") +
            ".",
        );
        onQueued?.(queued);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === "bulk"
      ? "Bulk SMS to all companies"
      : `SMS to ${company?.name || "company"}`;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{heading}</h2>
        {mode === "single" ? (
          <p className="muted" style={{ marginTop: 0 }}>
            To {company?.phone || "—"}
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            Sends to every registered company phone via a background queue.
          </p>
        )}

        <form onSubmit={submit}>
          <div className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Message title"
              disabled={busy || Boolean(job)}
            />
          </div>
          <div className="field">
            <span>Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={320}
              placeholder="Message body"
              disabled={busy || Boolean(job)}
            />
          </div>
          <p className={`muted ${overLimit ? "error" : ""}`} style={{ margin: 0 }}>
            Preview length: {preview.length} / {MAX_SMS_CHARS}
          </p>
          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}
          {job ? (
            <p className="muted">
              Job {job.status}: {job.processed || 0}/{job.total || 0} processed
              {job.sent != null ? ` · ${job.sent} sent` : ""}
              {job.failed ? ` · ${job.failed} failed` : ""}
            </p>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              {job ? "Close" : "Cancel"}
            </button>
            {!job ? (
              <button type="submit" className="btn" disabled={busy || overLimit}>
                {busy
                  ? mode === "bulk"
                    ? "Queueing…"
                    : "Sending…"
                  : mode === "bulk"
                    ? "Queue bulk SMS"
                    : "Send SMS"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCompaniesPage() {
  const { filters, setFilters } = useOutletContext();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [smsModal, setSmsModal] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setError("");
      setBusy(true);
      api("/api/platform/companies", {
        query: {
          ...periodQuery(filters),
          search: search.trim() || undefined,
          page,
          limit: PAGE_SIZE,
        },
      })
        .then((res) => {
          if (!cancelled) setData(res.data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters, search, page]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <InventoryLoading message="Loading companies…" />;

  const companies = data.companies || [];
  const pagination = data.pagination || {
    page: 1,
    limit: PAGE_SIZE,
    total: companies.length,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Companies</div>
          <h1 style={{ margin: "8px 0 4px" }}>Registered companies</h1>
          <p className="muted">Full list with owner, salesmen, and SMS tools.</p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn saffron"
            onClick={() => setSmsModal({ mode: "bulk" })}
          >
            Bulk SMS
          </button>
        </div>
      </div>

      <PeriodFilter value={filters} onChange={setFilters} />

      <div className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
        <span>Search</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Company name or phone"
        />
      </div>

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Owner</th>
                <th>Warehouses</th>
                <th>Salesmen</th>
                <th>Sales</th>
                <th>Purchases</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Call</th>
                <th>SMS</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted">
                    No companies found.
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const call = telHref(company.phone);
                  return (
                  <tr key={company.id}>
                    <td>
                      <strong>{company.name}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {company.phone || "—"}
                      </div>
                    </td>
                    <td>
                      {company.owner?.fullName || company.owner?.username || "—"}
                      {company.owner?.phone ? (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {company.owner.phone}
                        </div>
                      ) : null}
                    </td>
                    <td>{company.warehouseCount || 0}</td>
                    <td>{company.salesmanCount || 0}</td>
                    <td>
                      {money(company.sales?.total)}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {company.sales?.count || 0} sales
                      </div>
                    </td>
                    <td>
                      {money(company.purchases?.total)}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {company.purchases?.count || 0} POs
                      </div>
                    </td>
                    <td>{company.status}</td>
                    <td>{dateText(company.createdAt)}</td>
                    <td>
                      {call ? (
                        <a className="btn chip secondary" href={call}>
                          Call
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn chip"
                        disabled={!company.phone}
                        onClick={() => setSmsModal({ mode: "single", company })}
                      >
                        Send SMS
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span className="muted">
            {pagination.total === 0
              ? "0 companies"
              : `Showing ${from}–${to} of ${pagination.total}`}
            {busy ? " · Loading…" : ""}
          </span>
          <div className="row-actions">
            <button
              type="button"
              className="btn secondary"
              disabled={!pagination.hasPrev || busy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="muted" style={{ alignSelf: "center" }}>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn"
              disabled={!pagination.hasNext || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {smsModal ? (
        <SmsModal
          mode={smsModal.mode}
          company={smsModal.company}
          onClose={() => setSmsModal(null)}
        />
      ) : null}
    </>
  );
}
