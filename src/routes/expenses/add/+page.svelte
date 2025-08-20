<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency } from '$lib/pocketbase';
	import type { ExpenseCategory, Trip } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	
	let categories = $state<ExpenseCategory[]>([]);
	let trips = $state<Trip[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let isSubmitting = $state(false);
	
	let formData = $state({
		amount: '',
		category_id: '',
		date: new Date().toISOString().split('T')[0],
		description: '',
		trip_id: ''
	});
	
	async function loadCategories() {
		try {
			const records = await pb.collection('expense_categories').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});
			categories = records as unknown as ExpenseCategory[];
		} catch (err) {
			console.error('Error loading categories:', err);
			error = 'Failed to load categories';
		}
	}
	
	async function loadTrips() {
		try {
			const records = await pb.collection('trips').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: '-date,-created'
			});
			trips = records as unknown as Trip[];
		} catch (err) {
			console.error('Error loading trips:', err);
			// Don't show error for trips since they're optional
		}
	}
	
	function validateForm(): boolean {
		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			alert('Please enter a valid amount greater than 0');
			return false;
		}
		
		if (!formData.category_id) {
			alert('Please select a category');
			return false;
		}
		
		if (!formData.date) {
			alert('Please select a date');
			return false;
		}
		
		return true;
	}
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!validateForm()) return;
		
		isSubmitting = true;
		
		try {
			const data = {
				amount: parseFloat(formData.amount),
				category_id: formData.category_id,
				date: formData.date,
				description: formData.description,
				trip_id: formData.trip_id || null,
				driver_id: pb.authStore.model?.id
			};
			
			await pb.collection('expenses').create(data);
			
			// Redirect back to expenses list
			window.location.href = '/expenses';
		} catch (err) {
			console.error('Error creating expense:', err);
			alert('Failed to create expense. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}
	
	onMount(async () => {
		await Promise.all([loadCategories(), loadTrips()]);
		isLoading = false;
	});
</script>

<div class="max-w-2xl mx-auto p-5">
	<header class="flex justify-between items-center mb-8">
		<h1 class="text-2xl font-bold text-gray-800">Add Expense</h1>
		<a href="/expenses" class="text-blue-600 hover:text-blue-800 font-semibold">← Back to Expenses</a>
	</header>
	
	{#if isLoading}
		<div class="text-center py-10 text-gray-600 text-lg">Loading...</div>
	{:else if error}
		<div class="text-center py-10 text-red-600 text-lg">{error}</div>
	{:else}
		<form onsubmit={handleSubmit} class="bg-white p-8 rounded-xl shadow-md">
			<div class="mb-8 pb-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-800 mb-6">Expense Details</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<div>
						<label for="amount" class="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
						<input
							id="amount"
							type="number"
							step="0.01"
							min="0.01"
							bind:value={formData.amount}
							required
							placeholder="0.00"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						{#if formData.amount}
							<span class="block mt-2 font-bold text-sm text-red-600">
								-{formatCurrency(parseFloat(formData.amount))}
							</span>
						{/if}
					</div>
					
					<div>
						<label for="date" class="block text-sm font-medium text-gray-700 mb-2">Date *</label>
						<input
							id="date"
							type="date"
							bind:value={formData.date}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				</div>
				
				<div class="mb-6">
					<label for="category_id" class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
					<select
						id="category_id"
						bind:value={formData.category_id}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="">Select a category</option>
						{#each categories as category}
							<option value={category.id} class="text-red-600">
								{category.name}
							</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
					<textarea
						id="description"
						bind:value={formData.description}
						placeholder="Optional description of this expense..."
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-20"
					></textarea>
				</div>
			</div>
			
			<div class="mb-8 pb-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-800 mb-6">Link to Trip (Optional)</h2>
				<div>
					<label for="trip_id" class="block text-sm font-medium text-gray-700 mb-2">Associated Trip</label>
					<select
						id="trip_id"
						bind:value={formData.trip_id}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="">No trip association</option>
						{#each trips as trip}
							<option value={trip.id}>
								{new Date(trip.date).toLocaleDateString()} - {trip.platform} - {formatCurrency(trip.fare + trip.tips)}
							</option>
						{/each}
					</select>
				</div>
			</div>
			
			<div class="flex justify-end gap-4 mt-8">
				<button type="button" onclick={() => window.history.back()} class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-semibold">
					Cancel
				</button>
				<button type="submit" disabled={isSubmitting} class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold">
					{#if isSubmitting}
						Adding...
					{:else}
						Add Expense
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>
