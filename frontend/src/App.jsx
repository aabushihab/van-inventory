import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/ProductsPage';
import CatalogPage from './pages/CatalogPage';
import StockHubPage from './pages/StockHubPage';
import BranchesPage from './pages/BranchesPage';
import PurchasesHubPage from './pages/PurchasesHubPage';
import SalesHubPage from './pages/SalesHubPage';
import PartiesPage from './pages/PartiesPage';
import UsersHubPage from './pages/UsersHubPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import BalancesPage from './pages/BalancesPage';
import ExpensesPage from './pages/ExpensesPage';
import EmployeesPage from './pages/EmployeesPage';
import AccountsPage from './pages/AccountsPage';
import ChecksPage from './pages/ChecksPage';
import StocktakePage from './pages/StocktakePage';
import FixedAssetsPage from './pages/FixedAssetsPage';
import FiscalClosingPage from './pages/FiscalClosingPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import VansHubPage from './pages/VansHubPage';
import MyVanPage from './pages/MyVanPage';
import { createEmotionCache, buildTheme } from './theme';

/** الصفحة الرئيسية: المندوب يذهب مباشرة لشاشة سيارتي، والباقي للوحة التحكم. */
function HomeRoute() {
  const { vanMode } = useAuth();
  return vanMode ? <Navigate to="/my-van" replace /> : <Dashboard />;
}

export default function App() {
  const { i18n } = useTranslation();
  const [direction, setDirection] = useState(i18n.language === 'ar' ? 'rtl' : 'ltr');

  useEffect(() => {
    const handler = () => setDirection(i18n.language === 'ar' ? 'rtl' : 'ltr');
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, [i18n]);

  const cache = createEmotionCache(direction);
  const theme = buildTheme(direction);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<HomeRoute />} />
                <Route path="products" element={<ProtectedRoute permission="PRODUCT_VIEW"><ProductsPage /></ProtectedRoute>} />
                <Route path="catalog" element={<ProtectedRoute permission="PRODUCT_VIEW"><CatalogPage /></ProtectedRoute>} />
                <Route path="stock" element={<ProtectedRoute permission="STOCK_VIEW"><StockHubPage /></ProtectedRoute>} />
                <Route path="damaged" element={<Navigate to="/stock?tab=damaged" replace />} />
                <Route path="my-van" element={<ProtectedRoute><MyVanPage /></ProtectedRoute>} />
                <Route path="vans" element={<ProtectedRoute permission="VAN_VIEW"><VansHubPage /></ProtectedRoute>} />
                <Route path="van-loads" element={<Navigate to="/vans?tab=loads" replace />} />
                <Route path="van-settlement" element={<Navigate to="/vans?tab=report" replace />} />
                <Route path="branches" element={<ProtectedRoute permission="WAREHOUSE_MANAGE"><BranchesPage /></ProtectedRoute>} />
                <Route path="purchase-invoices" element={<ProtectedRoute permission="PURCHASE_INVOICE_VIEW"><PurchasesHubPage /></ProtectedRoute>} />
                <Route path="sales-invoices" element={<ProtectedRoute permission="SALES_INVOICE_VIEW"><SalesHubPage /></ProtectedRoute>} />
                <Route path="sales-quotes" element={<Navigate to="/sales-invoices?tab=quotes" replace />} />
                <Route path="purchase-quotes" element={<Navigate to="/purchase-invoices?tab=quotes" replace />} />
                <Route path="parties" element={<ProtectedRoute permission="CUSTOMER_MANAGE"><PartiesPage /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute><UsersHubPage /></ProtectedRoute>} />
                <Route path="roles" element={<Navigate to="/users?tab=roles" replace />} />
                <Route path="notifications" element={<ProtectedRoute permission="NOTIFICATION_VIEW"><NotificationsPage /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute permission="REPORTS_VIEW"><ReportsPage /></ProtectedRoute>} />
                <Route path="balances" element={<ProtectedRoute permission="REPORTS_VIEW"><BalancesPage /></ProtectedRoute>} />
                <Route path="expenses" element={<ProtectedRoute permission="EXPENSE_VIEW"><ExpensesPage /></ProtectedRoute>} />
                <Route path="employees" element={<ProtectedRoute permission="EMPLOYEE_VIEW"><EmployeesPage /></ProtectedRoute>} />
                <Route path="accounts" element={<ProtectedRoute permission="ACCOUNTS_VIEW"><AccountsPage /></ProtectedRoute>} />
                <Route path="checks" element={<ProtectedRoute permission="CHECKS_VIEW"><ChecksPage /></ProtectedRoute>} />
                <Route path="stocktake" element={<ProtectedRoute permission="STOCKTAKE_VIEW"><StocktakePage /></ProtectedRoute>} />
                <Route path="fixed-assets" element={<ProtectedRoute permission="FIXED_ASSETS_VIEW"><FixedAssetsPage /></ProtectedRoute>} />
                <Route path="fiscal-closing" element={<ProtectedRoute permission="FISCAL_CLOSING_VIEW"><FiscalClosingPage /></ProtectedRoute>} />
                <Route path="company-settings" element={<ProtectedRoute permission="ROLE_MANAGE"><CompanySettingsPage /></ProtectedRoute>} />
                <Route path="audit-logs" element={<ProtectedRoute permission="ROLE_MANAGE"><AuditLogsPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  );
}
