import { useState } from 'react';
import { Box, Button, Collapse, Paper, Typography, List, ListItem, ListItemText, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

/**
 * شريط دليل استخدام مختصر أعلى الشاشة - مطوي افتراضياً حتى لا يزاحم المحتوى، ويُفتح بضغطة واحدة.
 * يظهر فوق كل شاشة معنية (بدل صفحة دليل منفصلة بالقائمة الجانبية).
 */
export default function PageGuide({ points, warning }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mb: open ? 2 : 1.5 }} className="app-no-print">
      {!open && (
        <Button size="small" startIcon={<HelpOutlineIcon fontSize="small" />} onClick={() => setOpen(true)} color="inherit">
          {t('pageGuide.title')}
        </Button>
      )}
      <Collapse in={open}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.50', borderColor: 'info.light' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <HelpOutlineIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={700}>{t('pageGuide.title')}</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Box>
          {warning && (
            <Typography variant="body2" color="warning.dark" fontWeight={600} sx={{ mb: 0.5 }}>
              ⚠ {warning}
            </Typography>
          )}
          <List dense sx={{ pt: 0 }}>
            {points.map((p, idx) => (
              <ListItem key={idx} sx={{ display: 'list-item', listStyleType: 'disc', pl: 0, py: 0.2, mr: 2.5 }}>
                <ListItemText primary={p} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Collapse>
    </Box>
  );
}
