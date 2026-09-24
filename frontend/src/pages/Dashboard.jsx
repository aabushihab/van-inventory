import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, CircularProgress, Stack, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import RequestPageOutlinedIcon from '@mui/icons-material/RequestPageOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { dashboardApi, reportApi, salesInvoiceApi, purchaseInvoiceApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

/** يبني تاريخ ISO محلي (سنة-شهر-يوم) بدون تحويل للتوقيت العالمي، لتفادي انزياح يوم كامل قرب منتصف الليل بمنطقة زمنية شرقية. */
function localIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function todayIso() {
  return localIso(new Date());
}
function firstDayOfMonthIso() {
  const d = new Date();
  return localIso(new Date(d.getFullYear(), d.getMonth(), 1));
}
function money(v) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5, display: 'flex', alignItems: 'center', gap: 2, height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s, transform .15s',
        '&:hover': onClick ? { boxShadow: 3, transform: 'translateY(-2px)', borderColor: `${color}.main` } : undefined,
      }}
    >
      <Box sx={{
        width: 52, height: 52, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: `${color}.light`, color: `${color}.dark`, opacity: 0.95,
      }}>
        <Icon />
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={800}>{value}</Typography>
      </Box>
    </Paper>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5, mt: 3 }}>
      {children}
    </Typography>
  );
}

function QuickLinkTile({ icon: Icon, label, color, onClick }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        cursor: 'pointer', textAlign: 'center', height: '100%',
        transition: 'box-shadow .15s, transform .15s',
        '&:hover': { boxShadow: 3, transform: 'translateY(-2px)', borderColor: `${color}.main` },
      }}
    >
      <Box sx={{
        width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: `${color}.light`, color: `${color}.dark`,
      }}>
        <Icon fontSize="small" />
      </Box>
      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '100%' }}>{label}</Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [summary, setSummary] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);

  useEffect(() => {
    dashboardApi.summary().then(({ data }) => setSummary(data)).catch(() => setSummary(null));

    if (hasPermission('REPORTS_VIEW')) {
      reportApi.balanceSheet().then(({ data }) => setBalanceSheet(data)).catch(() => {});
    }

    const calls = [];
    if (hasPermission('SALES_INVOICE_VIEW')) {
      calls.push(salesInvoiceApi.list({ page: 0, size: 5 }).then(({ data }) => data.content.map((inv) => ({
        id: `S${inv.id}`, type: 'sale', party: inv.customerName, total: inv.grandTotal, createdAt: inv.createdAt,
      }))));
    }
    if (hasPermission('PURCHASE_INVOICE_VIEW')) {
      calls.push(purchaseInvoiceApi.list({ page: 0, size: 5 }).then(({ data }) => data.content.map((inv) => ({
        id: `P${inv.id}`, type: 'purchase', party: inv.supplierName, total: inv.grandTotal, createdAt: inv.createdAt,
      }))));
    }
    if (calls.length > 0) {
      Promise.all(calls)
        .then((lists) => setRecentActivity(
          lists.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
        ))
        .catch(() => setRecentActivity([]));
    } else {
      setRecentActivity([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(() => {
    if (!summary?.last7DaysSales) return [];
    return summary.last7DaysSales.map((p) => ({
      label: new Date(`${p.date}T00:00:00`).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' }),
      total: Number(p.total || 0),
    }));
  }, [summary, i18n.language]);

  if (!summary) {
    return <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  function goToTodaySales() {
    navigate('/sales-invoices', { state: { prefillFrom: todayIso(), prefillTo: todayIso() } });
  }
  function goToMonthSales() {
    navigate('/sales-invoices', { state: { prefillFrom: firstDayOfMonthIso(), prefillTo: todayIso() } });
  }
  function goToLowStock() {
    navigate('/stock', { state: { prefillLowOnly: true } });
  }

  const statCards = [
    { key: 'todaySales', icon: PaidOutlinedIcon, color: 'secondary', label: t('dashboard.todaySales'), value: money(summary.todaySales), onClick: goToTodaySales, permission: 'SALES_INVOICE_VIEW' },
    { key: 'todayInvoices', icon: ReceiptLongOutlinedIcon, color: 'primary', label: t('dashboard.todayInvoices'), value: summary.todayInvoicesCount, onClick: goToTodaySales, permission: 'SALES_INVOICE_VIEW' },
    { key: 'monthSales', icon: CalendarMonthOutlinedIcon, color: 'primary', label: t('dashboard.monthSales'), value: money(summary.monthSales), onClick: goToMonthSales, permission: 'SALES_INVOICE_VIEW' },
    { key: 'lowStock', icon: WarningAmberOutlinedIcon, color: 'warning', label: t('dashboard.lowStock'), value: summary.lowStockCount, onClick: goToLowStock, permission: 'STOCK_VIEW' },
    { key: 'notifications', icon: NotificationsOutlinedIcon, color: 'warning', label: t('dashboard.notifications'), value: summary.unreadNotificationsCount, onClick: () => navigate('/notifications'), permission: 'NOTIFICATION_VIEW' },
    { key: 'products', icon: Inventory2OutlinedIcon, color: 'secondary', label: t('dashboard.products'), value: summary.totalProducts, onClick: () => navigate('/products'), permission: 'PRODUCT_VIEW' },
    { key: 'warehouses', icon: WarehouseOutlinedIcon, color: 'secondary', label: t('dashboard.warehouses'), value: summary.totalWarehouses, onClick: () => navigate('/branches', { state: { initialTab: 1 } }), permission: 'WAREHOUSE_MANAGE' },
    { key: 'branches', icon: StorefrontOutlinedIcon, color: 'secondary', label: t('dashboard.branches'), value: summary.totalBranches, onClick: () => navigate('/branches', { state: { initialTab: 0 } }), permission: 'WAREHOUSE_MANAGE' },
  ].filter((c) => hasPermission(c.permission));

  const quickLinks = [
    { key: 'salesInvoices', to: '/sales-invoices', label: t('nav.salesInvoices'), icon: ReceiptLongOutlinedIcon, color: 'primary', permission: 'SALES_INVOICE_VIEW' },
    { key: 'purchaseInvoices', to: '/purchase-invoices', label: t('nav.purchaseInvoices'), icon: ShoppingCartOutlinedIcon, color: 'secondary', permission: 'PURCHASE_INVOICE_VIEW' },
    { key: 'products', to: '/products', label: t('nav.products'), icon: Inventory2OutlinedIcon, color: 'secondary', permission: 'PRODUCT_VIEW' },
    { key: 'stock', to: '/stock', label: t('nav.stock'), icon: WarehouseOutlinedIcon, color: 'primary', permission: 'STOCK_VIEW' },
    { key: 'expenses', to: '/expenses', label: t('nav.expenses'), icon: MoneyOffOutlinedIcon, color: 'warning', permission: 'EXPENSE_VIEW' },
    { key: 'accounts', to: '/accounts', label: t('nav.accounts'), icon: AccountBalanceOutlinedIcon, color: 'success', permission: 'ACCOUNTS_VIEW' },
    { key: 'checks', to: '/checks', label: t('nav.checks'), icon: RequestPageOutlinedIcon, color: 'info', permission: 'CHECKS_VIEW' },
    { key: 'reports', to: '/reports', label: t('nav.reports'), icon: AssessmentOutlinedIcon, color: 'primary', permission: 'REPORTS_VIEW' },
    { key: 'stocktake', to: '/stocktake', label: t('nav.stocktake'), icon: FactCheckOutlinedIcon, color: 'secondary', permission: 'STOCKTAKE_VIEW' },
  ].filter((l) => hasPermission(l.permission));

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
        {t('auth.welcome')}, {user?.fullName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{user?.role}</Typography>

      {statCards.length > 0 && (
        <Grid container spacing={2}>
          {statCards.map((c) => (
            <Grid key={c.key} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard icon={c.icon} color={c.color} label={c.label} value={c.value} onClick={c.onClick} />
            </Grid>
          ))}
        </Grid>
      )}

      {hasPermission('REPORTS_VIEW') && balanceSheet && (
        <>
          <SectionTitle>{t('dashboard.financialSnapshot')}</SectionTitle>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard icon={AccountBalanceWalletOutlinedIcon} color="success" label={t('reports.cashAndBank')}
                value={money(balanceSheet.cashAndBank)} onClick={() => navigate('/accounts')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard icon={TrendingUpOutlinedIcon} color="info" label={t('reports.accountsReceivable')}
                value={money(balanceSheet.accountsReceivable)} onClick={() => navigate('/balances')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard icon={TrendingDownOutlinedIcon} color="error" label={t('reports.accountsPayable')}
                value={money(balanceSheet.accountsPayable)} onClick={() => navigate('/balances')} />
            </Grid>
          </Grid>
        </>
      )}

      {hasPermission('SALES_INVOICE_VIEW') && chartData.length > 0 && (
        <>
          <SectionTitle>{t('dashboard.salesTrend')}</SectionTitle>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Box sx={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                  <YAxis width={0} axisLine={false} tickLine={false} tick={false} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Area type="monotone" dataKey="total" stroke={theme.palette.primary.main} strokeWidth={2.5} fill="url(#salesTrendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {quickLinks.length > 0 && (
        <>
          <SectionTitle>{t('dashboard.quickLinks')}</SectionTitle>
          <Grid container spacing={2}>
            {quickLinks.map((l) => (
              <Grid key={l.key} size={{ xs: 6, sm: 4, md: 2 }}>
                <QuickLinkTile icon={l.icon} label={l.label} color={l.color} onClick={() => navigate(l.to)} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {recentActivity && recentActivity.length > 0 && (
        <>
          <SectionTitle>{t('dashboard.recentActivity')}</SectionTitle>
          <Paper variant="outlined">
            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
              {recentActivity.map((item) => {
                const isSale = item.type === 'sale';
                const Icon = isSale ? ReceiptLongOutlinedIcon : ShoppingCartOutlinedIcon;
                return (
                  <Box
                    key={item.id}
                    onClick={() => navigate(isSale ? '/sales-invoices' : '/purchase-invoices')}
                    sx={{
                      p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isSale ? 'primary.light' : 'secondary.light', color: isSale ? 'primary.dark' : 'secondary.dark',
                      flexShrink: 0,
                    }}>
                      <Icon fontSize="small" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {item.party || (isSale ? t('dashboard.sale') : t('dashboard.purchase'))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={800} sx={{ flexShrink: 0 }}>
                      {money(item.total)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
}
