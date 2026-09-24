import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from 'react-i18next';
import { loadRequestApi, warehouseApi, stockApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import PageGuide from '../components/PageGuide';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
const STATUS_COLORS = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

/** طلبات التحميل من السائقين: الموافقة (تتحول لسند تحميل بعد تعديل الكميات إن لزم) أو الرفض. */
export default function LoadRequestsPage({ onChanged }) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canDecide = hasPermission('VAN_LOAD');
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouses, setWarehouses] = useState([]);

  const [approveRow, setApproveRow] = useState(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState([]);
  const [stock, setStock] = useState({});
  const [note, setNote] = useState('');
  const [rejectRow, setRejectRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await loadRequestApi.list(status);
      setRows(data);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);
  useEffect(() => {
    warehouseApi.list().then(({ data }) => {
      const mains = data.filter((w) => w.warehouseType !== 'VAN' && w.active);
      setWarehouses(mains);
      setWarehouseId((mains.find((w) => w.isDefault) || mains[0])?.id || '');
    });
  }, []);
  useEffect(() => {
    if (!warehouseId || !approveRow) return;
    stockApi.byWarehouse(warehouseId).then(({ data }) => setStock(Object.fromEntries(data.map((s) => [s.productId, Number(s.quantity)]))));
  }, [warehouseId, approveRow]);

  function openApprove(r) {
    setApproveRow(r);
    setLines(r.items.map((it) => ({ productId: it.productId, productName: it.productName, unitName: it.unitName, requested: Number(it.quantity), quantity: String(Number(it.quantity)) })));
    setNote('');
    setDialogError('');
  }

  const overStock = (l) => Number(l.quantity || 0) > (stock[l.productId] ?? 0);

  async function submitApprove() {
    setSaving(true); setDialogError('');
    try {
      await loadRequestApi.approve(approveRow.id, {
        warehouseId, note,
        items: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      });
      setApproveRow(null);
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      setDialogError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function submitReject() {
    setSaving(true); setDialogError('');
    try {
      await loadRequestApi.reject(rejectRow.id, { note });
      setRejectRow(null);
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      setDialogError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{t('loadRequests.title')}</Typography>
      <PageGuide points={t('loadRequests.guide', { returnObjects: true })} />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TextField select size="small" label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)} sx={{ mb: 2, minWidth: 180 }}>
        <MenuItem value="">{t('shortages.allStatuses')}</MenuItem>
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => <MenuItem key={s} value={s}>{t(`loadRequests.status.${s}`)}</MenuItem>)}
      </TextField>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('loadRequests.none')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.createdAt')}</TableCell>
                <TableCell>{t('vanLoads.van')}</TableCell>
                <TableCell>{t('loadRequests.requestedBy')}</TableCell>
                <TableCell>{t('loadRequests.forDate')}</TableCell>
                <TableCell>{t('vanLoads.items')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('loadRequests.response')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.vanName} <Typography component="span" variant="caption" dir="ltr">({r.plateNumber})</Typography></TableCell>
                  <TableCell>{r.requestedByName || '-'}</TableCell>
                  <TableCell>{r.forDate}</TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>{r.items.map((it) => `${it.productName} × ${fmt(it.quantity)}`).join('، ')}</TableCell>
                  <TableCell><Chip size="small" color={STATUS_COLORS[r.status]} label={t(`loadRequests.status.${r.status}`)} /></TableCell>
                  <TableCell>{r.vanLoadNumber || r.responseNote || '-'}{r.notes ? <Typography variant="caption" display="block" color="text.secondary">{r.notes}</Typography> : null}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {canDecide && r.status === 'PENDING' && (
                      <>
                        <Button size="small" variant="contained" disableElevation onClick={() => openApprove(r)}>{t('loadRequests.approve')}</Button>
                        <Button size="small" color="error" onClick={() => { setRejectRow(r); setNote(''); setDialogError(''); }}>{t('loadRequests.reject')}</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* الموافقة: اختيار المخزن وتعديل الكميات ثم إنشاء سند التحميل */}
      <Dialog open={!!approveRow} onClose={() => setApproveRow(null)} fullWidth maxWidth="md">
        <DialogTitle>{t('loadRequests.approveTitle')} — {approveRow?.vanName}</DialogTitle>
        <DialogContent dividers>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField select fullWidth label={t('vanLoads.fromWarehouse')} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} sx={{ mb: 2 }}>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('vanLoads.product')}</TableCell>
                <TableCell>{t('loadRequests.requested')}</TableCell>
                <TableCell>{t('vanLoads.available')}</TableCell>
                <TableCell width={140}>{t('loadRequests.toLoad')}</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l, idx) => (
                <TableRow key={l.productId}>
                  <TableCell>{l.productName}</TableCell>
                  <TableCell>{fmt(l.requested)} {l.unitName}</TableCell>
                  <TableCell sx={{ color: overStock(l) ? 'error.main' : undefined }}>{fmt(stock[l.productId] ?? 0)}</TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={l.quantity} error={overStock(l)}
                      helperText={overStock(l) ? t('vanLoads.exceedsAvailable') : ''}
                      onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TextField fullWidth label={t('common.notes')} value={note} onChange={(e) => setNote(e.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveRow(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitApprove}
            disabled={saving || !warehouseId || !lines.some((l) => Number(l.quantity) > 0) || lines.some(overStock)}>
            {saving ? <CircularProgress size={20} /> : t('loadRequests.approveAndLoad')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!rejectRow} onClose={() => setRejectRow(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('loadRequests.reject')} — {rejectRow?.vanName}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField fullWidth multiline minRows={2} required label={t('loadRequests.rejectReason')} value={note} onChange={(e) => setNote(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectRow(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={submitReject} disabled={saving || !note.trim()}>{t('loadRequests.reject')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
