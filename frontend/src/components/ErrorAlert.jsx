import { Alert } from '@mui/material';

/** ينبه برسالة الخطأ العامة، ويعرض تحتها تفصيل أخطاء كل حقل إن وُجدت. */
export default function ErrorAlert({ message, fieldErrors, onClose, sx }) {
  if (!message) return null;
  const entries = Object.entries(fieldErrors || {});
  return (
    <Alert severity="error" sx={sx} onClose={onClose}>
      {message}
      {entries.length > 0 && (
        <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>
          {entries.map(([field, msg]) => (
            <li key={field}>{field}: {msg}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
