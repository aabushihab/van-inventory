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
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import LockResetIcon from '@mui/icons-material/LockResetOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { notificationApi, publicApi, authApi } from '../api/endpoints';
import { VAN_MODE_PATHS } from './ProtectedRoute';
import { HUB_PERMISSIONS } from '../pages/hubs';
import LiveClock from './LiveClock';
import { alpha } from '@mui/material/styles';

const drawerWidth = 260;
const SIDEBAR_BG = 'linear-gradient(180deg, #0b1f4d 0%, #132f6b 60%, #0f3a5f 100%)';

/** القسم الحالي: المسار نفسه أو أي صفحة فرعية تحته (مثلاً /vans/...). */
function isActive(pathname, to) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

const NAV_ITEMS = [
  { to: '/', key: 'dashboard', color: '#3b82f6', icon: DashboardIcon, permission: 'DASHBOARD_VIEW' },
  { to: '/products', key: 'products', color: '#8b5cf6', icon: InventoryIcon, permission: 'PRODUCT_VIEW' },
  { to: '/stock', key: 'stockHub', color: '#0ea5e9', icon: WarehouseIcon, permission: HUB_PERMISSIONS.stock },
  { to: '/my-van', key: 'myVan', color: '#f59e0b', icon: LocalShippingIcon, permission: 'SALES_INVOICE_CREATE', vanOnly: true },
  { to: '/vans', key: 'vans', color: '#f59e0b', icon: LocalShippingIcon, permission: 'VAN_VIEW' },
  { to: '/purchase-invoices', key: 'purchases', color: '#ef4444', icon: ShoppingCartIcon, permission: 'PURCHASE_INVOICE_VIEW' },
  { to: '/sales-invoices', key: 'sales', color: '#10b981', icon: ReceiptIcon, permission: 'SALES_INVOICE_VIEW' },
  { to: '/parties', key: 'parties', color: '#ec4899', icon: PeopleIcon, permission: 'CUSTOMER_MANAGE' },
  { to: '/employees', key: 'employees', color: '#6366f1', icon: BadgeIcon, permission: 'EMPLOYEE_VIEW' },
  { to: '/finance', key: 'finance', color: '#14b8a6', icon: AccountBalanceIcon, permission: HUB_PERMISSIONS.finance },
  { to: '/reports', key: 'reports', color: '#f97316', icon: AssessmentIcon, permission: 'REPORTS_VIEW' },
  { to: '/settings', key: 'settings', color: '#94a3b8', icon: SettingsIcon, permission: HUB_PERMISSIONS.settings },
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
    : NAV_ITEMS.filter((item) => !item.vanOnly && [].concat(item.permission).some((p) => hasPermission(p)));

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: SIDEBAR_BG, color: '#e2e8f0' }}>
      <Toolbar sx={{ py: 2, minHeight: 'auto !important', gap: 1.25 }}>
        {companyLogo ? (
          <Box component="img" src={companyLogo} alt="" sx={{ width: 42, height: 42, borderRadius: 1.5, flexShrink: 0, bgcolor: '#fff' }} />
        ) : (
          <Box sx={{
            width: 42, height: 42, borderRadius: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', boxShadow: '0 8px 18px rgba(249,115,22,0.35)',
          }}>
            <LocalShippingIcon sx={{ color: '#fff' }} />
          </Box>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
          {companyName || t('app.title')}
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <List sx={{ flex: 1, overflowY: 'auto', py: 1.5,
        '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 3 } }}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const selected = isActive(location.pathname, item.to);
          const c = item.color;
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={selected}
              onClick={() => isSmall && setMobileOpen(false)}
              sx={{
                mx: 1.25, mb: 0.5, borderRadius: 2.5, py: 1, position: 'relative', color: 'rgba(226,232,240,0.85)',
                transition: 'all .22s ease',
                '& .nav-icon': {
                  width: 34, height: 34, borderRadius: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(c, 0.14), color: c, transition: 'all .22s ease',
                },
                '&:hover': {
                  bgcolor: alpha(c, 0.16), color: '#fff', paddingInlineStart: 2.5,
                  '& .nav-icon': { bgcolor: c, color: '#fff', transform: 'scale(1.08) rotate(-6deg)' },
                },
                '&.Mui-selected, &.Mui-selected:hover': {
                  background: `linear-gradient(135deg, ${c} 0%, ${alpha(c, 0.7)} 100%)`, color: '#fff',
                  boxShadow: `0 8px 20px ${alpha(c, 0.4)}`,
                  '& .nav-icon': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', transform: 'none' },
                },
                '&.Mui-selected::before': {
                  content: '""', position: 'absolute', insetInlineStart: -10, top: 10, bottom: 10, width: 4,
                  borderRadius: 4, bgcolor: '#fde68a',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 46 }}>
                <Box className="nav-icon"><Icon fontSize="small" /></Box>
              </ListItemIcon>
              <ListItemText primary={t(`nav.${item.key}`)}
                slotProps={{ primary: { sx: { fontWeight: selected ? 800 : 600, fontSize: 14.5 } } }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 2, pt: 1 }}>
        <Box sx={{
          p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 1.25,
        }}>
          <Avatar sx={{ width: 34, height: 34, fontSize: 14, background: 'linear-gradient(135deg, #0ea5a4, #1d4ed8)' }}>
            {(user?.fullName || '?').charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{user?.fullName}</Typography>
            <Typography noWrap sx={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>{user?.role}</Typography>
          </Box>
        </Box>
      </Box>
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
          borderBottom: '1px solid #e2e8f0', bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
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
            <Avatar sx={{ width: 34, height: 34, fontSize: 14, background: 'linear-gradient(135deg, #1d4ed8, #0ea5a4)' }}>
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
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, background: SIDEBAR_BG } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, border: 'none', background: SIDEBAR_BG } }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{
        flexGrow: 1, minWidth: 0, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh',
        bgcolor: 'background.default', overflowX: 'clip',
      }}>
        <Toolbar />
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
