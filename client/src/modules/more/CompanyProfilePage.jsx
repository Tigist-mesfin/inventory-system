import { useEffect, useState } from "react";
import { api } from "../../api/client";

const empty = { name: "", address: "", phone: "", email: "", tin: "" };

export default function CompanyProfilePage() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    api("/api/company-profile")
      .then((res) => setForm({ ...empty, ...res.data.company }))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <form
      className="card"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setSaved("");
        try {
          const res = await api("/api/company-profile", { method: "PATCH", body: form });
          setForm({ ...empty, ...res.data.company });
          setSaved("Company details saved. They appear on invoices.");
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      <h1>Company profile</h1>
      <p className="muted">
        This information is printed at the top of every invoice. You can fill it now or later.
      </p>
      <div className="grid split">
        <label className="field">
          <span>Company name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>TIN</span>
          <input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
        </label>
      </div>
      <label className="field">
        <span>Address</span>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="muted">{saved}</p> : null}
      <button className="btn saffron" style={{ marginTop: 16 }}>Save company details</button>
    </form>
  );
}
