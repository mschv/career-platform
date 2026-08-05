import { createTheme } from '@mui/material/styles';

/**
 * Design tokens — "Crecimiento" identity.
 *
 * Rationale: the audience is recent graduates who feel unsure how to
 * frame what they already have. The palette leans on growth (forest
 * green), achievement (warm gold), and a calm paper background so the
 * product reads as a guide, not a cold optimization tool.
 */
export const tokens = {
  color: {
    bg: '#F5F6F1', // warm-cool paper background
    surface: '#FFFFFF',
    surfaceMuted: '#EDEFE7',
    primary: '#1B4332', // deep forest green
    primaryLight: '#2D6A4F',
    accent: '#C9973F', // warm gold — the "achievement" accent, used sparingly
    accentLight: '#E4C583',
    secondary: '#3A6EA5', // muted blue for links/info states
    textPrimary: '#16201B',
    textSecondary: '#5B6760',
    border: '#DFE2D8',
    success: '#2D6A4F',
    warning: '#C9973F',
    danger: '#B3413A',
  },
  font: {
    display: "'Fraunces', 'Georgia', serif",
    body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
  },
};

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: tokens.color.bg,
      paper: tokens.color.surface,
    },
    primary: {
      main: tokens.color.primary,
      light: tokens.color.primaryLight,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: tokens.color.secondary,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: tokens.color.accent,
    },
    error: {
      main: tokens.color.danger,
    },
    text: {
      primary: tokens.color.textPrimary,
      secondary: tokens.color.textSecondary,
    },
    divider: tokens.color.border,
  },
  shape: {
    borderRadius: tokens.radius.md,
  },
  typography: {
    fontFamily: tokens.font.body,
    h1: { fontFamily: tokens.font.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h2: { fontFamily: tokens.font.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontFamily: tokens.font.display, fontWeight: 600 },
    h4: { fontFamily: tokens.font.display, fontWeight: 500 },
    h5: { fontFamily: tokens.font.display, fontWeight: 500 },
    h6: { fontFamily: tokens.font.body, fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          paddingInline: 20,
          paddingBlock: 10,
        },
        containedPrimary: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: tokens.radius.md,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.color.border}`,
          boxShadow: 'none',
          borderRadius: tokens.radius.md,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export default theme;
