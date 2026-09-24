import { useEffect, useRef, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { productApi } from '../api/endpoints';

/**
 * حقل بحث ذكي عن منتج بالاسم أو الرمز (بدلاً من قائمة منسدلة تحمّل كل المنتجات دفعة واحدة)،
 * حتى تبقى الشاشة سريعة مهما كبر عدد الأصناف مستقبلاً. البحث يتم على السيرفر (نفس نمط PartyAutocomplete).
 */
export default function ProductAutocomplete({
  label, valueId, valueLabel, onSelect, required, disabled, size, categoryId,
}) {
  const { t } = useTranslation();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setSelected((prev) => {
      if (!valueId) return null;
      if (prev && String(prev.id) === String(valueId)) return prev;
      return { id: valueId, name: valueLabel || '' };
    });
    setInputValue(valueId ? (valueLabel || '') : '');
  }, [valueId, valueLabel]);

  function search(q) {
    setLoading(true);
    productApi.search({ q: q || undefined, categoryId: categoryId || undefined, size: 20 })
      .then(({ data }) => setOptions(data.content))
      .finally(() => setLoading(false));
  }

  function handleInputChange(_e, newInputValue, reason) {
    if (reason !== 'input') return;
    setInputValue(newInputValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(newInputValue), 300);
  }

  return (
    <Autocomplete
      fullWidth
      size={size}
      disabled={disabled}
      options={options}
      loading={loading}
      value={selected}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={(_e, newValue) => { setSelected(newValue); onSelect(newValue); }}
      onOpen={() => { if (options.length === 0) search(''); }}
      getOptionLabel={(opt) => (opt ? `${opt.name || ''}${opt.sku ? ' (' + opt.sku + ')' : ''}` : '')}
      isOptionEqualToValue={(opt, val) => String(opt.id) === String(val.id)}
      noOptionsText={t('common.noData')}
      renderInput={(params) => (
        <TextField
          {...params}
          size={size}
          label={label}
          required={required}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.slotProps?.input?.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
