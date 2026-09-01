export default function InventoryLoading({
  message = "Loading inventory...",
  fullScreen = false,
}) {
  return (
    <div
      className={`inventory-loading${fullScreen ? " is-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="inventory-loading-card">
        <div className="inventory-loading-scene" aria-hidden="true">
          <span className="inventory-loading-ring" />
          <span className="inventory-loading-ring-inner" />
          <div className="inventory-loading-rack">
            <span className="inventory-loading-post is-left" />
            <span className="inventory-loading-post is-right" />
            <span className="inventory-loading-shelf is-top" />
            <span className="inventory-loading-shelf is-mid" />
            <span className="inventory-loading-shelf is-base" />
            <span className="inventory-loading-box is-a" />
            <span className="inventory-loading-box is-b" />
            <span className="inventory-loading-box is-c" />
            <span className="inventory-loading-box is-d" />
          </div>
        </div>
        <p className="inventory-loading-message">{message}</p>
      </div>
    </div>
  );
}
