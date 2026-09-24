import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, List, ListItem, ListItemText, Chip,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottomOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblemOutlined';
import { useTranslation } from 'react-i18next';
import { notificationApi } from '../api/endpoints';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await notificationApi.list({ size: 50 });
      setRows(data.content);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markRead(row) {
    await notificationApi.markRead(row.id);
    load();
  }

  async function markAllRead() {
    await notificationApi.markAllRead();
    load();
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('notifications.title')}</Typography>
        <Button variant="outlined" onClick={markAllRead}>{t('notifications.markAllRead')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <List disablePadding>
            {rows.map((n, idx) => (
              <Box key={n.id}>
                <ListItem
                  sx={{ bgcolor: n.read ? 'transparent' : 'warning.light', cursor: n.read ? 'default' : 'pointer' }}
                  onClick={() => !n.read && markRead(n)}
                  secondaryAction={!n.read && <Chip size="small" color="warning" label="جديد" />}
                >
                  {n.type === 'LOW_STOCK' && <WarningAmberIcon color="warning" sx={{ me: 2 }} />}
                  {n.type === 'OVERDUE_SALES_INVOICE' && <ReceiptLongOutlinedIcon color="error" sx={{ me: 2 }} />}
                  {n.type === 'OVERDUE_PURCHASE_INVOICE' && <ShoppingCartOutlinedIcon color="error" sx={{ me: 2 }} />}
                  {n.type === 'EXPIRY_SOON' && <HourglassBottomIcon color="warning" sx={{ me: 2 }} />}
                  {n.type === 'EXPIRED' && <EventBusyIcon color="error" sx={{ me: 2 }} />}
                  {['VAN_NOT_LOADED', 'VAN_NOT_UNLOADED'].includes(n.type) && <LocalShippingIcon color="info" sx={{ me: 2 }} />}
                  {n.type === 'VAN_SHORTAGE' && <ReportProblemIcon color="error" sx={{ me: 2 }} />}
                  {['VAN_OUT_OF_STOCK', 'VAN_LOAD_REQUEST'].includes(n.type) && <LocalShippingIcon color="warning" sx={{ me: 2 }} />}
                  {!['LOW_STOCK', 'OVERDUE_SALES_INVOICE', 'OVERDUE_PURCHASE_INVOICE', 'EXPIRY_SOON', 'EXPIRED',
                    'VAN_NOT_LOADED', 'VAN_NOT_UNLOADED', 'VAN_SHORTAGE', 'VAN_OUT_OF_STOCK', 'VAN_LOAD_REQUEST'].includes(n.type) && <InfoOutlinedIcon sx={{ me: 2 }} />}
                  <ListItemText
                    primary={n.title}
                    secondary={`${n.message} — ${new Date(n.createdAt).toLocaleString()}`}
                    sx={{ ms: 1 }}
                  />
                </ListItem>
                {idx < rows.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
