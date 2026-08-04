import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En producción cuelga de /salvese, detrás del mismo origen que el menú.
  // En desarrollo lo sirve Vite en su propia raíz.
  base: command === 'build' ? '/salvese/' : '/',
  server: { host: true },
}));
