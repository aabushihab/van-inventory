import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, TablePagination, Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { damagedApi, warehouseApi, productApi, stockApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const emptyForm = { productId: '', warehouseId: '', quantity: '', reason: '' };

export default function DamagedGoodsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [warehouseStock, setWarehouseStock] = useState([]);

  const [compensateOpen, setCompensateOpen] = useState(false);
  const [compensateRow, setCompensateRow] = useState(null);
  const [compensateQty, setCompensateQty] = useState('');
  const [compensateNote, setCompensateNote] = useState('');

  useEffect(() => {
    warehouseApi.list().then(({ data }) => setWarehouses(data));
    productApi.search({ size: 500 }).then(({ data }) => setProducts(data.content));
  }, []);

  useEffect(() => {
    if (!form.warehouseId) { setWarehouseStock([]); return; }
    stockApi.byWarehouse(form.warehouseId).then(({ data }) => setWarehouseStock(data));
  }, [form.warehouseId]);

  const availableQty = useMemo(() => {
    const item = warehouseStock.find((s) => s.productId === form.productId);
    return item ? Number(item.quantity) : null;
  }, [warehouseStock, form.productId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await damagedApi.list({ page, size });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, size]);

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await damagedApi.create({ ...form, quantity: Number(form.quantity) });
      setOpen(false);
      setPage(0);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function openCompensate(row) {
    setCompensateRow(row);
    setCompensateQty('');
    setCompensateNote('');
    setError('');
    setCompensateOpen(true);
  }

  async function submitCompensate() {
    setSaving(true);
    setError('');
    try {
      await damagedApi.compensate(compensateRow.id, { quantity: Number(compensateQty), note: compensateNote });
      setCompensateOpen(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  const totalLoss = rows.reduce((sum, r) => sum + Number(r.lostValue || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('damaged.title')}</Typography>
        {hasPermission('STOCK_ADJUST') && (
          <Button variant="contained" onClick={openCreate}>{t('damaged.add')}</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.createdAt')}</TableCell>
                <TableCell>{t('common.sku')}</TableCell>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('common.warehouse')}</TableCell>
                <TableCell>{t('damaged.originalQuantity')}</TableCell>
                <TableCell>{t('damaged.compensated')}</TableCell>
                <TableCell>{t('common.quantity')}</TableCell>
                <TableCell>{t('damaged.unitCost')}</TableCell>
                <TableCell>{t('damaged.lostValue')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('damaged.reason')}</TableCell>
                <TableCell>{t('users.fullName')}</TableCell>
                {hasPermission('STOCK_ADJUST') && <TableCell align="center">{t('common.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover sx={r.status === 'COMPENSATED' ? { opacity: 0.6 } : undefined}>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.sku}</TableCell>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell>{r.warehouseName}</TableCell>
                  <TableCell>
                    {Number(r.originalQuantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell sx={{ color: Number(r.compensatedQuantity) > 0 ? 'success.main' : 'text.secondary' }}>
                    {Number(r.compensatedQuantity || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>
                    {Number(r.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell>{Number(r.unitCost).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>
                    {Number(r.lostValue).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell>
                    {r.status === 'COMPENSATED'
                      ? <Chip size="small" label={t('damaged.cancelled')} />
                      : <Chip size="small" color="warning" label={t('damaged.active')} />}
                  </TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>{r.createdByName || '-'}</TableCell>
                  {hasPermission('STOCK_ADJUST') && (
                    <TableCell align="center">
                      {r.status !== 'COMPENSATED' && (
                        <Button size="small" onClick={() => openCompensate(r)}>{t('damaged.compensate')}</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, borderTop: rows.length ? '1px solid #e2e8f0' : 'none' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {rows.length > 0 && `${t('damaged.totalLoss')}: ${totalLoss.toLocaleString(undefined, { maximumFractionDigits: 3 })}`}
          </Typography>
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={size}
            onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('damaged.add')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField select label={t('common.warehouse')} required value={form.warehouseId}
            onChange={(e) => setForm({ ...form, warehouseId: e.target.value, productId: '' })}>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField select label={t('products.title')} required value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name} ({p.sku})</MenuItem>)}
          </TextField>
          <TextField type="number" label={t('common.quantity')} required value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            error={availableQty !== null && Number(form.quantity) > availableQty}
            inputProps={{ min: 0, max: availableQty ?? undefined, step: 'any' }}
            helperText={availableQty !== null
              ? `${t('damaged.available')}: ${availableQty.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
              : t('damaged.confirmHint')} />
          <TextField label={t('damaged.reason')} required value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submit}
            disabled={saving || (availableQty !== null && Number(form.quantity) > availableQty)}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={compensateOpen} onClose={() => setCompensateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('damaged.compensate')} — {compensateRow?.productName}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField type="number" label={t('common.quantity')} required value={compensateQty}
            onChange={(e) => setCompensateQty(e.target.value)}
            inputProps={{ min: 0, max: compensateRow?.quantity, step: 'any' }}
            helperText={compensateRow
              ? `${t('damaged.remaining')}: ${Number(compensateRow.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}`
              : ''} />
          <TextField label={t('common.notes')} value={compensateNote} onChange={(e) => setCompensateNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompensateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitCompensate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('damaged.compensate')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
