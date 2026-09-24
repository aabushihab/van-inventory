import { useEffect, useRef, useState } from 'react';
import {
  Autocomplete, TextField, CircularProgress, IconButton, Box,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';

/**
 * حقل بحث ذكي عن عميل/مورد بالاسم أو رقم الهاتف (بدلاً من قائمة منسدلة تعرض الكل).
 * وضع freeSolo (يُستخدم بفواتير البيع/الشراء): تقدر تكتب اسم جديد غير موجود مباشرة بدون
 * اختيار من القائمة ولا الضغط على أي زر - العميل/المورد الجديد يُنشأ فعلياً فقط لما يُحفظ
 * السطر اللي يستخدم هالحقل (الفاتورة)، عبر onSelect الذي يُستدعى بكائن {id: null, name} للاسم
 * الحر غير المطابق لأي خيار موجود، ليتولى المكوّن الأب إنشاءه عند الحفظ.
 */
export default function PartyAutocomplete({
  api, label, valueId, valueLabel, onSelect, required, allowQuickAdd = true, freeSolo = false, disabled, size,
}) {
  const { t } = useTranslation();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selected, setSelected] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', phone: '' });
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    setSelected((prev) => {
      if (!valueId) return null;
      if (prev && String(prev.id) === String(valueId)) return prev;
      return { id: valueId, name: valueLabel || '' };
    });
    // يزامن نص الحقل المعروض مع القيمة عند تعيينها من خارج المكوّن (مثلاً تعبئة مسبقة عند فتح فاتورة
    // جديدة من شاشة العملاء)، وإلا يبقى الحقل فارغاً بصرياً رغم أن القيمة المختارة صحيحة داخلياً.
    setInputValue(valueId ? (valueLabel || '') : '');
  }, [valueId, valueLabel]);

  function search(q) {
    setLoading(true);
    api.list(q)
      .then(({ data }) => setOptions(data))
      .finally(() => setLoading(false));
  }

  function handleInputChange(_e, newInputValue, reason) {
    // نتجاهل أحداث 'reset' الداخلية من MUI (تُطلَق أحياناً بنص فارغ عند تغيّر value برمجياً قبل
    // اكتمال تحميل الخيارات)، حتى لا تمحو النص المعروض فوق ما تم تعيينه من الخارج (valueId/valueLabel).
    if (reason !== 'input') return;
    setInputValue(newInputValue);
    // بوضع freeSolo، الكتابة الحرة تلغي أي اختيار سابق فوراً (بدل ما يبقى الاسم القديم مربوطاً خطأً).
    if (freeSolo && selected) setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(newInputValue), 300);
  }

  function handleBlur() {
    if (!freeSolo) return;
    const typed = inputValue.trim();
    if (selected || !typed) return;
    // اسم كُتب حراً وما يطابق أي خيار موجود - نمرره بـ id فارغ ليتولى المكوّن الأب إنشاءه لاحقاً عند الحفظ.
    const matched = options.find((o) => (o.name || '').trim().toLowerCase() === typed.toLowerCase());
    if (matched) {
      setSelected(matched);
      onSelect(matched);
    } else {
      onSelect({ id: null, name: typed });
    }
  }

  function openQuickAdd() {
    setQuickAddForm({ name: inputValue || '', phone: '' });
    setQuickAddError('');
    setQuickAddOpen(true);
  }

  async function saveQuickAdd() {
    if (!quickAddForm.name.trim()) return;
    setQuickAddSaving(true);
    setQuickAddError('');
    try {
      const { data } = await api.create(quickAddForm);
      setOptions((prev) => [data, ...prev]);
      setSelected(data);
      onSelect(data);
      setQuickAddOpen(false);
    } catch (e) {
      setQuickAddError(e.response?.data?.message || t('common.error'));
    } finally {
      setQuickAddSaving(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      {freeSolo ? (
        // كتابة يدوية بدون أي قائمة اقتراحات منسدلة - المطابقة مع عميل/مورد موجود (لتفادي التكرار)
        // تصير بصمت بالخلفية عند فقدان التركيز فقط (handleBlur)، دون عرض أي قائمة أثناء الكتابة.
        <TextField
          fullWidth
          size={size}
          disabled={disabled}
          label={label}
          required={required}
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            setInputValue(v);
            if (selected) setSelected(null);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => search(v), 300);
          }}
          onBlur={handleBlur}
        />
      ) : (
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
          getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt ? `${opt.name || ''}${opt.phone ? ' — ' + opt.phone : ''}` : ''))}
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
      )}
      {allowQuickAdd && !freeSolo && (
        <IconButton sx={{ mt: 1 }} size="small" onClick={openQuickAdd} title={t('common.add')} disabled={disabled}>
          <AddIcon fontSize="small" />
        </IconButton>
      )}

      <Dialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{label} — {t('common.add')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {quickAddError && <Alert severity="error">{quickAddError}</Alert>}
          <TextField
            label={t('common.name')} required autoFocus value={quickAddForm.name}
            onChange={(e) => setQuickAddForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label={t('common.phone')} value={quickAddForm.phone}
            onChange={(e) => setQuickAddForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickAddOpen(false)}>{t('common.close')}</Button>
          <Button variant="contained" onClick={saveQuickAdd} disabled={quickAddSaving || !quickAddForm.name.trim()}>
            {quickAddSaving ? <CircularProgress size={18} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
