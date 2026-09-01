import { designerCredit } from "../api/client";

export default function DesignerCredit() {
  const credit = designerCredit();
  return (
    <footer className="doc-credit">
      <div>{credit.line}</div>
      <div>{credit.phone}</div>
    </footer>
  );
}
