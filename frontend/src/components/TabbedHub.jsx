import { Box, Tabs, Tab, Paper } from '@mui/material';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * شاشة تجمع عدة صفحات مترابطة كتبويبات، والتبويب المختار محفوظ في الرابط (?tab=...)
 * حتى يعمل زر الرجوع والروابط المباشرة. التبويب الأول المتاح هو الافتراضي.
 * tabs: [{ key, label, icon, element, permission? (رمز أو مصفوفة - يكفي واحد منها) }]
 */
export default function TabbedHub({ tabs }) {
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const visible = tabs.filter((t) => !t.permission || [].concat(t.permission).some((p) => hasPermission(p)));

  if (!visible.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        لا تملك صلاحية الوصول لهذه الصفحة / You don't have permission to access this page.
      </Box>
    );
  }

  const index = Math.max(0, visible.findIndex((t) => t.key === params.get('tab')));

  return (
    <Box>
      {visible.length > 1 && (
        <Paper variant="outlined" sx={{ mb: 2 }} className="app-no-print">
          <Tabs value={index} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
            onChange={(_, i) => setParams(i === 0 ? {} : { tab: visible[i].key }, { replace: true })}>
            {visible.map((t) => <Tab key={t.key} icon={t.icon} iconPosition="start" label={t.label} />)}
          </Tabs>
        </Paper>
      )}
      <Box key={visible[index].key}>{visible[index].element}</Box>
    </Box>
  );
}

/** تحويل رابط قديم إلى تبويبه داخل الشاشة المجمّعة، مع الإبقاء على state (مثل الفلاتر المُمرّرة). */
export function TabRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={to} state={location.state} replace />;
}
