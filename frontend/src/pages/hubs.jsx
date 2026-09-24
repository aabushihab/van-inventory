import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import BrokenImageIcon from '@mui/icons-material/BrokenImageOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import RequestPageIcon from '@mui/icons-material/RequestPageOutlined';
import MoneyOffIcon from '@mui/icons-material/MoneyOffOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import StoreIcon from '@mui/icons-material/StorefrontOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import SecurityIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActiveOutlined';
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
import { useTranslation } from 'react-i18next';
import TabbedHub from '../components/TabbedHub';
import ProductsPage from './ProductsPage';
import CatalogPage from './CatalogPage';
import StockPage from './StockPage';
import DamagedGoodsPage from './DamagedGoodsPage';
import StocktakePage from './StocktakePage';
import AccountsPage from './AccountsPage';
import ChecksPage from './ChecksPage';
import ExpensesPage from './ExpensesPage';
import BalancesPage from './BalancesPage';
import FixedAssetsPage from './FixedAssetsPage';
import FiscalClosingPage from './FiscalClosingPage';
import CompanySettingsPage from './CompanySettingsPage';
import BranchesPage from './BranchesPage';
import UsersPage from './UsersPage';
import RolesPage from './RolesPage';
import AuditLogsPage from './AuditLogsPage';
import AlertSettingsPage from './AlertSettingsPage';
import SalesSettingsPage from './SalesSettingsPage';

/*
 * الشاشات المجمّعة: كل شاشة تضم صفحات مترابطة كتبويبات، وكل تبويب يظهر حسب صلاحية المستخدم.
 * (روابط الصفحات القديمة تُحوَّل لتبويبها في App.jsx)
 */

/** المنتجات: المنتجات + التصنيفات والوحدات. */
export function ProductsHub() {
  const { t } = useTranslation();
  return (
    <TabbedHub tabs={[
      { key: 'products', label: t('nav.products'), icon: <InventoryIcon />, element: <ProductsPage />, permission: 'PRODUCT_VIEW' },
      { key: 'catalog', label: t('nav.catalog'), icon: <CategoryIcon />, element: <CatalogPage />, permission: 'PRODUCT_VIEW' },
    ]} />
  );
}

/** المخزون: الأرصدة والحركات + التوالف + الجرد. */
export function StockHub() {
  const { t } = useTranslation();
  return (
    <TabbedHub tabs={[
      { key: 'stock', label: t('nav.stock'), icon: <WarehouseIcon />, element: <StockPage />, permission: 'STOCK_VIEW' },
      { key: 'damaged', label: t('nav.damaged'), icon: <BrokenImageIcon />, element: <DamagedGoodsPage />, permission: 'STOCK_VIEW' },
      { key: 'stocktake', label: t('nav.stocktake'), icon: <FactCheckIcon />, element: <StocktakePage />, permission: 'STOCKTAKE_VIEW' },
    ]} />
  );
}

/** المالية: الحسابات والشيكات والمصاريف والذمم والأصول الثابتة وإقفال الفترات. */
export function FinanceHub() {
  const { t } = useTranslation();
  return (
    <TabbedHub tabs={[
      { key: 'accounts', label: t('nav.accounts'), icon: <AccountBalanceIcon />, element: <AccountsPage />, permission: 'ACCOUNTS_VIEW' },
      { key: 'checks', label: t('nav.checks'), icon: <RequestPageIcon />, element: <ChecksPage />, permission: 'CHECKS_VIEW' },
      { key: 'expenses', label: t('nav.expenses'), icon: <MoneyOffIcon />, element: <ExpensesPage />, permission: 'EXPENSE_VIEW' },
      { key: 'balances', label: t('nav.balances'), icon: <AccountBalanceWalletIcon />, element: <BalancesPage />, permission: 'REPORTS_VIEW' },
      { key: 'fixed-assets', label: t('nav.fixedAssets'), icon: <PrecisionManufacturingIcon />, element: <FixedAssetsPage />, permission: 'FIXED_ASSETS_VIEW' },
      { key: 'fiscal-closing', label: t('nav.fiscalClosing'), icon: <LockOutlinedIcon />, element: <FiscalClosingPage />, permission: 'FISCAL_CLOSING_VIEW' },
    ]} />
  );
}

/** الإعدادات: بيانات الشركة والفروع والمخازن والمستخدمون والأدوار وسجل التدقيق. */
export function SettingsHub() {
  const { t } = useTranslation();
  return (
    <TabbedHub tabs={[
      { key: 'company', label: t('nav.companySettings'), icon: <BusinessIcon />, element: <CompanySettingsPage />, permission: 'ROLE_MANAGE' },
      { key: 'branches', label: t('nav.branches'), icon: <StoreIcon />, element: <BranchesPage />, permission: 'WAREHOUSE_MANAGE' },
      { key: 'users', label: t('nav.users'), icon: <BadgeIcon />, element: <UsersPage />, permission: 'USER_MANAGE' },
      { key: 'roles', label: t('nav.roles'), icon: <SecurityIcon />, element: <RolesPage />, permission: 'ROLE_MANAGE' },
      { key: 'sales', label: t('salesSettings.title'), icon: <PointOfSaleIcon />, element: <SalesSettingsPage />, permission: 'ROLE_MANAGE' },
      { key: 'alerts', label: t('alertSettings.title'), icon: <NotificationsActiveIcon />, element: <AlertSettingsPage />, permission: 'ROLE_MANAGE' },
      { key: 'audit', label: t('nav.auditLogs'), icon: <HistoryIcon />, element: <AuditLogsPage />, permission: 'ROLE_MANAGE' },
    ]} />
  );
}

/** صلاحيات تكفي لرؤية كل شاشة مجمّعة في القائمة الجانبية (يكفي واحدة منها). */
export const HUB_PERMISSIONS = {
  stock: ['STOCK_VIEW', 'STOCKTAKE_VIEW'],
  finance: ['ACCOUNTS_VIEW', 'CHECKS_VIEW', 'EXPENSE_VIEW', 'REPORTS_VIEW', 'FIXED_ASSETS_VIEW', 'FISCAL_CLOSING_VIEW'],
  settings: ['ROLE_MANAGE', 'WAREHOUSE_MANAGE', 'USER_MANAGE'],
};
