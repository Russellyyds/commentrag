// theme.js - Updated with AI tech style
import { createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1', // Indigo
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981', // Emerald
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0F172A', // Deep blue-black
      paper: '#1E293B',   // Slate dark
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
    },
    error: {
      main: '#EF4444', // Red
      light: '#F87171',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    info: {
      main: '#0EA5E9', // Sky
      light: '#38BDF8',
      dark: '#0284C7',
    },
    success: {
      main: '#10B981', // Emerald
      light: '#34D399',
      dark: '#059669',
    },
    divider: 'rgba(226, 232, 240, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
          },
        },
        contained: {
          backgroundImage: 'linear-gradient(to right, #6366F1, #8B5CF6)',
          '&:hover': {
            backgroundImage: 'linear-gradient(to right, #4F46E5, #7C3AED)',
          },
        },
        containedSecondary: {
          backgroundImage: 'linear-gradient(to right, #10B981, #06B6D4)',
          '&:hover': {
            backgroundImage: 'linear-gradient(to right, #059669, #0891B2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.8)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
          border: '1px solid rgba(99, 102, 241, 0.1)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 100,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(226, 232, 240, 0.12)',
        },
        head: {
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.07)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
        },
        bar: {
          borderRadius: 8,
          backgroundImage: 'linear-gradient(to right, #6366F1, #8B5CF6)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1E293B',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#4F46E5',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#6366F1',
            },
          },
        },
      },
    },
  },
});

export default theme;