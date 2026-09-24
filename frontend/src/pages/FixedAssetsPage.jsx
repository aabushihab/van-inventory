import { useEffect, useState } from 'react';
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress, Chip,
} from '@mui/material';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import { useTranslation } from 'react-i18next';
import CrudPage from '../components/CrudPage';
import PageGuide from '../components/PageGuide';
import { fixedAssetApi, accountApi, branchApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FixedAssetsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('FIXED_ASSETS_MANAGE');

  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [disposeAsset, setDisposeAsset] = useState(null);
  const [disposeForm, setDisposeForm] = useState({ disposedDate: todayIso(), saleAmount: '', accountId: '', notes: '' });
  const [disposeSaving, setDisposeSaving] = useState(false);
  const [disposeError, setDisposeError] = useState('');

  useEffect(() => {
    accountApi.list().then(({ data }) => setAccounts(data)).catch(() => {});
    branchApi.list().then(({ data }) => setBranches(data)).catch(() => {});
  }, []);

  function openDispose(row) {
    setDisposeAsset(row);
    setDisposeForm({ disposedDate: todayIso(), saleAmount: '', accountId: '', notes: '' });
    setDisposeError('');
  }

  async function saveDispose() {
    setDisposeSaving(true);
    setDisposeError('');
    try {
      await fixedAssetApi.dispose(disposeAsset.id, {
        disposedDate: disposeForm.disposedDate,
        saleAmount: disposeForm.saleAmount === '' ? null : Number(disposeForm.saleAmount),
        accountId: disposeForm.accountId || null,
        notes: disposeForm.notes || null,
      });
      setDisposeAsset(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setDisposeError(getErrorMessage(e, t('common.error')));
    } finally {
      setDisposeSaving(false);
    }
  }

  return (
    <>
      <PageGuide points={t('pageGuide.fixedAssets.points', { returnObjects: true })} />
      <CrudPage
        key={refreshKey}
        title={t('fixedAssets.title')}
        canManage={canManage}
        emptyModel={{
          name: '', category: '', purchaseDate: todayIso(), purchaseCost: '', salvageValue: '0',
          usefulLifeMonths: '36', accountId: '', branchId: '', notes: '',
        }}
        columns={[
          { key: 'name', label: t('common.name') },
          { key: 'category', label: t('fixedAssets.category'), render: (row) => row.category || '-' },
          { key: 'purchaseDate', label: t('fixedAssets.purchaseDate') },
          { key: 'purchaseCost', label: t('fixedAssets.purchaseCost'), render: (row) => fmt(row.purchaseCost) },
          { key: 'accumulatedDepreciation', label: t('fixedAssets.accumulatedDepreciation'), render: (row) => fmt(row.accumulatedDepreciation) },
          { key: 'netBookValue', label: t('fixedAssets.netBookValue'), render: (row) => <b>{fmt(row.netBookValue)}</b> },
          {
            key: 'status', label: t('common.status'),
            render: (row) => (
              <Chip size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'}
                label={row.status === 'ACTIVE' ? t('fixedAssets.active') : t('fixedAssets.disposed')} />
            ),
          },
        ]}
        fields={[
          { key: 'name', label: t('common.name'), required: true },
          { key: 'category', label: t('fixedAssets.category') },
          { key: 'purchaseDate', label: t('fixedAssets.purchaseDate'), type: 'date', required: true },
          { key: 'purchaseCost', label: t('fixedAssets.purchaseCost'), type: 'number', required: true },
          { key: 'salvageValue', label: t('fixedAssets.salvageValue'), type: 'number' },
          { key: 'usefulLifeMonths', label: t('fixedAssets.usefulLifeMonths'), type: 'number', required: true },
          {
            key: 'accountId', label: t('fixedAssets.paidFromAccount'), type: 'select',
            options: [{ value: '', label: t('common.noParent') }, ...accounts.map((a) => ({ value: a.id, label: a.name }))],
          },
          {
            key: 'branchId', label: t('common.branch'), type: 'select',
            options: [{ value: '', label: t('common.noParent') }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
          },
          { key: 'notes', label: t('common.notes'), multiline: true },
        ]}
        api={{
          list: fixedAssetApi.list,
          create: (data) => fixedAssetApi.create({
            ...data,
            purchaseCost: Number(data.purchaseCost || 0),
            salvageValue: Number(data.salvageValue || 0),
            usefulLifeMonths: Number(data.usefulLifeMonths || 0),
            accountId: data.accountId || null,
            branchId: data.branchId || null,
          }),
          update: (id, data) => fixedAssetApi.update(id, {
            ...data,
            purchaseCost: Number(data.purchaseCost || 0),
            salvageValue: Number(data.salvageValue || 0),
            usefulLifeMonths: Number(data.usefulLifeMonths || 0),
            branchId: data.branchId || null,
          }),
          remove: fixedAssetApi.remove,
        }}
        extraRowActions={(row) => row.status === 'ACTIVE' && canManage && (
          <Tooltip title={t('fixedAssets.dispose')}>
            <IconButton size="small" color="warning" onClick={() => openDispose(row)}>
              <SellOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Dialog open={!!disposeAsset} onClose={() => setDisposeAsset(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('fixedAssets.dispose')} — {disposeAsset?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {disposeError && <Alert severity="error">{disposeError}</Alert>}
          <TextField
            type="date" label={t('fixedAssets.disposedDate')} required value={disposeForm.disposedDate}
            onChange={(e) => setDisposeForm({ ...disposeForm, disposedDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="number" label={t('fixedAssets.saleAmount')} value={disposeForm.saleAmount}
            onChange={(e) => setDisposeForm({ ...disposeForm, saleAmount: e.target.value })}
          />
          <TextField
            select label={t('accounts.account')} value={disposeForm.accountId}
            onChange={(e) => setDisposeForm({ ...disposeForm, accountId: e.target.value })}
          >
            <MenuItem value="">-</MenuItem>
            {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
          <TextField
            label={t('common.notes')} multiline minRows={2} value={disposeForm.notes}
            onChange={(e) => setDisposeForm({ ...disposeForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisposeAsset(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="warning" onClick={saveDispose} disabled={disposeSaving}>
            {disposeSaving ? <CircularProgress size={20} /> : t('fixedAssets.dispose')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
