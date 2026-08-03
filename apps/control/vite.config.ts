import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En producción el servidor monta este cliente en /control/, detrás del mismo
  // origen que la TV. En desarrollo lo sirve Vite en su propia raíz.
  base: command === 'build' ? '/control/' : '/',
  server: { host: true },
}));
