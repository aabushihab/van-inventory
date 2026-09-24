import { useMemo } from 'react';
import { Box, TextField, MenuItem, Autocomplete } from '@mui/material';
import { createFilterOptions } from '@mui/material/useAutocomplete';
import { useTranslation } from 'react-i18next';

/**
 * اختيار صنف: تصنيف اختياري لتضييق القائمة، ثم حقل بحث بالكتابة (اسم الصنف/الـSKU/الباركود)
 * بدل قائمة منسدلة طويلة يصعب التصفح فيها لو عدد المنتجات كبير (مئات الأصناف).
 * Category narrows the list (optional), then a type-ahead search over name/SKU/barcode
 * replaces the old long flat dropdown, which became unusable with a few hundred products.
 */
const filterProducts = createFilterOptions({
  stringify: (p) => `${p.name} ${p.sku || ''} ${p.barcode || ''}`,
});

export default function CategoryProductPicker({ categories, products, categoryId, productId, onCategoryChange, onProductChange }) {
  const { t } = useTranslation();

  const filteredProducts = categoryId
    ? products.filter((p) => String(p.categoryId) === String(categoryId))
    : products;

  const selectedProduct = useMemo(
    () => filteredProducts.find((p) => p.id === productId) || null,
    [filteredProducts, productId]
  );

  function handleCategoryChange(newCategoryId) {
    onCategoryChange(newCategoryId);
    const stillValid = newCategoryId
      ? products.some((p) => p.id === productId && String(p.categoryId) === String(newCategoryId))
      : true;
    if (!stillValid) onProductChange('', null);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 240 }}>
      <TextField select size="small" fullWidth value={categoryId || ''}
        label={t('common.category')}
        onChange={(e) => handleCategoryChange(e.target.value)}>
        <MenuItem value="">{t('products.allCategories')}</MenuItem>
        {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <Autocomplete
        size="small"
        fullWidth
        options={filteredProducts}
        value={selectedProduct}
        filterOptions={filterProducts}
        getOptionLabel={(p) => (p ? `${p.name} (${p.sku})` : '')}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        onChange={(_e, newValue) => onProductChange(newValue ? newValue.id : '', newValue)}
        noOptionsText={t('common.noData')}
        renderInput={(params) => <TextField {...params} label={t('products.title')} />}
      />
    </Box>
  );
}
