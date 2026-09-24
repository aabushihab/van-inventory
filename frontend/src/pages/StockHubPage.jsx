import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import BrokenImageIcon from '@mui/icons-material/BrokenImageOutlined';
import { useTranslation } from 'react-i18next';
import TabbedHub from '../components/TabbedHub';
import StockPage from './StockPage';
import DamagedGoodsPage from './DamagedGoodsPage';

/** المخزون والتوالف في شاشة واحدة. */
export default function StockHubPage() {
  const { t } = useTranslation();
  return (
    <TabbedHub tabs={[
      { key: 'stock', label: t('nav.stock'), icon: <WarehouseIcon />, element: <StockPage /> },
      { key: 'damaged', label: t('nav.damaged'), icon: <BrokenImageIcon />, element: <DamagedGoodsPage /> },
    ]} />
  );
}
