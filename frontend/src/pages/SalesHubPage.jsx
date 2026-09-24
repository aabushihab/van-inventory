import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import RequestQuoteIcon from '@mui/icons-material/RequestQuoteOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import TabbedHub from '../components/TabbedHub';
import SalesInvoicesPage from './SalesInvoicesPage';
import SalesQuotesPage from './SalesQuotesPage';

/** المبيعات: فواتير البيع وعروض أسعار البيع في شاشة واحدة. المندوب يرى الفواتير فقط. */
export default function SalesHubPage() {
  const { t } = useTranslation();
  const { vanMode } = useAuth();
  const tabs = [
    { key: 'invoices', label: t('nav.salesInvoices'), icon: <ReceiptIcon />, element: <SalesInvoicesPage /> },
  ];
  if (!vanMode) {
    tabs.push({ key: 'quotes', label: t('nav.salesQuotes'), icon: <RequestQuoteIcon />, element: <SalesQuotesPage /> });
  }
  return <TabbedHub tabs={tabs} />;
}
