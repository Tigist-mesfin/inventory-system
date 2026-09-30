import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, absoluteShareUrl } from "../../api/client";
import ProformaSheet from "../../components/ProformaSheet";
import InventoryLoading from "../../components/InventoryLoading";

export default function ProformaPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api(`/api/customer-orders/${id}`), api("/api/company-profile")])
      .then(([orderRes, companyRes]) => {
        setOrder(orderRes.data.order);
        setCompany(companyRes.data.company);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!order?.orderNumber) return undefined;
    const previous = document.title;
    const onBeforePrint = () => {
      document.title = order.orderNumber;
    };
    const onAfterPrint = () => {
      document.title = previous;
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.title = previous;
    };
  }, [order?.orderNumber]);

  const shareUrl = useMemo(() => {
    if (!order?.shareToken) return "";
    return absoluteShareUrl(`/p/${order.shareToken}`);
  }, [order?.shareToken]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <InventoryLoading message="Loading inventory..." />;

  return (
    <ProformaSheet
      company={company}
      order={order}
      shareUrl={shareUrl}
      backTo="/orders"
    />
  );
}
