<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Platform } from '$lib/pocketbase';

	let platform = $state<Platform | null>(null);
	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	let formData = $state({
		name: ''
	});

	onMount(async () => {
		// Check if user is authenticated
		if (!pb.authStore.isValid) {
			goto('/login');
			return;
		}

		await loadPlatform();
	});

	async function loadPlatform() {
		try {
			isLoading = true;
			errorMessage = '';

			// Get platform ID from URL params
			const url = new URL(window.location.href);
			const pathSegments = url.pathname.split('/');
			const platformId = pathSegments[pathSegments.length - 1];

			if (!platformId) {
				throw new Error('Platform ID not found in URL');
			}

			// Fetch platform data
			const platformData = await pb.collection('platforms').getOne(platformId);

			// Verify the platform belongs to the current user
			if (platformData.driver_id !== pb.authStore.model?.id) {
				throw new Error('You do not have permission to edit this platform');
			}

			// Cast to Platform type (safe conversion)
			platform = {
				id: platformData.id,
				name: platformData.name,
				driver_id: platformData.driver_id,
				created: platformData.created,
				updated: platformData.updated
			} as Platform;
			formData.name = platformData.name;

		} catch (error: any) {
			console.error('Error loading platform:', error);
			errorMessage = error.message || 'Failed to load platform. Please try again.';
			
			// Redirect to platforms list if platform not found or no permission
			if (error.message.includes('not found') || error.message.includes('permission')) {
				setTimeout(() => {
					goto('/platforms');
				}, 2000);
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isSubmitting = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Validate form
			if (!formData.name.trim()) {
				throw new Error('Platform name is required');
			}

			if (formData.name.trim().length > 50) {
				throw new Error('Platform name must be less than 50 characters');
			}

			// Update platform
			const updateData = {
				name: formData.name.trim()
			};

			await pb.collection('platforms').update(platform!.id, updateData);

			successMessage = 'Platform updated successfully!';

			// Redirect to platforms list after a short delay
			setTimeout(() => {
				goto('/platforms');
			}, 1500);

		} catch (error: any) {
			console.error('Error updating platform:', error);
			errorMessage = error.message || 'Failed to update platform. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	async function deletePlatform() {
		if (!confirm(`Are you sure you want to delete "${platform?.name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			await pb.collection('platforms').delete(platform!.id);
			goto('/platforms');
		} catch (error: any) {
			console.error('Error deleting platform:', error);
			alert('Failed to delete platform. Please try again.');
		}
	}
</script>

<div class="max-w-2xl mx-auto p-8">
	{#if isLoading}
		<div class="text-center py-12 text-gray-500 dark:text-gray-400 text-lg">
			Loading platform...
		</div>
	{:else if platform}
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">Edit Platform</h1>

		{#if errorMessage}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 font-medium">
				{errorMessage}
			</div>
		{/if}

		{#if successMessage}
			<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 font-medium">
				{successMessage}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm mb-8">
			<div class="mb-6">
				<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Platform Name *
				</label>
				<input
					type="text"
					id="name"
					name="name"
					required
					bind:value={formData.name}
					placeholder="e.g., Uber, Lyft, Bolt"
					disabled={isSubmitting}
					maxlength="50"
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<small class="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
					Enter the name of the ride-sharing platform (max 50 characters)
				</small>
			</div>

			<div class="flex gap-4 items-center flex-wrap">
				<button 
					type="submit" 
					disabled={isSubmitting}
					class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
				>
					{#if isSubmitting}
						Updating Platform...
					{:else}
						Update Platform
					{/if}
				</button>
				<button 
					type="button" 
					onclick={deletePlatform} 
					disabled={isSubmitting}
					class="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
				>
					Delete Platform
				</button>
				<a href="/platforms" class="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-md font-medium transition-colors">
					Cancel
				</a>
			</div>
		</form>

		<div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Details</h3>
			<p class="text-gray-600 dark:text-gray-300 mb-2">
				<strong class="text-gray-900 dark:text-white">Created:</strong> {new Date(platform.created).toLocaleDateString()}
			</p>
			<p class="text-gray-600 dark:text-gray-300">
				<strong class="text-gray-900 dark:text-white">Last Updated:</strong> {new Date(platform.updated).toLocaleDateString()}
			</p>
		</div>
	{:else}
		<div class="text-center py-12 px-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Platform Not Found</h2>
			<p class="text-gray-600 dark:text-gray-300 mb-6">{errorMessage || 'The platform you are trying to edit could not be found.'}</p>
			<a href="/platforms" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors">
				Back to Platforms
			</a>
		</div>
	{/if}
</div>
