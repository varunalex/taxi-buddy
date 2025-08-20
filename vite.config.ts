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
	}
});
