import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import ProformaSheet from "../../components/ProformaSheet";
import InventoryLoading from "../../components/InventoryLoading";

export default function PublicProformaPage() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return undefined;
    api(`/api/customer-orders/share/${encodeURIComponent(token)}`)
      .then((res) => {
        setOrder(res.data.order);
        setCompany(res.data.company);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!order?.orderNumber) return undefined;
    const previous = document.title;
    document.title = `${order.orderNumber} · Proforma`;
    const onBeforePrint = () => {
      document.title = order.orderNumber;
    };
    const onAfterPrint = () => {
      document.title = `${order.orderNumber} · Proforma`;
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.title = previous;
    };
  }, [order?.orderNumber]);

  if (error) {
    return (
      <div className="doc-public">
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!order) {
    return <InventoryLoading fullScreen message="Loading inventory..." />;
  }

  return (
    <div className="doc-public">
      <ProformaSheet
        company={company}
        order={order}
        shareUrl={window.location.href.split("?")[0]}
      />
    </div>
  );
}
