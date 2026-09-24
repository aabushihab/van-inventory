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
import PurchasesHubPage from './pages/PurchasesHubPage';
import SalesHubPage from './pages/SalesHubPage';
import PartiesPage from './pages/PartiesPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import EmployeesPage from './pages/EmployeesPage';
import VansHubPage from './pages/VansHubPage';
import { ProductsHub, StockHub, FinanceHub, SettingsHub } from './pages/hubs';
import { TabRedirect } from './components/TabbedHub';
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
                <Route path="products" element={<ProtectedRoute permission="PRODUCT_VIEW"><ProductsHub /></ProtectedRoute>} />
                <Route path="catalog" element={<TabRedirect to="/products?tab=catalog" />} />
                <Route path="stock" element={<ProtectedRoute><StockHub /></ProtectedRoute>} />
                <Route path="damaged" element={<TabRedirect to="/stock?tab=damaged" />} />
                <Route path="stocktake" element={<TabRedirect to="/stock?tab=stocktake" />} />
                <Route path="my-van" element={<ProtectedRoute><MyVanPage /></ProtectedRoute>} />
                <Route path="vans" element={<ProtectedRoute permission="VAN_VIEW"><VansHubPage /></ProtectedRoute>} />
                <Route path="van-loads" element={<TabRedirect to="/vans?tab=loads" />} />
                <Route path="van-settlement" element={<TabRedirect to="/vans?tab=report" />} />
                <Route path="purchase-invoices" element={<ProtectedRoute permission="PURCHASE_INVOICE_VIEW"><PurchasesHubPage /></ProtectedRoute>} />
                <Route path="purchase-quotes" element={<TabRedirect to="/purchase-invoices?tab=quotes" />} />
                <Route path="sales-invoices" element={<ProtectedRoute permission="SALES_INVOICE_VIEW"><SalesHubPage /></ProtectedRoute>} />
                <Route path="sales-quotes" element={<TabRedirect to="/sales-invoices?tab=quotes" />} />
                <Route path="parties" element={<ProtectedRoute permission="CUSTOMER_MANAGE"><PartiesPage /></ProtectedRoute>} />
                <Route path="employees" element={<ProtectedRoute permission="EMPLOYEE_VIEW"><EmployeesPage /></ProtectedRoute>} />
                <Route path="finance" element={<ProtectedRoute><FinanceHub /></ProtectedRoute>} />
                <Route path="accounts" element={<TabRedirect to="/finance?tab=accounts" />} />
                <Route path="checks" element={<TabRedirect to="/finance?tab=checks" />} />
                <Route path="expenses" element={<TabRedirect to="/finance?tab=expenses" />} />
                <Route path="balances" element={<TabRedirect to="/finance?tab=balances" />} />
                <Route path="fixed-assets" element={<TabRedirect to="/finance?tab=fixed-assets" />} />
                <Route path="fiscal-closing" element={<TabRedirect to="/finance?tab=fiscal-closing" />} />
                <Route path="reports" element={<ProtectedRoute permission="REPORTS_VIEW"><ReportsPage /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute permission="NOTIFICATION_VIEW"><NotificationsPage /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute><SettingsHub /></ProtectedRoute>} />
                <Route path="company-settings" element={<TabRedirect to="/settings?tab=company" />} />
                <Route path="branches" element={<TabRedirect to="/settings?tab=branches" />} />
                <Route path="users" element={<TabRedirect to="/settings?tab=users" />} />
                <Route path="roles" element={<TabRedirect to="/settings?tab=roles" />} />
                <Route path="audit-logs" element={<TabRedirect to="/settings?tab=audit" />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  );
}
