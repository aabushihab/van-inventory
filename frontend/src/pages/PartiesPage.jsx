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

  // العملاء: سقف الدين + المستحق الحالي (يُرفض البيع الآجل فوق السقف)
  const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
  const customerFields = [
    ...fields.slice(0, 5),
    { key: 'creditLimit', label: t('parties.creditLimit'), type: 'number' },
    { key: 'idType', label: t('einv.idType'), type: 'select', options: [
      { value: '', label: t('einv.none') },
      { value: 'NIN', label: t('einv.idNIN') },
      { value: 'PN', label: t('einv.idPN') },
      { value: 'TN', label: t('einv.idTN') },
    ] },
    { key: 'idNumber', label: t('einv.idNumber') },
    { key: 'cityCode', label: t('einv.city'), type: 'select', options: [
      { value: '', label: t('einv.none') },
      ...['JO-AM', 'JO-AZ', 'JO-IR', 'JO-BA', 'JO-MA', 'JO-KA', 'JO-JA', 'JO-AJ', 'JO-MD', 'JO-AT', 'JO-MN', 'JO-AQ']
        .map((c) => ({ value: c, label: t(`einv.cities.${c}`) })),
    ] },
    { key: 'postalCode', label: t('einv.postalCode') },
    fields[5],
  ];
  const customerColumns = [
    ...columns.slice(0, 3),
    { key: 'balance', label: t('parties.balance'), render: (row) => fmtMoney(row.balance) },
    {
      key: 'creditLimit', label: t('parties.creditLimit'),
      render: (row) => {
        if (row.creditLimit == null) return t('parties.noLimit');
        const over = Number(row.balance || 0) >= Number(row.creditLimit);
        return <Box component="span" sx={{ color: over ? 'error.main' : 'inherit', fontWeight: over ? 700 : 400 }}>{fmtMoney(row.creditLimit)}</Box>;
      },
    },
    columns[3],
  ];
  const customerApiWithLimit = {
    ...customerApi,
    create: (data) => customerApi.create({ ...data, creditLimit: data.creditLimit === '' || data.creditLimit == null ? null : Number(data.creditLimit) }),
    update: (id, data) => customerApi.update(id, { ...data, creditLimit: data.creditLimit === '' || data.creditLimit == null ? null : Number(data.creditLimit) }),
  };

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
          emptyModel={{ ...emptyModel, creditLimit: '', idType: '', idNumber: '', cityCode: '', postalCode: '' }}
          columns={customerColumns}
          fields={customerFields}
          api={customerApiWithLimit}
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
