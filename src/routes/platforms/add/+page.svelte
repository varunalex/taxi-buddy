<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	let formData = $state({
		name: ''
	});

	onMount(() => {
		// Check if user is authenticated
		if (!pb.authStore.isValid) {
			goto('/login');
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Validate form
			const name = formData.name.trim();
			
			if (!name) {
				throw new Error('Platform name is required');
			}

			if (name.length > 50) {
				throw new Error('Platform name must be less than 50 characters');
			}

			// Check if platform with same name already exists for this user
			const existingPlatforms = await pb.collection('platforms').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}" && name ~ "${name}"`,
				$autoCancel: false
			});

			if (existingPlatforms.length > 0) {
				throw new Error(`A platform named "${name}" already exists`);
			}

			// Create platform
			const platformData = {
				name: name,
				driver_id: pb.authStore.model?.id
			};

			await pb.collection('platforms').create(platformData);

			successMessage = 'Platform added successfully!';
			formData.name = '';

			// Redirect to platforms list after a short delay
			setTimeout(() => {
				goto('/platforms');
			}, 1500);

		} catch (error: any) {
			console.error('Error adding platform:', error);
			
			// Handle specific PocketBase errors
			if (error.status === 400) {
				errorMessage = 'Invalid platform data. Please check your input.';
			} else if (error.status === 403) {
				errorMessage = 'You do not have permission to create platforms.';
			} else if (error.status === 404) {
				errorMessage = 'Platform collection not found. Please contact support.';
			} else if (error.status === 0) {
				errorMessage = 'Network error. Please check your connection and try again.';
			} else {
				errorMessage = error.message || 'Failed to add platform. Please try again.';
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto p-8">
	<h1 class="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">Add New Platform</h1>

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
				disabled={isLoading}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
			/>
			<small class="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
				Enter the name of the ride-sharing platform
			</small>
		</div>

		<div class="flex gap-4 items-center">
			<button 
				type="submit" 
				disabled={isLoading}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
			>
				{#if isLoading}
					Adding Platform...
				{:else}
					Add Platform
				{/if}
			</button>
			<a href="/platforms" class="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-md font-medium transition-colors">
				Cancel
			</a>
		</div>
	</form>
</div>
