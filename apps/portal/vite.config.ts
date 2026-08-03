import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // En desarrollo el servidor está en otro puerto; en producción es el mismo
    // origen. Con el proxy, el código del menú no se entera de la diferencia.
    proxy: { '/api': 'http://localhost:8787' },
  },
});
