import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      // Opzione per includere specifici polyfill se necessario
      // globals: {
      //   Buffer: true, // E' già true di default
      //   global: true,
      //   process: true,
      // }
    }),
  ],
  define: {
    // Alcune librerie si aspettano che 'global' esista. 
    // Lo mappiamo a 'globalThis' che è lo standard nei browser moderni.
    'global': 'globalThis'
  }
});
