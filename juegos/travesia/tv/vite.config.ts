import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En producción cuelga de /travesia, detrás del mismo origen que el menú.
  // En desarrollo lo sirve Vite en su propia raíz.
  base: command === 'build' ? '/travesia/' : '/',
  server: { host: true },
}));
