import { useState } from "react";
import { api, money, qty } from "../../api/client";

export default function MarketplacePage() {
  const [query, setQuery] = useState({ search: "", brand: "", size: "", color: "" });
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");

  const search = async (e) => {
    e?.preventDefault();
    try {
      const res = await api("/api/insights/marketplace", { query });
      setListings(res.data.listings);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Find a product</h1>
      <p className="muted">Search product → seller location → price → available quantity. Skip walking Merkato aisle by aisle.</p>
      <form className="toolbar" onSubmit={search}>
        <input placeholder="What are you looking for?" value={query.search} onChange={(e) => setQuery({ ...query, search: e.target.value })} />
        <input placeholder="Brand" value={query.brand} onChange={(e) => setQuery({ ...query, brand: e.target.value })} />
        <input placeholder="Size" value={query.size} onChange={(e) => setQuery({ ...query, size: e.target.value })} />
        <input placeholder="Color" value={query.color} onChange={(e) => setQuery({ ...query, color: e.target.value })} />
        <button className="btn">Search</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid stats">
        {listings.map((row) => (
          <article className="card" key={`${row.productId}-${row.warehouse.id}`}>
            <div className="pill">{row.warehouse.location || row.warehouse.name}</div>
            <h3>{row.name}</h3>
            <p className="muted">{[row.brand, row.size, row.color].filter(Boolean).join(" · ")} · {row.sku}</p>
            <p><strong>{money(row.sellingPrice)}</strong> · {qty(row.available)} available</p>
          </article>
        ))}
      </div>
      {listings.length === 0 ? <p className="empty muted">Search to see live wholesale availability.</p> : null}
    </>
  );
}
