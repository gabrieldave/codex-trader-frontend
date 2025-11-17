import type { NextConfig } from "next";

// Importar next-pwa
const withPWA = require('next-pwa')({
  dest: 'public', // Aquí es donde Vercel buscará el service worker
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Deshabilitado en desarrollo
});

const nextConfig: NextConfig = {
  /* config options here */
  // Configuración de Turbopack para evitar conflicto con next-pwa
  // next-pwa usa Webpack, así que necesitamos especificar que usamos Webpack
  webpack: (config, { isServer }) => {
    return config;
  },
};

// Exportar con PWA wrapper
module.exports = withPWA(nextConfig);
