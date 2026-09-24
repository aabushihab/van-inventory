import { useState } from 'react';
import { Box, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CrudPage from '../components/CrudPage';
import { customerApi, supplierApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function PartiesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const fields = [
    { key: 'name', label: t('common.name'), required: true },
    { key: 'phone', label: t('common.phone') },
    { key: 'email', label: t('common.email') },
    { key: 'address', label: t('common.address') },
    { key: 'taxNumber', label: 'Tax No.' },
    { key: 'active', label: t('common.active'), type: 'boolean' },
  ];

  const columns = [
    { key: 'name', label: t('common.name') },
    { key: 'phone', label: t('common.phone') },
    { key: 'email', label: t('common.email') },
    { key: 'active', label: t('common.status') },
  ];

  const emptyModel = { name: '', phone: '', email: '', address: '', taxNumber: '', active: true };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('nav.parties').split(' ')[0]} />
        <Tab label={t('invoice.supplier')} />
      </Tabs>

      {tab === 0 && (
        <CrudPage
          title={t('invoice.customer')}
          canManage={hasPermission('CUSTOMER_MANAGE')}
          emptyModel={emptyModel}
          columns={columns}
          fields={fields}
          api={customerApi}
          paginated
          searchPlaceholder={t('parties.searchByNameOrPhone')}
          extraRowActions={hasPermission('SALES_INVOICE_CREATE') ? (row) => (
            <Tooltip title={t('parties.newSalesInvoice')}>
              <IconButton size="small" color="primary"
                onClick={() => navigate('/sales-invoices', { state: { prefillCustomerId: row.id } })}>
                <ReceiptLongOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined}
        />
      )}
      {tab === 1 && (
        <CrudPage
          title={t('invoice.supplier')}
          canManage={hasPermission('SUPPLIER_MANAGE')}
          emptyModel={emptyModel}
          columns={columns}
          fields={fields}
          api={supplierApi}
          paginated
          searchPlaceholder={t('parties.searchByNameOrPhone')}
          extraRowActions={hasPermission('PURCHASE_INVOICE_CREATE') ? (row) => (
            <Tooltip title={t('parties.newPurchaseInvoice')}>
              <IconButton size="small" color="primary"
                onClick={() => navigate('/purchase-invoices', { state: { prefillSupplierId: row.id } })}>
                <ReceiptLongOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined}
        />
      )}
    </Box>
  );
}
