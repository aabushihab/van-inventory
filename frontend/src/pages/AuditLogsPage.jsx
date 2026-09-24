import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem, Alert, CircularProgress, TablePagination, Chip, Button,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepOutlined';
import { useTranslation } from 'react-i18next';
import { auditLogApi } from '../api/endpoints';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'CONFIRM', 'RETURN', 'COMPENSATE', 'PAYMENT', 'LOGIN', 'PASSWORD_CHANGE', 'RESET_PASSWORD'];

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purging, setPurging] = useState(false);

  const [entityTypes, setEntityTypes] = useState([]);
  const [filterQ, setFilterQ] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  async function load(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await auditLogApi.search({
        page: overrides.page ?? page, size,
        q: (overrides.q ?? filterQ) || undefined,
        action: (overrides.action ?? filterAction) || undefined,
        entityType: (overrides.entityType ?? filterEntityType) || undefined,
        from: (overrides.from ?? filterFrom) || undefined,
        to: (overrides.to ?? filterTo) || undefined,
      });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() { setPage(0); load({ page: 0 }); }
  function clearFilters() {
    setFilterQ(''); setFilterAction(''); setFilterEntityType(''); setFilterFrom(''); setFilterTo('');
    setPage(0);
    load({ page: 0, q: '', action: '', entityType: '', from: '', to: '' });
  }

  useEffect(() => { load(); }, [page, size]);
  useEffect(() => { auditLogApi.entityTypes().then(({ data }) => setEntityTypes(data)); }, []);

  async function purgeNow() {
    if (!window.confirm(t('auditLog.purgeConfirm'))) return;
    setPurging(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await auditLogApi.purge(30);
      setSuccess(t('auditLog.purged', { count: data.deleted }));
      setPage(0);
      await load({ page: 0 });
      auditLogApi.entityTypes().then(({ data }) => setEntityTypes(data));
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setPurging(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
        <Typography variant="h5" fontWeight={800}>{t('auditLog.title')}</Typography>
        <Button size="small" variant="outlined" color="error" startIcon={<DeleteSweepIcon />} onClick={purgeNow} disabled={purging}>
          {purging ? <CircularProgress size={16} /> : t('auditLog.purgeNow')}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {t('auditLog.retentionNote')}
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" label={t('common.search')} value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)} sx={{ minWidth: 200 }} />
        <TextField select size="small" label={t('auditLog.action')} value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">{t('auditLog.allActions')}</MenuItem>
          {ACTIONS.map((a) => <MenuItem key={a} value={a}>{t(`auditLog.${a}`)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('auditLog.entityType')} value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">{t('auditLog.allEntityTypes')}</MenuItem>
          {entityTypes.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label={t('reports.from')} value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label={t('reports.to')} value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={t('common.search')} color="primary" onClick={applyFilters} clickable />
          <Chip label={t('common.clear')} onClick={clearFilters} clickable variant="outlined" />
        </Box>
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
                <TableCell>{t('auditLog.date')}</TableCell>
                <TableCell>{t('auditLog.user')}</TableCell>
                <TableCell>{t('auditLog.action')}</TableCell>
                <TableCell>{t('auditLog.entityType')}</TableCell>
                <TableCell>{t('auditLog.path')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.username}</TableCell>
                  <TableCell><Chip size="small" label={t(`auditLog.${r.action}`, r.action)} /></TableCell>
                  <TableCell>{r.entityType}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.httpMethod} {r.path}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size} onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]} />
      </Paper>
    </Box>
  );
}
