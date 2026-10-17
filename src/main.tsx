import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './styles.css';

const theme = createTheme({
  palette: { primary: { main: '#5068de' }, background: { default: '#f6f7fb', paper: '#fff' }, text: { primary: '#1c2740', secondary: '#758095' } },
  typography: { fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif', button: { textTransform: 'none', fontWeight: 600 } },
  shape: { borderRadius: 10 },
  components: { MuiButton: { defaultProps: { disableElevation: true } }, MuiChip: { styleOverrides: { root: { fontWeight: 600 } } } },
});
createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></StrictMode>);
