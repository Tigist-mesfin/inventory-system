import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

export default function ItemRecordActions({
  productId,
  productName,
  onDeleted,
  onError,
  showEdit,
  onEdit,
}) {
  const { user } = useAuth();
  const canDelete = can(user, "catalog", "DELETE");

  const remove = async () => {
    if (
      !window.confirm(
        `Delete ${productName}? This only works if the item has no purchase or sale history.`,
      )
    ) {
      return;
    }
    try {
      await api(`/api/products/${productId}`, { method: "DELETE" });
      if (onDeleted) onDeleted();
    } catch (err) {
      if (onError) onError(err.message);
      else window.alert(err.message);
    }
  };

  return (
    <div className="row-actions">
      <Link className="btn secondary" to={`/catalog/${productId}/history?tab=sales`}>
        Sales history
      </Link>
      <Link className="btn secondary" to={`/catalog/${productId}/history?tab=purchases`}>
        Purchase history
      </Link>
      {showEdit && onEdit ? (
        <button type="button" className="btn secondary" onClick={onEdit}>
          Edit
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" className="btn danger" onClick={remove}>
          Delete
        </button>
      ) : null}
    </div>
  );
}
