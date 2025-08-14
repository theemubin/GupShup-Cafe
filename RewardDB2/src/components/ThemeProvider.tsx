import type { ReactNode } from 'react';
import '../styles/theme.css';

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default ThemeProvider;
