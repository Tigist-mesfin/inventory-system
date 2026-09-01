import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import InvoicePage from "./InvoicePage";
import InventoryLoading from "../../components/InventoryLoading";

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [sale, setSale] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return undefined;
    api(`/api/sales/share/${encodeURIComponent(token)}`)
      .then((res) => {
        setSale(res.data.sale);
        setCompany(res.data.company);
      })
      .catch((err) => setError(err.message));
    return undefined;
  }, [token]);

  if (error) {
    return (
      <div className="doc-public">
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!sale) {
    return <InventoryLoading fullScreen message="Loading inventory..." />;
  }

  return (
    <div className="doc-public">
      <InvoicePage
        publicSale={sale}
        publicCompany={company}
        publicShareUrl={window.location.href.split("?")[0]}
      />
    </div>
  );
}
