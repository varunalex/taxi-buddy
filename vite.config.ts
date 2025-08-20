import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Helper function to safely get environment variables
function getAllowedHosts(): string[] {
  if (typeof process !== 'undefined' && process.env && process.env.VITE_ALLOWED_HOSTS) {
    return process.env.VITE_ALLOWED_HOSTS.split(',');
  }
  return [];
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	preview: {
		allowedHosts: getAllowedHosts()
	},
	build: {
		rollupOptions: {
			output: {
				// Add content hash to filenames for better caching
				assetFileNames: (assetInfo) => {
					const info = assetInfo.name?.split('.');
					const ext = info?.[info.length - 1];
					if (ext && /\.(css|woff|woff2|ttf|eot|svg)$/.test(assetInfo.name || '')) {
						return `assets/${ext}/[name]-[hash][extname]`;
					}
					return `assets/[name]-[hash][extname]`;
				},
				chunkFileNames: 'assets/js/[name]-[hash].js',
				entryFileNames: 'assets/js/[name]-[hash].js'
			}
		}
	}
});
