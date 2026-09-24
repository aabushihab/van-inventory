import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';
import { fiscalClosingApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import PageGuide from '../components/PageGuide';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FiscalClosingPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('FISCAL_CLOSING_MANAGE');

  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ closingDate: todayIso(), notes: '' });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [latestRes, historyRes] = await Promise.all([fiscalClosingApi.latest(), fiscalClosingApi.list()]);
      setLatest(latestRes.data);
      setHistory(historyRes.data);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /** آخر يوم في الشهر السابق - الإقفال الطبيعي بعد انتهاء الشهر (إقفال اليوم يوقف حركات اليوم). */
  function lastMonthEndIso() {
    const d = new Date(); d.setDate(0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function undoClosing(h) {
    if (!window.confirm(t('fiscalClosing.confirmUndo', { date: h.closingDate }))) return;
    try {
      await fiscalClosingApi.undo(h.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  function openDialog() {
    setForm({ closingDate: lastMonthEndIso(), notes: '' });
    setDialogError('');
    setDialogOpen(true);
  }

  async function save() {
    if (!window.confirm(t('fiscalClosing.confirmClose', { date: form.closingDate }))) return;
    setSaving(true);
    setDialogError('');
    try {
      await fiscalClosingApi.close(form);
      setDialogOpen(false);
      await load();
    } catch (e) {
      setDialogError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <PageGuide
        warning={t('pageGuide.fiscalClosing.warning')}
        points={t('pageGuide.fiscalClosing.points', { returnObjects: true })}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('fiscalClosing.title')}</Typography>
        {canManage && (
          <Button variant="contained" color="warning" startIcon={<LockOutlinedIcon />} onClick={openDialog}>
            {t('fiscalClosing.closeNew')}
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        {latest ? (
          <Alert severity="warning" icon={<LockOutlinedIcon />}>
            {t('fiscalClosing.currentlyLockedUntil', { date: latest })}
          </Alert>
        ) : (
          <Alert severity="info">{t('fiscalClosing.noClosingYet')}</Alert>
        )}
      </Paper>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('fiscalClosing.history')}</Typography>
      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : history.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('fiscalClosing.closingDate')}</TableCell>
                <TableCell>{t('common.notes')}</TableCell>
                <TableCell>{t('expenses.recordedBy')}</TableCell>
                <TableCell>{t('fiscalClosing.closedAt')}</TableCell>
                {canManage && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((h, idx) => (
                <TableRow key={h.id} hover>
                  <TableCell>{h.closingDate}</TableCell>
                  <TableCell>{h.notes || '-'}</TableCell>
                  <TableCell>{h.closedByName || '-'}</TableCell>
                  <TableCell>{new Date(h.closedAt).toLocaleString()}</TableCell>
                  {canManage && (
                    <TableCell>
                      {idx === 0 && (
                        <Button size="small" color="error" onClick={() => undoClosing(h)}>{t('fiscalClosing.undo')}</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('fiscalClosing.closeNew')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <Alert severity="warning">{t('fiscalClosing.warning')}</Alert>
          <TextField
            type="date" label={t('fiscalClosing.closingDate')} required value={form.closingDate}
            onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('common.notes')} multiline minRows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="warning" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('fiscalClosing.closeNew')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
