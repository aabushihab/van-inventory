import { createTheme } from '@mui/material/styles';
import { arSD, enUS } from '@mui/material/locale';
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
      // الأزرار المهمة (contained): تدرّج أزرق، وعند المرور يتحول برتقالي ويرتفع قليلاً
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontWeight: 600, borderRadius: 10,
            transition: 'background .25s ease, box-shadow .25s ease, transform .2s ease, color .2s ease, border-color .2s ease',
            '&:active': { transform: 'translateY(0) scale(0.98)' },
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            boxShadow: '0 6px 16px rgba(37,99,235,0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              boxShadow: '0 10px 22px rgba(249,115,22,0.35)', transform: 'translateY(-2px)',
            },
          },
          containedSecondary: {
            background: 'linear-gradient(135deg, #0e9f9a 0%, #14b8a6 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', transform: 'translateY(-2px)' },
          },
          containedSuccess: {
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #047857 0%, #22c55e 100%)', boxShadow: '0 10px 22px rgba(16,185,129,0.35)', transform: 'translateY(-2px)' },
          },
          containedError: {
            background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #991b1b 0%, #f43f5e 100%)', boxShadow: '0 10px 22px rgba(239,68,68,0.35)', transform: 'translateY(-2px)' },
          },
          containedWarning: {
            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)', boxShadow: '0 10px 22px rgba(245,158,11,0.35)', transform: 'translateY(-2px)' },
          },
          contained: {
            '&.Mui-disabled': { background: '#e2e8f0', boxShadow: 'none' },
          },
          outlinedPrimary: {
            borderWidth: 1.5,
            '&:hover': { borderWidth: 1.5, background: '#1e3a8a', color: '#fff', borderColor: '#1e3a8a', transform: 'translateY(-1px)' },
          },
          outlined: { '&:hover': { borderWidth: 1.5, transform: 'translateY(-1px)' } },
          textPrimary: { '&:hover': { background: 'rgba(245,158,11,0.12)', color: '#c2410c' } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'background .2s ease, color .2s ease, transform .2s ease',
            '&:hover': { transform: 'scale(1.1)' },
          },
          colorInherit: { '&:hover': { color: '#f97316', background: 'rgba(249,115,22,0.10)' } },
          sizeMedium: { '&:not(.MuiIconButton-colorPrimary):not(.MuiIconButton-colorError):not(.MuiIconButton-colorWarning):not(.MuiIconButton-colorSuccess):hover': { color: '#1d4ed8', background: 'rgba(29,78,216,0.08)' } },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontWeight: 700, borderRadius: 10, transition: 'color .2s ease, background .2s ease',
            '&:hover': { color: '#f97316', background: 'rgba(249,115,22,0.06)' },
          },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3, background: 'linear-gradient(90deg, #1d4ed8, #f97316)' } } },
      MuiTableRow: { styleOverrides: { root: { transition: 'background .15s ease', '&.MuiTableRow-hover:hover': { background: 'rgba(29,78,216,0.04)' } } } },
      MuiChip: { styleOverrides: { clickable: { transition: 'all .2s ease', '&:hover': { transform: 'translateY(-1px)' } } } },
      // النوافذ المنبثقة على الموبايل: تاخذ كامل العرض تقريباً وما بتطلع برا الشاشة
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 16,
            [theme.breakpoints.down('sm')]: {
              margin: 8, width: 'calc(100% - 16px)', maxWidth: 'calc(100% - 16px) !important', maxHeight: 'calc(100% - 16px)',
              borderRadius: 14,
            },
          }),
        },
      },
      MuiDialogContent: { styleOverrides: { root: ({ theme }) => ({ [theme.breakpoints.down('sm')]: { padding: '12px 14px' } }) } },
      MuiDialogActions: { styleOverrides: { root: { flexWrap: 'wrap', gap: 6 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  }, direction === 'rtl' ? arSD : enUS);
}
