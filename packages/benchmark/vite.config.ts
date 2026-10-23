import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** La medicion se hace SIEMPRE sobre el build estatico (`npm run build` y
 *  luego `npm run serve`). El servidor de desarrollo existe solo para
 *  construir fixtures: inyecta su propio cliente en la pagina y esa actividad
 *  no pertenece a la aplicacion bajo medicion. */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Sin hashes en los nombres: un dist/ reproducible es mas facil de
    // archivar junto a los datos crudos del capitulo 4.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: { port: 5272, strictPort: true },
});
