import { useEffect, useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Avatar, Menu, MenuItem, Badge, Divider, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert, CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import StoreIcon from '@mui/icons-material/StorefrontOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import SecurityIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import BrokenImageIcon from '@mui/icons-material/BrokenImageOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import RequestQuoteIcon from '@mui/icons-material/RequestQuoteOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import MoneyOffIcon from '@mui/icons-material/MoneyOffOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import RequestPageIcon from '@mui/icons-material/RequestPageOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import LockResetIcon from '@mui/icons-material/LockResetOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { notificationApi, publicApi, authApi } from '../api/endpoints';
import { VAN_MODE_PATHS } from './ProtectedRoute';
import LiveClock from './LiveClock';

const drawerWidth = 260;

const NAV_ITEMS = [
  { to: '/', key: 'dashboard', icon: DashboardIcon, permission: 'DASHBOARD_VIEW' },
  { to: '/products', key: 'products', icon: InventoryIcon, permission: 'PRODUCT_VIEW' },
  { to: '/catalog', key: 'catalog', icon: CategoryIcon, permission: 'PRODUCT_VIEW' },
  { to: '/stock', key: 'stock', icon: WarehouseIcon, permission: 'STOCK_VIEW' },
  { to: '/damaged', key: 'damaged', icon: BrokenImageIcon, permission: 'STOCK_VIEW' },
  { to: '/my-van', key: 'myVan', icon: LocalShippingIcon, permission: 'SALES_INVOICE_CREATE', vanOnly: true },
  { to: '/vans', key: 'vans', icon: LocalShippingIcon, permission: 'VAN_VIEW' },
  { to: '/branches', key: 'branches', icon: StoreIcon, permission: 'WAREHOUSE_MANAGE' },
  { to: '/purchase-invoices', key: 'purchaseInvoices', icon: ShoppingCartIcon, permission: 'PURCHASE_INVOICE_VIEW' },
  { to: '/purchase-quotes', key: 'purchaseQuotes', icon: RequestQuoteIcon, permission: 'PURCHASE_INVOICE_VIEW' },
  { to: '/sales-invoices', key: 'salesInvoices', icon: ReceiptIcon, permission: 'SALES_INVOICE_VIEW' },
  { to: '/sales-quotes', key: 'salesQuotes', icon: RequestQuoteIcon, permission: 'SALES_INVOICE_VIEW' },
  { to: '/parties', key: 'parties', icon: PeopleIcon, permission: 'CUSTOMER_MANAGE' },
  { to: '/users', key: 'users', icon: BadgeIcon, permission: 'USER_MANAGE' },
  { to: '/roles', key: 'roles', icon: SecurityIcon, permission: 'ROLE_MANAGE' },
  { to: '/notifications', key: 'notifications', icon: NotificationsIcon, permission: 'NOTIFICATION_VIEW' },
  { to: '/reports', key: 'reports', icon: AssessmentIcon, permission: 'REPORTS_VIEW' },
  { to: '/balances', key: 'balances', icon: AccountBalanceWalletIcon, permission: 'REPORTS_VIEW' },
  { to: '/expenses', key: 'expenses', icon: MoneyOffIcon, permission: 'EXPENSE_VIEW' },
  { to: '/employees', key: 'employees', icon: BadgeIcon, permission: 'EMPLOYEE_VIEW' },
  { to: '/accounts', key: 'accounts', icon: AccountBalanceIcon, permission: 'ACCOUNTS_VIEW' },
  { to: '/checks', key: 'checks', icon: RequestPageIcon, permission: 'CHECKS_VIEW' },
  { to: '/stocktake', key: 'stocktake', icon: FactCheckIcon, permission: 'STOCKTAKE_VIEW' },
  { to: '/fixed-assets', key: 'fixedAssets', icon: PrecisionManufacturingIcon, permission: 'FIXED_ASSETS_VIEW' },
  { to: '/fiscal-closing', key: 'fiscalClosing', icon: LockOutlinedIcon, permission: 'FISCAL_CLOSING_VIEW' },
  { to: '/company-settings', key: 'companySettings', icon: BusinessIcon, permission: 'ROLE_MANAGE' },
  { to: '/audit-logs', key: 'auditLogs', icon: HistoryIcon, permission: 'ROLE_MANAGE' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout, hasPermission, vanMode } = useAuth();
  const location = useLocation();
  const isSmall = useMediaQuery('(max-width:900px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [unread, setUnread] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');

  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  function openChangePassword() {
    setAnchorEl(null);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setPwdError(''); setPwdSuccess('');
    setPwdOpen(true);
  }

  async function submitChangePassword() {
    setPwdError(''); setPwdSuccess('');
    if (newPassword.length < 6) { setPwdError(t('auth.passwordTooShort')); return; }
    if (newPassword !== confirmPassword) { setPwdError(t('auth.passwordMismatch')); return; }
    setPwdSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwdSuccess(t('common.success'));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) {
      setPwdError(e.response?.data?.message || t('common.error'));
    } finally {
      setPwdSaving(false);
    }
  }

  useEffect(() => {
    publicApi.companyInfo()
      .then(({ data }) => {
        setCompanyName(i18n.language === 'ar' ? data.name : data.nameEn);
        setCompanyLogo(data.logo || '');
      })
      .catch(() => {});
  }, [i18n.language]);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const { data } = await notificationApi.unreadCount();
        if (active) setUnread(data.count || 0);
      } catch (_) { /* ignore */ }
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [location.pathname]);

  const visibleItems = vanMode
    ? NAV_ITEMS.filter((item) => VAN_MODE_PATHS.includes(item.to))
    : NAV_ITEMS.filter((item) => hasPermission(item.permission) && !item.vanOnly);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ py: 1.5, minHeight: 'auto !important', gap: 1.25 }}>
        {companyLogo && (
          <Box component="img" src={companyLogo} alt="" sx={{ width: 40, height: 40, borderRadius: 1.25, flexShrink: 0 }} />
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.3 }}>
          {companyName || t('app.title')}
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, overflowY: 'auto' }}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const selected = location.pathname === item.to;
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={selected}
              onClick={() => isSmall && setMobileOpen(false)}
              sx={{ mx: 1, borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon color={selected ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText primary={t(`nav.${item.key}`)} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        className="app-no-print"
        sx={{
          borderBottom: '1px solid #e2e8f0',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ms: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" sx={{ display: { md: 'none' } }} onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />

          <LiveClock />

          <IconButton component={RouterLink} to="/notifications">
            <Badge badgeContent={unread} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
              {(user?.fullName || '?').charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.fullName}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={openChangePassword}>
              <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>
              {t('auth.changePassword')}
            </MenuItem>
            <MenuItem onClick={logout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Dialog open={pwdOpen} onClose={() => setPwdOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('auth.changePassword')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {pwdError && <Alert severity="error">{pwdError}</Alert>}
          {pwdSuccess && <Alert severity="success">{pwdSuccess}</Alert>}
          <TextField type="password" label={t('auth.currentPassword')} value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus />
          <TextField type="password" label={t('auth.newPassword')} value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required />
          <TextField type="password" label={t('auth.confirmPassword')} value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwdOpen(false)}>{t('common.close')}</Button>
          <Button variant="contained" onClick={submitChangePassword} disabled={pwdSaving || !currentPassword || !newPassword}>
            {pwdSaving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Box component="nav" className="app-no-print" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, border: 'none', borderInlineEnd: '1px solid #e2e8f0' } }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
