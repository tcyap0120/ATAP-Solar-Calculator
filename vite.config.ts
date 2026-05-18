import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Safely handle API Key definition - Check both standard and VITE_ prefixed
  const rawKey = env.API_KEY || env.VITE_API_KEY;
  const apiKeyDef = rawKey ? JSON.stringify(rawKey) : undefined;
  
  // Capture build date
  const buildDate = new Date().toLocaleString();

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    define: {
      'process.env.API_KEY': apiKeyDef,
      '__BUILD_DATE__': JSON.stringify(buildDate)
    },
    // Base path set to relative to allow deployment to any subdirectory
    base: './',
    build: {
      rollupOptions: {
        // No external config to ensure everything is bundled
      }
    }
  }
})