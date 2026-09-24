import { useEffect, useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrudPage from '../components/CrudPage';
import { categoryApi, unitApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function CatalogPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState(0);
  const canManage = hasPermission('CATEGORY_MANAGE');
  const [categories, setCategories] = useState([]);

  function loadCategories() {
    categoryApi.list().then(({ data }) => setCategories(data));
  }

  useEffect(() => { loadCategories(); }, []);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('common.category')} />
        <Tab label={t('common.unit')} />
      </Tabs>

      {tab === 0 && (
        <CrudPage
          title={t('common.category')}
          canManage={canManage}
          emptyModel={{ name: '', nameEn: '', parentId: '', active: true }}
          onChanged={loadCategories}
          columns={[
            { key: 'name', label: t('common.name'), render: (row) => (row.parentId ? `— ${row.name}` : row.name) },
            { key: 'parentName', label: t('common.parentCategory'), render: (row) => row.parentName || '-' },
            { key: 'nameEn', label: t('common.nameEn') },
            { key: 'active', label: t('common.status') },
          ]}
          fields={[
            { key: 'name', label: t('common.name'), required: true },
            { key: 'nameEn', label: t('common.nameEn') },
            {
              key: 'parentId',
              label: t('common.parentCategory'),
              type: 'select',
              options: (form) => [
                { value: '', label: t('common.noParent') },
                ...categories.filter((c) => c.id !== form.id).map((c) => ({ value: c.id, label: c.name })),
              ],
            },
            { key: 'active', label: t('common.active'), type: 'boolean' },
          ]}
          api={{
            ...categoryApi,
            // القيمة الفارغة "" تعني "بدون تصنيف رئيسي" ويجب تحويلها إلى null قبل الإرسال للخادم
            create: (data) => categoryApi.create({ ...data, parentId: data.parentId || null }),
            update: (id, data) => categoryApi.update(id, { ...data, parentId: data.parentId || null }),
          }}
        />
      )}

      {tab === 1 && (
        <CrudPage
          title={t('common.unit')}
          canManage={canManage}
          emptyModel={{ code: '', name: '', nameEn: '' }}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: t('common.name') },
            { key: 'nameEn', label: t('common.nameEn') },
          ]}
          fields={[
            { key: 'code', label: 'Code', required: true },
            { key: 'name', label: t('common.name'), required: true },
            { key: 'nameEn', label: t('common.nameEn') },
          ]}
          api={unitApi}
        />
      )}
    </Box>
  );
}
