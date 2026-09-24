import { Box } from '@mui/material';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import SecurityIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import TabbedHub from '../components/TabbedHub';
import UsersPage from './UsersPage';
import RolesPage from './RolesPage';

/** المستخدمون والأدوار والصلاحيات في شاشة واحدة - كل تبويب يظهر حسب صلاحية المستخدم. */
export default function UsersHubPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const tabs = [];
  if (hasPermission('USER_MANAGE')) {
    tabs.push({ key: 'users', label: t('nav.users'), icon: <BadgeIcon />, element: <UsersPage /> });
  }
  if (hasPermission('ROLE_MANAGE')) {
    tabs.push({ key: 'roles', label: t('nav.roles'), icon: <SecurityIcon />, element: <RolesPage /> });
  }
  if (!tabs.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        لا تملك صلاحية الوصول لهذه الصفحة / You don't have permission to access this page.
      </Box>
    );
  }
  return <TabbedHub tabs={tabs} />;
}
