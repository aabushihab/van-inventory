import { createTheme } from '@mui/material/styles';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

export function createEmotionCache(direction) {
  return direction === 'rtl'
    ? createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] })
    : createCache({ key: 'muiltr' });
}

export function buildTheme(direction) {
  return createTheme({
    direction,
    palette: {
      mode: 'light',
      primary: { main: '#1e3a8a', light: '#3b5bdb', dark: '#152a63' },
      secondary: { main: '#0ea5a4' },
      background: { default: '#f4f6fb', paper: '#ffffff' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: direction === 'rtl'
        ? "'Noto Naskh Arabic', 'Cairo', 'Segoe UI', sans-serif"
        : "'Inter', 'Segoe UI', sans-serif",
    },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });
}
