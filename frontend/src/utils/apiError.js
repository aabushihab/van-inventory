/** يستخرج أخطاء الحقول (field -> message) من استجابة خطأ الـ API، إن وُجدت. */
export function getFieldErrors(e) {
  return e?.response?.data?.fieldErrors || {};
}

export function getErrorMessage(e, fallback) {
  return e?.response?.data?.message || fallback;
}
