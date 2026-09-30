import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { can, canAny, isOwner, isPlatformAdmin } from "./auth/access";
import AppShell from "./layout/AppShell";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";
import VerifyOtpPage from "./modules/auth/VerifyOtpPage";
import ForgotPasswordPage from "./modules/auth/ForgotPasswordPage";
import TeamPage from "./modules/auth/TeamPage";
import DashboardPage from "./modules/dashboard/DashboardPage";
import StockPage from "./modules/inventory/StockPage";
import StockImportPage from "./modules/inventory/StockImportPage";
import SalesPage from "./modules/sales/SalesPage";
import SaleImportPage from "./modules/sales/SaleImportPage";
import CustomerOrdersPage from "./modules/sales/CustomerOrdersPage";
import SaleFormPage from "./modules/sales/SaleFormPage";
import InvoicePage from "./modules/sales/InvoicePage";
import ProformaPage from "./modules/sales/ProformaPage";
import PublicProformaPage from "./modules/sales/PublicProformaPage";
import PublicInvoicePage from "./modules/sales/PublicInvoicePage";
import CustomersPage from "./modules/customers/CustomersPage";
import CustomerWalletsPage from "./modules/customers/CustomerWalletsPage";
import ItemHistoryPage from "./modules/catalog/ItemHistoryPage";
import CatalogPage from "./modules/catalog/CatalogPage";
import WarehousesPage from "./modules/warehouse/WarehousesPage";
import PurchasingPage from "./modules/purchasing/PurchasingPage";
import PurchaseImportPage from "./modules/purchasing/PurchaseImportPage";
import TransfersPage from "./modules/inventory/TransfersPage";
import MorePage from "./modules/more/MorePage";
import CompanyProfilePage from "./modules/more/CompanyProfilePage";
import PaymentMethodsPage from "./modules/sales/PaymentMethodsPage";
import VatPage from "./modules/sales/VatPage";
import LedgerPage from "./modules/sales/LedgerPage";
import ExpensesPage from "./modules/finance/ExpensesPage";
import OtherIncomePage from "./modules/finance/OtherIncomePage";
import IncomeStatementPage from "./modules/finance/IncomeStatementPage";
import AiDeskPage from "./modules/ai/AiDeskPage";
import AiAssistantPage from "./modules/ai/AiAssistantPage";
import ReportsPage from "./modules/insights/ReportsPage";
import InventoryLoading from "./components/InventoryLoading";
import AdminLoginPage from "./modules/admin/AdminLoginPage";
import AdminShell from "./modules/admin/AdminShell";
import AdminDashboardPage from "./modules/admin/AdminDashboardPage";
import AdminCompaniesPage from "./modules/admin/AdminCompaniesPage";
import AdminPerformancePage from "./modules/admin/AdminPerformancePage";
import AdminOwnersPage from "./modules/admin/AdminOwnersPage";
import { SUPER_ADMIN_BASE, SUPER_ADMIN_HOME, SUPER_ADMIN_LOGIN } from "./modules/admin/adminPaths";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <InventoryLoading fullScreen message="Loading inventory..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformAdmin(user)) return <Navigate to={SUPER_ADMIN_HOME} replace />;
  return children;
}

function AdminProtected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <InventoryLoading fullScreen message="Loading platform..." />;
  if (!user) return <Navigate to={SUPER_ADMIN_LOGIN} replace />;
  if (!isPlatformAdmin(user)) return <Navigate to="/" replace />;
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

function AiGate({ children }) {
  const { user } = useAuth();
  if (!can(user, "insights", "READ")) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ReportsGate() {
  const { user } = useAuth();
  if (!can(user, "insights", "READ")) {
    return <Navigate to="/" replace />;
  }
  return <ReportsPage />;
}

function VatGate() {
  const { user } = useAuth();
  if (!can(user, "insights", "READ")) {
    return <Navigate to="/" replace />;
  }
  return <VatPage />;
}

function ItemHistoryGate() {
  const { user } = useAuth();
  if (!canAny(user, [["catalog", "READ"], ["inventory", "READ"], ["sales", "READ"], ["purchasing", "READ"]])) {
    return <Navigate to="/" replace />;
  }
  return <ItemHistoryPage />;
}

function StockImportGate() {
  const { user } = useAuth();
  if (!canAny(user, [["inventory", "UPDATE"], ["inventory", "CREATE"]])) {
    return <Navigate to="/stock" replace />;
  }
  return <StockImportPage />;
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
      <Route path={SUPER_ADMIN_LOGIN} element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<Navigate to={SUPER_ADMIN_LOGIN} replace />} />
      <Route path="/admin" element={<Navigate to={SUPER_ADMIN_HOME} replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/p/:token" element={<PublicProformaPage />} />
      <Route path="/i/:token" element={<PublicInvoicePage />} />

      <Route
        path={SUPER_ADMIN_BASE}
        element={
          <AdminProtected>
            <AdminShell />
          </AdminProtected>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
        <Route path="performance" element={<AdminPerformancePage />} />
        <Route path="owners" element={<AdminOwnersPage />} />
      </Route>

      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ai" element={<AiGate><AiDeskPage /></AiGate>} />
        <Route path="/ai/assistant" element={<AiGate><AiAssistantPage /></AiGate>} />
        <Route path="/stock" element={<Can module="inventory" action="READ"><StockPage /></Can>} />
        <Route path="/stock/import" element={<StockImportGate />} />
        <Route path="/orders" element={<Can module="sales" action="READ"><CustomerOrdersPage /></Can>} />
        <Route path="/orders/:id/proforma" element={<Can module="sales" action="READ"><ProformaPage /></Can>} />
        <Route path="/sell" element={<Can module="sales" action="READ"><SalesPage /></Can>} />
        <Route path="/sell/import" element={<Can module="sales" action="CREATE"><SaleImportPage /></Can>} />
        <Route path="/sell/new" element={<Can module="sales" action="CREATE"><SaleFormPage /></Can>} />
        <Route path="/sell/:id/edit" element={<Can module="sales" action="UPDATE"><SaleFormPage /></Can>} />
        <Route path="/sell/:id" element={<Can module="sales" action="READ"><InvoicePage /></Can>} />
        <Route path="/ledger" element={<LedgerGate />} />
        <Route path="/vat" element={<VatGate />} />
        <Route path="/reports" element={<ReportsGate />} />
        <Route path="/expenses" element={<Can module="finance" action="READ"><ExpensesPage /></Can>} />
        <Route path="/other-income" element={<Can module="finance" action="READ"><OtherIncomePage /></Can>} />
        <Route path="/income-statement" element={<Can module="finance" action="READ"><IncomeStatementPage /></Can>} />
        <Route path="/customers" element={<Can module="customers" action="READ"><CustomersPage /></Can>} />
        <Route path="/customers/wallets" element={<Can module="customers" action="READ"><CustomerWalletsPage /></Can>} />
        <Route path="/catalog" element={<Can module="catalog" action="READ"><CatalogPage /></Can>} />
        <Route path="/catalog/:id/history" element={<ItemHistoryGate />} />
        <Route path="/warehouses" element={<Can module="warehouse" action="READ"><WarehousesPage /></Can>} />
        <Route path="/buy" element={<Can module="purchasing" action="READ"><PurchasingPage /></Can>} />
        <Route path="/buy/import" element={<Can module="purchasing" action="CREATE"><PurchaseImportPage /></Can>} />
        <Route path="/transfers" element={<Can module="inventory" action="UPDATE"><TransfersPage /></Can>} />
        <Route path="/payment-methods" element={<CanOwner><PaymentMethodsPage /></CanOwner>} />
        <Route path="/company-profile" element={<CanOwner><CompanyProfilePage /></CanOwner>} />
        <Route path="/team" element={<CanOwner><TeamPage /></CanOwner>} />
        <Route path="/more" element={<MorePage />} />
      </Route>
    </Routes>
  );
}
