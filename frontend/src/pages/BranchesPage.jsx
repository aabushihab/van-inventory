import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrudPage from '../components/CrudPage';
import { branchApi, warehouseApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function BranchesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(location.state?.initialTab ?? 0);
  const [branchOptions, setBranchOptions] = useState([]);

  useEffect(() => {
    if (location.state?.initialTab !== undefined) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    branchApi.list().then(({ data }) => setBranchOptions(data.map((b) => ({ value: b.id, label: b.name }))));
  }, []);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('common.branch')} />
        <Tab label={t('common.warehouse')} />
      </Tabs>

      {tab === 0 && (
        <CrudPage
          title={t('common.branch')}
          canManage={hasPermission('BRANCH_MANAGE')}
          emptyModel={{ name: '', nameEn: '', address: '', phone: '', active: true }}
          columns={[
            { key: 'name', label: t('common.name') },
            { key: 'nameEn', label: t('common.nameEn') },
            { key: 'phone', label: t('common.phone') },
            { key: 'active', label: t('common.status') },
          ]}
          fields={[
            { key: 'name', label: t('common.name'), required: true },
            { key: 'nameEn', label: t('common.nameEn') },
            { key: 'address', label: t('common.address') },
            { key: 'phone', label: t('common.phone') },
            { key: 'active', label: t('common.active'), type: 'boolean' },
          ]}
          api={branchApi}
        />
      )}

      {tab === 1 && (
        <CrudPage
          title={t('common.warehouse')}
          canManage={hasPermission('WAREHOUSE_MANAGE')}
          emptyModel={{ branchId: branchOptions[0]?.value || '', name: '', nameEn: '', location: '', isDefault: false, active: true }}
          columns={[
            { key: 'name', label: t('common.name') },
            { key: 'branchName', label: t('common.branch') },
            { key: 'location', label: t('common.address') },
            { key: 'active', label: t('common.status') },
          ]}
          fields={[
            { key: 'branchId', label: t('common.branch'), type: 'select', required: true, options: branchOptions },
            { key: 'name', label: t('common.name'), required: true },
            { key: 'nameEn', label: t('common.nameEn') },
            { key: 'location', label: t('common.address') },
            { key: 'isDefault', label: 'Default', type: 'boolean' },
            { key: 'active', label: t('common.active'), type: 'boolean' },
          ]}
          api={warehouseApi}
        />
      )}
    </Box>
  );
}
