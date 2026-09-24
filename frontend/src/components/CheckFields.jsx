import { useRef, useState } from 'react';
import { Box, TextField, Button, Typography, IconButton, Alert } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCameraOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from 'react-i18next';
import { compressImage } from '../utils/imageCompress';

export const emptyCheck = () => ({ checkNumber: '', bankName: '', dueDate: '', drawerName: '', image: '' });

/** الحقول المطلوبة: رقم الشيك وتاريخ استحقاقه. */
export const checkIsValid = (c) => !!(c && c.checkNumber?.trim() && c.dueDate);

/**
 * بيانات شيك مستلم: الرقم، البنك، تاريخ الاستحقاق، اسم الساحب، وصورة الشيك
 * (على الموبايل يفتح الكاميرا مباشرة). الصورة تُضغط قبل الإرسال.
 */
export default function CheckFields({ value, onChange }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [imgError, setImgError] = useState('');
  const set = (patch) => onChange({ ...value, ...patch });

  async function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImgError('');
    try {
      set({ image: await compressImage(file, { maxDimension: 1400, quality: 0.72 }) });
    } catch (_) {
      setImgError(t('checkPay.imageError'));
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, borderRadius: 1, border: '1px dashed', borderColor: 'warning.light', bgcolor: 'warning.50' }}>
      <Typography variant="subtitle2" fontWeight={800}>{t('checkPay.title')}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <TextField size="small" required label={t('checkPay.number')} value={value.checkNumber}
          onChange={(e) => set({ checkNumber: e.target.value })} error={!value.checkNumber?.trim()} />
        <TextField size="small" required type="date" label={t('checkPay.dueDate')} value={value.dueDate}
          onChange={(e) => set({ dueDate: e.target.value })} error={!value.dueDate}
          slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label={t('checkPay.bank')} value={value.bankName} onChange={(e) => set({ bankName: e.target.value })} />
        <TextField size="small" label={t('checkPay.drawer')} value={value.drawerName} onChange={(e) => set({ drawerName: e.target.value })} />
      </Box>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickImage} />
      {value.image ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="img" src={value.image} alt="" sx={{ maxHeight: 110, maxWidth: '70%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
          <IconButton size="small" color="error" onClick={() => set({ image: '' })}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ) : (
        <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => fileRef.current?.click()} sx={{ alignSelf: 'flex-start' }}>
          {t('checkPay.photo')}
        </Button>
      )}
      {imgError && <Alert severity="error">{imgError}</Alert>}
      <Typography variant="caption" color="text.secondary">{t('checkPay.hint')}</Typography>
    </Box>
  );
}
