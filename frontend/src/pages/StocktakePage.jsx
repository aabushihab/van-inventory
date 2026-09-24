import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Tooltip, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, CircularProgress, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'react-i18next';
import { stocktakeApi, warehouseApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import PageGuide from '../components/PageGuide';

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export default function StocktakePage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('STOCKTAKE_MANAGE');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouses, setWarehouses] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createWarehouseId, setCreateWarehouseId] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const [session, setSession] = useState(null);
  const [counts, setCounts] = useState({});
  const [sessionError, setSessionError] = useState('');
  const [savingCounts, setSavingCounts] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await stocktakeApi.list();
      setRows(data);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { warehouseApi.list().then(({ data }) => setWarehouses(data)); }, []);

  function openCreate() {
    setCreateWarehouseId(warehouses[0]?.id || '');
    setCreateNotes('');
    setCreateError('');
    setCreateOpen(true);
  }

  async function saveCreate() {
    setSaving(true);
    setCreateError('');
    try {
      const { data } = await stocktakeApi.create({ warehouseId: createWarehouseId, notes: createNotes || null });
      setCreateOpen(false);
      await load();
      openSession(data);
    } catch (e) {
      setCreateError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function openSession(row) {
    setSessionError('');
    try {
      const { data } = await stocktakeApi.get(row.id);
      setSession(data);
      setCounts(Object.fromEntries(data.lines.map((l) => [l.productId, l.countedQuantity ?? ''])));
    } catch (e) {
      setSessionError(getErrorMessage(e, t('common.error')));
    }
  }

  function closeSession() {
    setSession(null);
    setCounts({});
  }

  async function saveCounts() {
    setSavingCounts(true);
    setSessionError('');
    try {
      const lines = Object.entries(counts)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([productId, countedQuantity]) => ({ productId, countedQuantity: Number(countedQuantity) }));
      if (lines.length === 0) { setSavingCounts(false); return; }
      const { data } = await stocktakeApi.updateCounts(session.id, { lines });
      setSession(data);
    } catch (e) {
      setSessionError(getErrorMessage(e, t('common.error')));
    } finally {
      setSavingCounts(false);
    }
  }

  async function completeSession() {
    if (!window.confirm(t('stocktake.confirmComplete'))) return;
    setCompleting(true);
    setSessionError('');
    try {
      await saveCounts();
      const { data } = await stocktakeApi.complete(session.id);
      setSession(data);
      await load();
    } catch (e) {
      setSessionError(getErrorMessage(e, t('common.error')));
    } finally {
      setCompleting(false);
    }
  }

  const isDraft = session?.status === 'DRAFT';

  return (
    <Box>
      <PageGuide
        warning={t('pageGuide.stocktake.warning')}
        points={t('pageGuide.stocktake.points', { returnObjects: true })}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('stocktake.title')}</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('stocktake.newSession')}</Button>
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
                <TableCell>{t('stocktake.sessionDate')}</TableCell>
                <TableCell>{t('common.warehouse')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.notes')}</TableCell>
                <TableCell>{t('expenses.recordedBy')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.sessionDate}</TableCell>
                  <TableCell>{row.warehouseName}</TableCell>
                  <TableCell>
                    <Chip size="small" color={row.status === 'COMPLETED' ? 'success' : 'warning'}
                      label={row.status === 'COMPLETED' ? t('stocktake.completed') : t('stocktake.draft')} />
                  </TableCell>
                  <TableCell>{row.notes || '-'}</TableCell>
                  <TableCell>{row.createdByName || '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => openSession(row)}><VisibilityIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('stocktake.newSession')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {createError && <Alert severity="error">{createError}</Alert>}
          <TextField
            select label={t('common.warehouse')} required value={createWarehouseId}
            onChange={(e) => setCreateWarehouseId(e.target.value)}
          >
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField
            label={t('common.notes')} multiline minRows={2} value={createNotes}
            onChange={(e) => setCreateNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveCreate} disabled={saving || !createWarehouseId}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!session} onClose={closeSession} maxWidth="md" fullWidth>
        <DialogTitle>
          {session?.warehouseName} — {session?.sessionDate}
          {session?.status === 'COMPLETED' && <Chip size="small" color="success" sx={{ ms: 1 }} label={t('stocktake.completed')} />}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {sessionError && <Alert severity="error">{sessionError}</Alert>}
          {session && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.sku')}</TableCell>
                  <TableCell>{t('common.name')}</TableCell>
                  <TableCell>{t('stocktake.systemQuantity')}</TableCell>
                  <TableCell>{t('stocktake.countedQuantity')}</TableCell>
                  <TableCell>{t('stocktake.variance')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {session.lines.map((line) => {
                  const counted = counts[line.productId];
                  const variance = counted !== '' && counted !== null && counted !== undefined
                    ? Number(counted) - Number(line.systemQuantity) : line.variance;
                  return (
                    <TableRow key={line.id} hover>
                      <TableCell>{line.sku}</TableCell>
                      <TableCell>{line.productName}</TableCell>
                      <TableCell>{fmt(line.systemQuantity)}</TableCell>
                      <TableCell>
                        {isDraft && canManage ? (
                          <TextField
                            size="small" type="number" value={counts[line.productId] ?? ''}
                            onChange={(e) => setCounts({ ...counts, [line.productId]: e.target.value })}
                            sx={{ width: 100 }}
                          />
                        ) : fmt(line.countedQuantity)}
                      </TableCell>
                      <TableCell sx={{ color: variance > 0 ? 'success.main' : variance < 0 ? 'error.main' : 'inherit', fontWeight: 700 }}>
                        {variance !== null && variance !== undefined ? fmt(variance) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSession}>{t('common.close')}</Button>
          {isDraft && canManage && (
            <>
              <Button onClick={saveCounts} disabled={savingCounts}>
                {savingCounts ? <CircularProgress size={18} /> : t('stocktake.saveCounts')}
              </Button>
              <Button variant="contained" color="warning" onClick={completeSession} disabled={completing}>
                {completing ? <CircularProgress size={20} /> : t('stocktake.complete')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
