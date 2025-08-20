<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency } from '$lib/pocketbase';
	import type { ExpenseCategory, Trip, Expense } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	
	let categories = $state<ExpenseCategory[]>([]);
	let trips = $state<Trip[]>([]);
	let expense = $state<Expense | null>(null);
	let isLoading = $state(true);
	let error = $state('');
	let isSubmitting = $state(false);
	
	let formData = $state({
		amount: '',
		category_id: '',
		date: '',
		description: '',
		trip_id: ''
	});
	
	async function loadExpense(expenseId: string) {
		try {
			const record = await pb.collection('expenses').getOne(expenseId, {
				expand: 'category_id,trip_id'
			});
			expense = record as unknown as Expense;
			
			// Populate form data
			formData.amount = expense.amount.toString();
			formData.category_id = expense.category_id;
			formData.date = expense.date;
			formData.description = expense.description || '';
			formData.trip_id = expense.trip_id || '';
		} catch (err) {
			console.error('Error loading expense:', err);
			error = 'Failed to load expense';
		}
	}
	
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
				trip_id: formData.trip_id || null
			};
			
			if (!page.params.id) {
				throw new Error('Expense ID is required');
			}
			
			await pb.collection('expenses').update(page.params.id, data);
			
			// Redirect back to expenses list
			window.location.href = '/expenses';
		} catch (err) {
			console.error('Error updating expense:', err);
			alert('Failed to update expense. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}
	
	async function deleteExpense() {
		if (!confirm('Are you sure you want to delete this expense?')) return;
		
		try {
			if (!page.params.id) {
				throw new Error('Expense ID is required');
			}
			
			await pb.collection('expenses').delete(page.params.id);
			window.location.href = '/expenses';
		} catch (err) {
			console.error('Error deleting expense:', err);
			alert('Failed to delete expense. Please try again.');
		}
	}
	
	onMount(async () => {
		if (!page.params.id) {
			error = 'Expense ID is required';
			isLoading = false;
			return;
		}
		
		try {
			await Promise.all([
				loadExpense(page.params.id),
				loadCategories(),
				loadTrips()
			]);
		} catch (err) {
			console.error('Error loading data:', err);
			error = 'Failed to load expense data';
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Edit Expense</h1>
		<a href="/expenses" class="text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
			← Back to Expenses
		</a>
	</header>
	
	{#if isLoading}
		<div class="text-center py-16 text-gray-600 text-lg">Loading...</div>
	{:else if error}
		<div class="text-center py-16 text-red-600 text-lg">{error}</div>
	{:else if !expense}
		<div class="text-center py-16 text-red-600 text-lg">Expense not found</div>
	{:else}
		<form onsubmit={handleSubmit} class="bg-white p-6 sm:p-8 rounded-xl shadow-md">
			<div class="mb-8 pb-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900 mb-6">Expense Details</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<div class="space-y-2">
						<label for="amount" class="block text-sm font-medium text-gray-700">Amount *</label>
						<input
							id="amount"
							type="number"
							step="0.01"
							min="0.01"
							bind:value={formData.amount}
							required
							placeholder="0.00"
							class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
						/>
						{#if formData.amount}
							<span class="block mt-2 font-semibold text-lg text-red-600">
								-{formatCurrency(parseFloat(formData.amount))}
							</span>
						{/if}
					</div>
					
					<div class="space-y-2">
						<label for="date" class="block text-sm font-medium text-gray-700">Date *</label>
						<input
							id="date"
							type="date"
							bind:value={formData.date}
							required
							class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
						/>
					</div>
				</div>
				
				<div class="space-y-2 mb-6">
					<label for="category_id" class="block text-sm font-medium text-gray-700">Category *</label>
					<select
						id="category_id"
						bind:value={formData.category_id}
						required
						class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
					>
						<option value="">Select a category</option>
						{#each categories as category}
							<option value={category.id} class="text-red-600">
								{category.name}
							</option>
						{/each}
					</select>
				</div>
				
				<div class="space-y-2">
					<label for="description" class="block text-sm font-medium text-gray-700">Description</label>
					<textarea
						id="description"
						bind:value={formData.description}
						placeholder="Optional description of this expense..."
						rows="3"
						class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-vertical min-h-20"
					></textarea>
				</div>
			</div>
			
			<div class="mb-8">
				<h2 class="text-xl font-semibold text-gray-900 mb-6">Link to Trip (Optional)</h2>
				<div class="space-y-2">
					<label for="trip_id" class="block text-sm font-medium text-gray-700">Associated Trip</label>
					<select
						id="trip_id"
						bind:value={formData.trip_id}
						class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
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
			
			<div class="flex flex-col sm:flex-row sm:justify-between gap-4">
				<button type="button" onclick={deleteExpense} class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200">
					Delete Expense
				</button>
				<div class="flex flex-col sm:flex-row gap-3">
					<button type="button" onclick={() => window.history.back()} class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200">
						{#if isSubmitting}
							Updating...
						{:else}
							Update Expense
						{/if}
					</button>
				</div>
			</div>
		</form>
	{/if}
</div>
