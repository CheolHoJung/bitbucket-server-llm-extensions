import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

// Helper function to resolve paths relative to the current file's directory
function resolvePath(relativePath: string) {
  return resolve(__dirname, relativePath);
}

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      // Path to your manifest.json (source file)
      manifest: resolvePath("src/manifest.json"),
      // Watch manifest.json for changes to trigger rebuilds
      watchFilePaths: [resolvePath("src/manifest.json")],
      // We are not using disableAutoInputs, allowing the plugin
      // to process manifest entries like options.html, popup.html, and background.service_worker.
    }),
    viteStaticCopy({
      // Copies the _locales directory to the output (dist) directory
      targets: [
        {
          src: '_locales/**/*', // All content inside _locales at project root
          dest: '_locales'      // Copied to dist/_locales
        }
        // If you have icons in public/assets, Vite usually handles the public dir.
        // If icons are in src/assets, you might add another target here:
        // { src: 'src/assets/icons/**/*', dest: 'assets/icons' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Clean the output directory before each build
    rollupOptions: {
      // Explicitly define all your main TS/TSX entry points
      // This helps ensure they are built with the output options below.
      input: {
        // The keys (e.g., 'src/background/main') will be used by
        // output.entryFileNames to create the path structure in 'dist'.
        'src/background/main': resolvePath('src/background/main.ts'),
        'src/content/content': resolvePath('src/content/content.tsx'),
        'src/options/main': resolvePath('src/options/main.tsx'), // JS/TS entry for your options.html
        'src/popup/main': resolvePath('src/popup/main.tsx'),   // JS/TS entry for your popup.html (if you use one)
      },
      output: {
        // Defines the output format for the JavaScript files
        entryFileNames: `[name].js`, // e.g., dist/src/background/main.js
        chunkFileNames: `assets/[name]-[hash].js`, // For code-split chunks
        assetFileNames: `assets/[name]-[hash].[ext]`, // For other assets like CSS, images
        
        inlineDynamicImports: false, // Required for code-splitting with multiple entry points
        format: 'es', // Crucial: Output all as ES modules
      },
    },
    sourcemap: 'inline', // For easier debugging during development
                         // Change to 'hidden-source-map' or false for production
  },
});