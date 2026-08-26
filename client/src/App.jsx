import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { can, canAny, isOwner } from "./auth/access";
import AppShell from "./layout/AppShell";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";
import TeamPage from "./modules/auth/TeamPage";
import DashboardPage from "./modules/dashboard/DashboardPage";
import StockPage from "./modules/inventory/StockPage";
import SalesPage from "./modules/sales/SalesPage";
import CustomerOrdersPage from "./modules/sales/CustomerOrdersPage";
import SaleFormPage from "./modules/sales/SaleFormPage";
import InvoicePage from "./modules/sales/InvoicePage";
import CustomersPage from "./modules/customers/CustomersPage";
import CatalogPage from "./modules/catalog/CatalogPage";
import WarehousesPage from "./modules/warehouse/WarehousesPage";
import PurchasingPage from "./modules/purchasing/PurchasingPage";
import TransfersPage from "./modules/inventory/TransfersPage";
import MorePage from "./modules/more/MorePage";
import CompanyProfilePage from "./modules/more/CompanyProfilePage";
import PaymentMethodsPage from "./modules/sales/PaymentMethodsPage";
import LedgerPage from "./modules/sales/LedgerPage";
import ExpensesPage from "./modules/finance/ExpensesPage";
import IncomeStatementPage from "./modules/finance/IncomeStatementPage";
import AiDeskPage from "./modules/ai/AiDeskPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" style={{ padding: 24 }}>Opening the desk…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Can({ module, action, children }) {
  const { user } = useAuth();
  if (!can(user, module, action)) return <Navigate to="/" replace />;
  return children;
}

function CanOwner({ children }) {
  const { user } = useAuth();
  if (!isOwner(user)) return <Navigate to="/" replace />;
  return children;
}

function AiGate() {
  const { user } = useAuth();
  if (!canAny(user, [["sales", "READ"], ["inventory", "READ"], ["finance", "READ"], ["purchasing", "READ"], ["insights", "READ"]])) {
    return <Navigate to="/" replace />;
  }
  return <AiDeskPage />;
}

function LedgerGate() {
  const { user } = useAuth();
  if (!canAny(user, [["sales", "READ"], ["purchasing", "READ"]])) {
    return <Navigate to="/" replace />;
  }
  return <LedgerPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ai" element={<AiGate />} />
        <Route path="/stock" element={<Can module="inventory" action="READ"><StockPage /></Can>} />
        <Route path="/orders" element={<Can module="sales" action="READ"><CustomerOrdersPage /></Can>} />
        <Route path="/sell" element={<Can module="sales" action="READ"><SalesPage /></Can>} />
        <Route path="/sell/new" element={<Can module="sales" action="CREATE"><SaleFormPage /></Can>} />
        <Route path="/sell/:id" element={<Can module="sales" action="READ"><InvoicePage /></Can>} />
        <Route path="/ledger" element={<LedgerGate />} />
        <Route path="/expenses" element={<Can module="finance" action="READ"><ExpensesPage /></Can>} />
        <Route path="/income-statement" element={<Can module="finance" action="READ"><IncomeStatementPage /></Can>} />
        <Route path="/customers" element={<Can module="customers" action="READ"><CustomersPage /></Can>} />
        <Route path="/catalog" element={<Can module="catalog" action="READ"><CatalogPage /></Can>} />
        <Route path="/warehouses" element={<Can module="warehouse" action="READ"><WarehousesPage /></Can>} />
        <Route path="/buy" element={<Can module="purchasing" action="READ"><PurchasingPage /></Can>} />
        <Route path="/transfers" element={<Can module="inventory" action="READ"><TransfersPage /></Can>} />
        <Route path="/payment-methods" element={<Can module="sales" action="READ"><PaymentMethodsPage /></Can>} />
        <Route path="/company-profile" element={<CanOwner><CompanyProfilePage /></CanOwner>} />
        <Route path="/team" element={<CanOwner><TeamPage /></CanOwner>} />
        <Route path="/more" element={<MorePage />} />
      </Route>
    </Routes>
  );
}
