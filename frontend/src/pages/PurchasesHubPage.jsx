import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import RequestQuoteIcon from '@mui/icons-material/RequestQuoteOutlined';
import { useTranslation } from 'react-i18next';
import TabbedHub from '../components/TabbedHub';
import PurchaseInvoicesPage from './PurchaseInvoicesPage';
import PurchaseQuotesPage from './PurchaseQuotesPage';

/** المشتريات: فواتير الشراء وعروض أسعار الشراء في شاشة واحدة. */
export default function PurchasesHubPage() {
  const { t } = useTranslation();
  return (
    <TabbedHub tabs={[
      { key: 'invoices', label: t('nav.purchaseInvoices'), icon: <ShoppingCartIcon />, element: <PurchaseInvoicesPage /> },
      { key: 'quotes', label: t('nav.purchaseQuotes'), icon: <RequestQuoteIcon />, element: <PurchaseQuotesPage /> },
    ]} />
  );
}
