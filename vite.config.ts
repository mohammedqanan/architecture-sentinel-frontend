/**
 * ArchitectureSentinel - Vite Configuration
 * ==========================================
 * Optimized for React, Tailwind v4, Three.js, and Node polyfills.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['process'],
    }),
  ],
  resolve: {
    alias: {
      // استخدام import.meta.dirname بدلاً من __dirname ليتوافق مع معايير الـ Native ESM الحديثة
      '@': `${import.meta.dirname}/src`,
    },
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'three-stdlib',
    ],
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});