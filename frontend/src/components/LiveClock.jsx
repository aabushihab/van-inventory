import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** يعرض اليوم والتاريخ والساعة الحاليين، ويتحدّث كل ثانية. */
export default function LiveClock() {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const locale = i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
  const dateStr = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Box sx={{ textAlign: 'center', lineHeight: 1.2, display: { xs: 'none', sm: 'block' } }}>
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}>
        {dateStr}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {timeStr}
      </Typography>
    </Box>
  );
}
