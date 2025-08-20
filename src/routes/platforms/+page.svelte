<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let platforms = $state<any[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	onMount(async () => {
		// Check if user is authenticated
		if (!pb.authStore.isValid) {
			goto('/login');
			return;
		}

		await loadPlatforms();
	});

	async function loadPlatforms() {
		try {
			isLoading = true;
			errorMessage = '';

			// Fetch platforms for the current user
			const result = await pb.collection('platforms').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});

			platforms = result;
		} catch (error: any) {
			console.error('Error loading platforms:', error);
			errorMessage = 'Failed to load platforms. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function deletePlatform(platformId: string, platformName: string) {
		if (!confirm(`Are you sure you want to delete "${platformName}"? This action cannot be undone.`)) {
			return;
		}

		try {
			await pb.collection('platforms').delete(platformId);
			await loadPlatforms(); // Reload the list
		} catch (error: any) {
			console.error('Error deleting platform:', error);
			alert('Failed to delete platform. Please try again.');
		}
	}
</script>

<div class="max-w-6xl mx-auto p-8">
	<div class="flex justify-between items-center mb-8 flex-wrap gap-4">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Platforms</h1>
		<a href="/platforms/add" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
			Add New Platform
		</a>
	</div>

	{#if errorMessage}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 font-medium">
			{errorMessage}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center py-12 text-gray-500 dark:text-gray-400 text-lg">
			Loading platforms...
		</div>
	{:else if platforms.length === 0}
		<div class="text-center py-12 px-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">No Platforms Yet</h2>
			<p class="text-gray-600 dark:text-gray-300 mb-6">Get started by adding your first ride-sharing platform.</p>
			<a href="/platforms/add" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors">
				Add Your First Platform
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
			{#each platforms as platform (platform.id)}
				<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4">
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{platform.name}</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							Created: {new Date(platform.created).toLocaleDateString()}
						</p>
					</div>
					<div class="flex gap-2">
						<a href={`/platforms/${platform.id}`} class="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-md text-sm font-medium transition-colors" title="Edit platform">
							Edit
						</a>
						<button 
							onclick={() => deletePlatform(platform.id, platform.name)}
							class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
							title="Delete platform"
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>

		<div class="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<p class="text-gray-600 dark:text-gray-300">
				Total Platforms: <strong class="text-gray-900 dark:text-white">{platforms.length}</strong>
			</p>
		</div>
	{/if}
</div>
