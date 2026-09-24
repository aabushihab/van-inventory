import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, CircularProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BackupIcon from '@mui/icons-material/BackupOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import RestoreIcon from '@mui/icons-material/SettingsBackupRestoreOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import { useTranslation } from 'react-i18next';
import { backupApi, fetchAndDownload } from '../api/endpoints';

const BACKUP_SCREEN_PIN = '0797953054';

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function BackupPinGate({ onUnlock }) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (pin === BACKUP_SCREEN_PIN) {
      onUnlock();
    } else {
      setPinError(t('backup.wrongPin'));
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper variant="outlined" sx={{ p: 4, width: 360, textAlign: 'center' }}>
        <LockOutlinedIcon color="action" sx={{ fontSize: 36, mb: 1 }} />
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{t('backup.enterPin')}</Typography>
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pinError && <Alert severity="error">{pinError}</Alert>}
          <TextField
            type="password" label={t('backup.pinLabel')} autoFocus fullWidth
            value={pin} onChange={(e) => { setPin(e.target.value); setPinError(''); }}
          />
          <Button type="submit" variant="contained">{t('backup.unlock')}</Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default function BackupsPage() {
  const { t } = useTranslation();
  const [unlocked, setUnlocked] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await backupApi.list();
      setRows(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  if (!unlocked) {
    return <BackupPinGate onUnlock={() => setUnlocked(true)} />;
  }

  async function runNow() {
    setRunning(true);
    setError('');
    setSuccess('');
    try {
      await backupApi.runNow();
      setSuccess(t('backup.success'));
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setRunning(false);
    }
  }

  function openRestore(row) {
    setRestoreTarget(row);
    setRestoreConfirmText('');
    setRestoreError('');
  }

  async function confirmRestore() {
    setRestoring(true);
    setRestoreError('');
    try {
      await backupApi.restore(restoreTarget.fileName);
      setRestoreTarget(null);
      setSuccess(t('backup.restoreSuccess'));
      await load();
    } catch (e) {
      setRestoreError(e.response?.data?.message || t('common.error'));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
        <Typography variant="h5" fontWeight={800}>{t('backup.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="error" startIcon={<DeleteSweepOutlinedIcon />}
            onClick={() => fetchAndDownload(backupApi.resetScriptUrl(), 'reset-data.sql')}>
            {t('backup.downloadResetScript')}
          </Button>
          <Button variant="contained" startIcon={running ? <CircularProgress size={16} color="inherit" /> : <BackupIcon />} onClick={runNow} disabled={running}>
            {t('backup.runNow')}
          </Button>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {t('backup.note')}
      </Typography>
      <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 2 }}>
        {t('backup.resetScriptNote')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('backup.fileName')}</TableCell>
                <TableCell>{t('backup.size')}</TableCell>
                <TableCell>{t('backup.createdAt')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.fileName} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.fileName}</TableCell>
                  <TableCell>{fmtSize(r.sizeBytes)}</TableCell>
                  <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('backup.download')}>
                      <IconButton size="small" onClick={() => fetchAndDownload(backupApi.downloadUrl(r.fileName), r.fileName)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('backup.restore')}>
                      <IconButton size="small" color="error" onClick={() => openRestore(r)}>
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={!!restoreTarget} onClose={() => !restoring && setRestoreTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>{t('backup.restoreTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Alert severity="error">{t('backup.restoreWarning')}</Alert>
          {restoreError && <Alert severity="error">{restoreError}</Alert>}
          <Typography variant="body2">
            {t('backup.restoreConfirmPrompt')} <b>{restoreTarget?.fileName}</b>
          </Typography>
          <TextField
            size="small" fullWidth autoFocus
            label={t('backup.fileName')}
            value={restoreConfirmText}
            onChange={(e) => setRestoreConfirmText(e.target.value)}
            disabled={restoring}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreTarget(null)} disabled={restoring}>{t('common.cancel')}</Button>
          <Button
            variant="contained" color="error"
            disabled={restoring || restoreConfirmText !== restoreTarget?.fileName}
            onClick={confirmRestore}
          >
            {restoring ? <CircularProgress size={20} /> : t('backup.restoreConfirmButton')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
