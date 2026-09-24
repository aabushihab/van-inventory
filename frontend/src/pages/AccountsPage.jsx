import { useEffect, useState } from 'react';
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Alert,
  CircularProgress, Chip, Checkbox, Typography, TableContainer, TablePagination, InputAdornment,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { useTranslation } from 'react-i18next';
import CrudPage from '../components/CrudPage';
import PageGuide from '../components/PageGuide';
import { accountApi, branchApi, fetchAndDownload } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';

const ACCOUNT_TYPES = ['CASH', 'BANK'];

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AccountsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('ACCOUNTS_MANAGE');

  const [branchOptions, setBranchOptions] = useState([]);
  const [balances, setBalances] = useState({});
  const [accounts, setAccounts] = useState([]);

  const [ledgerAccount, setLedgerAccount] = useState(null);
  const [ledgerFrom, setLedgerFrom] = useState(todayIso());
  const [ledgerTo, setLedgerTo] = useState(todayIso());
  const [ledgerRows, setLedgerRows] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerSize, setLedgerSize] = useState(10);

  const [capitalOpen, setCapitalOpen] = useState(false);
  const [capitalForm, setCapitalForm] = useState({ accountId: '', direction: 'IN', amount: '', transactionDate: todayIso(), notes: '' });
  const [capitalSaving, setCapitalSaving] = useState(false);
  const [capitalError, setCapitalError] = useState('');

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', transactionDate: todayIso(), notes: '' });
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState('');

  function refreshBalances() {
    accountApi.balances().then(({ data }) => {
      setBalances(Object.fromEntries(data.map((b) => [b.accountId, b.balance])));
    }).catch(() => {});
    accountApi.list().then(({ data }) => setAccounts(data)).catch(() => {});
  }

  useEffect(() => {
    branchApi.list().then(({ data }) => setBranchOptions(data.map((b) => ({ value: b.id, label: b.name }))));
    refreshBalances();
  }, []);

  function openLedger(row) {
    setLedgerAccount(row);
    setLedgerFrom(todayIso());
    setLedgerTo(todayIso());
    setLedgerSearch('');
    setLedgerPage(0);
  }

  useEffect(() => {
    if (!ledgerAccount) return;
    setLoadingLedger(true);
    setLedgerError('');
    setLedgerPage(0);
    accountApi.ledger(ledgerAccount.id, { from: ledgerFrom, to: ledgerTo })
      .then(({ data }) => setLedgerRows(data))
      .catch((e) => setLedgerError(getErrorMessage(e, t('common.error'))))
      .finally(() => setLoadingLedger(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerAccount, ledgerFrom, ledgerTo]);

  function closeLedger() {
    setLedgerAccount(null);
    setLedgerRows([]);
  }

  function printLedger() {
    const previousSize = ledgerSize;
    setLedgerSize(1_000_000);
    setTimeout(() => {
      window.print();
      setLedgerSize(previousSize);
    }, 200);
  }

  function exportLedgerExcel() {
    fetchAndDownload(
      accountApi.ledgerExportUrl(ledgerAccount.id, { from: ledgerFrom, to: ledgerTo }),
      `دفتر-حركات-${ledgerAccount.name}.xlsx`,
    );
  }

  const filteredLedgerRows = ledgerRows.filter((r) => {
    if (!ledgerSearch.trim()) return true;
    const q = ledgerSearch.trim().toLowerCase();
    return (r.notes || '').toLowerCase().includes(q)
      || t(`accounts.source${r.sourceType}`, r.sourceType).toLowerCase().includes(q)
      || (r.createdByName || '').toLowerCase().includes(q);
  });
  const pagedLedgerRows = filteredLedgerRows.slice(ledgerPage * ledgerSize, ledgerPage * ledgerSize + ledgerSize);

  async function toggleReconciled(row) {
    setLedgerRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, reconciled: !r.reconciled } : r)));
    try {
      await accountApi.setReconciled(row.id, !row.reconciled);
    } catch (e) {
      setLedgerError(getErrorMessage(e, t('common.error')));
      setLedgerRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, reconciled: row.reconciled } : r)));
    }
  }

  function openCapital() {
    setCapitalForm({ accountId: accounts[0]?.id || '', direction: 'IN', amount: '', transactionDate: todayIso(), notes: '' });
    setCapitalError('');
    setCapitalOpen(true);
  }

  async function saveCapital() {
    setCapitalSaving(true);
    setCapitalError('');
    try {
      await accountApi.recordCapital({
        accountId: capitalForm.accountId,
        direction: capitalForm.direction,
        amount: Number(capitalForm.amount || 0),
        transactionDate: capitalForm.transactionDate,
        notes: capitalForm.notes || null,
      });
      setCapitalOpen(false);
      refreshBalances();
      if (ledgerAccount) {
        accountApi.ledger(ledgerAccount.id, { from: ledgerFrom, to: ledgerTo }).then(({ data }) => setLedgerRows(data));
      }
    } catch (e) {
      setCapitalError(getErrorMessage(e, t('common.error')));
    } finally {
      setCapitalSaving(false);
    }
  }

  function openTransfer() {
    setTransferForm({
      fromAccountId: accounts[0]?.id || '', toAccountId: accounts[1]?.id || '',
      amount: '', transactionDate: todayIso(), notes: '',
    });
    setTransferError('');
    setTransferOpen(true);
  }

  async function saveTransfer() {
    setTransferSaving(true);
    setTransferError('');
    try {
      await accountApi.transfer({
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount: Number(transferForm.amount || 0),
        transactionDate: transferForm.transactionDate,
        notes: transferForm.notes || null,
      });
      setTransferOpen(false);
      refreshBalances();
      if (ledgerAccount) {
        accountApi.ledger(ledgerAccount.id, { from: ledgerFrom, to: ledgerTo }).then(({ data }) => setLedgerRows(data));
      }
    } catch (e) {
      setTransferError(getErrorMessage(e, t('common.error')));
    } finally {
      setTransferSaving(false);
    }
  }

  return (
    <>
      <PageGuide points={t('pageGuide.accounts.points', { returnObjects: true })} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
        {canManage && accounts.length >= 2 && (
          <Button variant="outlined" startIcon={<SwapHorizOutlinedIcon />} onClick={openTransfer}>
            {t('accounts.transfer')}
          </Button>
        )}
        {canManage && (
          <Button variant="outlined" startIcon={<SavingsOutlinedIcon />} onClick={openCapital}>
            {t('accounts.recordCapital')}
          </Button>
        )}
      </Box>
      <CrudPage
        title={t('accounts.title')}
        canManage={canManage}
        onChanged={refreshBalances}
        emptyModel={{ name: '', type: 'CASH', branchId: '', openingBalance: '', active: true }}
        columns={[
          { key: 'name', label: t('common.name') },
          { key: 'type', label: t('accounts.type'), render: (row) => t(`accounts.type${row.type}`) },
          { key: 'branchName', label: t('common.branch'), render: (row) => row.branchName || '-' },
          { key: 'openingBalance', label: t('accounts.openingBalance'), render: (row) => fmt(row.openingBalance) },
          {
            key: 'balance', label: t('accounts.currentBalance'),
            render: (row) => {
              const b = Number(balances[row.id] ?? row.openingBalance ?? 0);
              return <Chip size="small" color={b >= 0 ? 'success' : 'error'} label={fmt(b)} />;
            },
          },
          { key: 'active', label: t('common.status') },
        ]}
        fields={[
          { key: 'name', label: t('common.name'), required: true },
          { key: 'type', label: t('accounts.type'), type: 'select', required: true, options: ACCOUNT_TYPES.map((v) => ({ value: v, label: t(`accounts.type${v}`) })) },
          { key: 'branchId', label: t('common.branch'), type: 'select', options: [{ value: '', label: t('common.noParent') }, ...branchOptions] },
          { key: 'openingBalance', label: t('accounts.openingBalance'), type: 'number' },
          { key: 'active', label: t('common.active'), type: 'boolean' },
        ]}
        api={{
          ...accountApi,
          create: (data) => accountApi.create({ ...data, branchId: data.branchId || null, openingBalance: Number(data.openingBalance || 0) }),
          update: (id, data) => accountApi.update(id, { ...data, branchId: data.branchId || null, openingBalance: Number(data.openingBalance || 0) }),
        }}
        extraRowActions={(row) => (
          <Tooltip title={t('accounts.ledger')}>
            <IconButton size="small" color="primary" onClick={() => openLedger(row)}>
              <MenuBookOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Dialog open={!!ledgerAccount} onClose={closeLedger} maxWidth="md" fullWidth className="ledger-print-dialog">
        <DialogTitle>{ledgerAccount?.name} — {t('accounts.ledger')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
            <TextField size="small" type="date" label={t('reports.from')} value={ledgerFrom}
              onChange={(e) => setLedgerFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label={t('reports.to')} value={ledgerTo}
              onChange={(e) => setLedgerTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Box sx={{ flexGrow: 1 }} />
            {ledgerRows.length > 0 && (
              <>
                <Tooltip title={t('common.print')}>
                  <IconButton onClick={printLedger}><PrintIcon /></IconButton>
                </Tooltip>
                <Tooltip title={t('common.exportExcel')}>
                  <IconButton onClick={exportLedgerExcel}><DownloadIcon /></IconButton>
                </Tooltip>
              </>
            )}
          </Box>
          {ledgerError && <Alert severity="error">{ledgerError}</Alert>}
          {!loadingLedger && ledgerRows.length > 0 && (
            <TextField
              size="small"
              placeholder={t('accounts.searchLedger')}
              value={ledgerSearch}
              onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              className="app-no-print"
            />
          )}
          {loadingLedger ? (
            <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={22} /></Box>
          ) : ledgerRows.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
          ) : filteredLedgerRows.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 420 }} className="ledger-print-table">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('expenses.date')}</TableCell>
                      <TableCell>{t('accounts.direction')}</TableCell>
                      <TableCell>{t('expenses.amount')}</TableCell>
                      <TableCell>{t('accounts.sourceType')}</TableCell>
                      <TableCell>{t('common.notes')}</TableCell>
                      <TableCell>{t('expenses.recordedBy')}</TableCell>
                      <TableCell align="center">{t('accounts.reconciled')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedLedgerRows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.transactionDate}</TableCell>
                        <TableCell>
                          <Chip size="small" color={r.direction === 'IN' ? 'success' : 'error'}
                            label={r.direction === 'IN' ? t('accounts.directionIN') : t('accounts.directionOUT')} />
                        </TableCell>
                        <TableCell>{fmt(r.amount)}</TableCell>
                        <TableCell>{t(`accounts.source${r.sourceType}`, r.sourceType)}</TableCell>
                        <TableCell>{r.notes || '-'}</TableCell>
                        <TableCell>{r.createdByName || '-'}</TableCell>
                        <TableCell align="center">
                          <Checkbox size="small" checked={!!r.reconciled} disabled={!canManage}
                            onChange={() => toggleReconciled(r)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination component="div" count={filteredLedgerRows.length} page={ledgerPage}
                onPageChange={(_, p) => setLedgerPage(p)}
                rowsPerPage={ledgerSize}
                onRowsPerPageChange={(e) => { setLedgerSize(parseInt(e.target.value, 10)); setLedgerPage(0); }}
                className="app-no-print" />
            </>
          )}
          {ledgerRows.length > 0 && (
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'flex-end', pt: 1 }}>
              <Typography variant="body2">
                {t('accounts.bookBalance')}: <b>{fmt(ledgerRows.reduce((s, r) => s + (r.direction === 'IN' ? Number(r.amount) : -Number(r.amount)), 0))}</b>
              </Typography>
              <Typography variant="body2">
                {t('accounts.reconciledBalance')}: <b>{fmt(ledgerRows.filter((r) => r.reconciled).reduce((s, r) => s + (r.direction === 'IN' ? Number(r.amount) : -Number(r.amount)), 0))}</b>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="app-no-print">
          <Button onClick={closeLedger}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={capitalOpen} onClose={() => setCapitalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('accounts.recordCapital')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {capitalError && <Alert severity="error">{capitalError}</Alert>}
          <TextField
            select label={t('accounts.account')} required value={capitalForm.accountId}
            onChange={(e) => setCapitalForm({ ...capitalForm, accountId: e.target.value })}
          >
            {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
          <TextField
            select label={t('accounts.direction')} required value={capitalForm.direction}
            onChange={(e) => setCapitalForm({ ...capitalForm, direction: e.target.value })}
          >
            <MenuItem value="IN">{t('accounts.capitalIn')}</MenuItem>
            <MenuItem value="OUT">{t('accounts.capitalOut')}</MenuItem>
          </TextField>
          <TextField
            type="number" label={t('expenses.amount')} required value={capitalForm.amount}
            onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })}
          />
          <TextField
            type="date" label={t('expenses.date')} required value={capitalForm.transactionDate}
            onChange={(e) => setCapitalForm({ ...capitalForm, transactionDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('common.notes')} multiline minRows={2} value={capitalForm.notes}
            onChange={(e) => setCapitalForm({ ...capitalForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCapitalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveCapital} disabled={capitalSaving || !capitalForm.accountId || !capitalForm.amount}>
            {capitalSaving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('accounts.transfer')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {transferError && <Alert severity="error">{transferError}</Alert>}
          <TextField
            select label={t('accounts.fromAccount')} required value={transferForm.fromAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
          >
            {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
          <TextField
            select label={t('accounts.toAccount')} required value={transferForm.toAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
          >
            {accounts.filter((a) => a.id !== transferForm.fromAccountId).map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            type="number" label={t('expenses.amount')} required value={transferForm.amount}
            onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
          />
          <TextField
            type="date" label={t('expenses.date')} required value={transferForm.transactionDate}
            onChange={(e) => setTransferForm({ ...transferForm, transactionDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('common.notes')} multiline minRows={2} value={transferForm.notes}
            onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveTransfer}
            disabled={transferSaving || !transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount}>
            {transferSaving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
