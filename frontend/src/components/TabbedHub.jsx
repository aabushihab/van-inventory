import { Box, Tabs, Tab, Paper } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

/**
 * شاشة تجمع عدة صفحات مترابطة كتبويبات، والتبويب المختار محفوظ في الرابط (?tab=...)
 * حتى يعمل زر الرجوع والروابط المباشرة. التبويب الأول هو الافتراضي (بدون tab بالرابط).
 * tabs: [{ key, label, icon, element }]
 */
export default function TabbedHub({ tabs }) {
  const [params, setParams] = useSearchParams();
  const index = Math.max(0, tabs.findIndex((t) => t.key === params.get('tab')));

  return (
    <Box>
      {tabs.length > 1 && (
        <Paper variant="outlined" sx={{ mb: 2 }} className="app-no-print">
          <Tabs value={index} variant="scrollable" allowScrollButtonsMobile
            onChange={(_, i) => setParams(i === 0 ? {} : { tab: tabs[i].key }, { replace: true })}>
            {tabs.map((t) => <Tab key={t.key} icon={t.icon} iconPosition="start" label={t.label} />)}
          </Tabs>
        </Paper>
      )}
      <Box key={tabs[index].key}>{tabs[index].element}</Box>
    </Box>
  );
}
