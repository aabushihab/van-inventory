import { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import MoveUpIcon from '@mui/icons-material/MoveUpOutlined';
import SummarizeIcon from '@mui/icons-material/SummarizeOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblemOutlined';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VansPage from './VansPage';
import VanLoadsPage from './VanLoadsPage';
import VanSettlementPage from './VanSettlementPage';
import VanShortagesPage from './VanShortagesPage';

const TABS = ['list', 'loads', 'report', 'shortages'];

/** شاشة واحدة لكل ما يخص سيارات التوزيع: السيارات، التحميل والتنزيل، وتقرير السائقين. */
export default function VansHubPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = Math.max(0, TABS.indexOf(params.get('tab') || 'list'));
  // الإجراء المطلوب عند التنقل من صف سيارة: فتح تقريرها، أو فتح سند تحميل/تنزيل لها مباشرة
  const [loadPreset, setLoadPreset] = useState(null);

  function goTo(name) {
    setParams(name === 'list' ? {} : { tab: name }, { replace: true });
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 2 }} className="app-no-print">
        <Tabs value={tab} onChange={(_, v) => goTo(TABS[v])} variant="scrollable" allowScrollButtonsMobile>
          <Tab icon={<LocalShippingIcon />} iconPosition="start" label={t('vans.tabList')} />
          <Tab icon={<MoveUpIcon />} iconPosition="start" label={t('vans.tabLoads')} />
          <Tab icon={<SummarizeIcon />} iconPosition="start" label={t('vans.tabReport')} />
          <Tab icon={<ReportProblemIcon />} iconPosition="start" label={t('shortages.title')} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <VansPage
          onLoad={(vanId, type) => { setLoadPreset({ vanId, type, key: Date.now() }); goTo('loads'); }}
        />
      )}
      {tab === 1 && <VanLoadsPage preset={loadPreset} onPresetHandled={() => setLoadPreset(null)} />}
      {tab === 2 && <VanSettlementPage />}
      {tab === 3 && <VanShortagesPage />}
    </Box>
  );
}
