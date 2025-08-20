<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { ExpenseCategory } from '$lib/pocketbase';
	
	let formData = $state({
		date: new Date().toISOString().split('T')[0],
		start_time: '08:00',
		duration: 30,
		distance: 0,
		fuel_used: 0,
		fuel_price: 0,
		fare: 0,
		tips: 0,
		platform: '',
		notes: ''
	});
	
	let isLoading = $state(false);
	let error = $state('');
	let success = $state('');
	let platforms = $state<{id: string, name: string}[]>([]);
	let expenseCategories = $state<ExpenseCategory[]>([]);
	
	// Expense management
	let expenses = $state<Array<{
		category_id: string;
		amount: number;
		description: string;
	}>>([]);
	
	let newExpense = $state({
		category_id: '',
		amount: 0,
		description: ''
	});
	
	let isMounted = $state(true);
	
	onMount(() => {
		isMounted = true;
		
		// Use an async IIFE to handle the async operations
		(async () => {
			// Fetch user's platforms from database
			try {
				const userPlatforms = await pb.collection('platforms').getFullList({
					filter: `driver_id = "${pb.authStore.model?.id}"`,
					sort: 'name',
					$autoCancel: false
				});
				if (isMounted) {
					platforms = userPlatforms.map(p => ({id: p.id, name: p.name}));
				}
			} catch (err) {
				console.error('Error fetching platforms:', err);
				if (isMounted) {
					platforms = [];
				}
			}
			
			// Fetch expense categories
			try {
				const categories = await pb.collection('expense_categories').getFullList({
					filter: `driver_id = "${pb.authStore.model?.id}"`,
					sort: 'name',
					$autoCancel: false
				});
				if (isMounted) {
					expenseCategories = categories as unknown as ExpenseCategory[];
				}
			} catch (err) {
				console.error('Error fetching expense categories:', err);
				if (isMounted) {
					expenseCategories = [];
				}
			}
		})();
		
		return () => {
			isMounted = false;
		};
	});
	
	function calculateFuelCost(): number {
		return formData.fuel_used * formData.fuel_price;
	}
	
	function addExpense() {
		if (!newExpense.category_id || newExpense.amount <= 0) {
			alert('Please select a category and enter a valid amount');
			return;
		}
		
		expenses = [...expenses, {...newExpense}];
		newExpense = {
			category_id: '',
			amount: 0,
			description: ''
		};
	}
	
	function removeExpense(index: number) {
		expenses = expenses.filter((_, i) => i !== index);
	}
	
	function getCategoryName(categoryId: string): string {
		const category = expenseCategories.find(cat => cat.id === categoryId);
		return category?.name || 'Unknown Category';
	}
	
	function calculateTotal(): number {
		return formData.fare + formData.tips;
	}
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = '';
		success = '';
		
		try {
			// Validate required fields
			if (!formData.platform) {
				throw new Error('Platform is required');
			}
			
			// Create trip record first
			const tripData = {
				...formData,
				platform: formData.platform,
				driver_id: pb.authStore.model?.id
			};
			
			console.log('Creating trip with data:', tripData);
			
			// Create the trip and get the created record
			const createdTrip = await pb.collection('trips').create(tripData);
			
			// Create expenses if any were added
			if (expenses.length > 0) {
				const expensePromises = expenses.map(expense => 
					pb.collection('expenses').create({
						amount: expense.amount,
						category_id: expense.category_id,
						date: formData.date,
						description: expense.description || `Trip expense - ${formData.date}`,
						trip_id: createdTrip.id,
						driver_id: pb.authStore.model?.id
					})
				);
				
				await Promise.all(expensePromises);
			}
			
			success = 'Trip and expenses added successfully!';
			
			// Reset form after successful submission
			formData = {
				date: new Date().toISOString().split('T')[0],
				start_time: '08:00',
				duration: 30,
				distance: 0,
				fuel_used: 0,
				fuel_price: 0,
				fare: 0,
				tips: 0,
				platform: '',
				notes: ''
			};
			
			// Clear expenses
			expenses = [];
			
			// Redirect to trips list after 2 seconds
			setTimeout(() => {
				goto('/trips');
			}, 2000);
			
		} catch (err: any) {
			console.error('Error adding trip:', err);
			error = err.message || 'Failed to add trip';
		} finally {
			isLoading = false;
		}
	}
	
	function handleCancel() {
		goto('/trips');
	}
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<header class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Add New Trip</h1>
		<a href="/trips" class="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
			← Back to Trips
		</a>
	</header>
	
	{#if success}
		<div class="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg mb-6 text-center font-semibold">
			{success}
		</div>
	{/if}
	
	<form onsubmit={handleSubmit} class="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg mb-6">
				{error}
			</div>
		{/if}
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<div class="space-y-2">
				<label for="date" class="block text-sm font-semibold text-gray-700">Date *</label>
				<input
					id="date"
					type="date"
					bind:value={formData.date}
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="start_time" class="block text-sm font-semibold text-gray-700">Start Time *</label>
				<input
					id="start_time"
					type="time"
					bind:value={formData.start_time}
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="duration" class="block text-sm font-semibold text-gray-700">Duration (minutes) *</label>
				<input
					id="duration"
					type="number"
					bind:value={formData.duration}
					min="1"
					step="1"
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="distance" class="block text-sm font-semibold text-gray-700">Distance (km) *</label>
				<input
					id="distance"
					type="number"
					bind:value={formData.distance}
					min="0"
					step="0.1"
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="fuel_used" class="block text-sm font-semibold text-gray-700">Fuel Used (L)</label>
				<input
					id="fuel_used"
					type="number"
					bind:value={formData.fuel_used}
					min="0"
					step="0.1"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="fuel_price" class="block text-sm font-semibold text-gray-700">Fuel Price ($/L)</label>
				<input
					id="fuel_price"
					type="number"
					bind:value={formData.fuel_price}
					min="0"
					step="0.01"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="platform" class="block text-sm font-semibold text-gray-700">Platform *</label>
				<select
					id="platform"
					bind:value={formData.platform}
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				>
					<option value="">Select a platform</option>
					{#each platforms as platform}
						<option value={platform.id}>{platform.name}</option>
					{/each}
				</select>
			</div>
			
			<div class="space-y-2">
				<label for="fare" class="block text-sm font-semibold text-gray-700">Fare ($) *</label>
				<input
					id="fare"
					type="number"
					bind:value={formData.fare}
					min="0"
					step="0.01"
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="space-y-2">
				<label for="tips" class="block text-sm font-semibold text-gray-700">Tips ($)</label>
				<input
					id="tips"
					type="number"
					bind:value={formData.tips}
					min="0"
					step="0.01"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
		
		<div class="bg-gray-50 p-6 rounded-lg mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
			<div class="space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-gray-700">Fare:</span>
					<span class="font-medium text-gray-900">${formData.fare.toFixed(2)}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-700">Tips:</span>
					<span class="font-medium text-gray-900">${formData.tips.toFixed(2)}</span>
				</div>
				<div class="flex justify-between items-center pt-3 border-t border-gray-200">
					<span class="font-semibold text-gray-900">Total:</span>
					<span class="font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
				</div>
			</div>
		</div>
		
		<!-- Fuel Cost Calculation -->
		<div class="bg-blue-50 p-6 rounded-lg mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Fuel Cost</h3>
			<div class="space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-gray-700">Fuel Used:</span>
					<span class="font-medium text-gray-900">{formData.fuel_used.toFixed(1)} L</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-700">Fuel Price:</span>
					<span class="font-medium text-gray-900">${formData.fuel_price.toFixed(2)}/L</span>
				</div>
				<div class="flex justify-between items-center pt-3 border-t border-gray-200">
					<span class="font-semibold text-gray-900">Fuel Cost:</span>
					<span class="font-bold text-blue-600">${calculateFuelCost().toFixed(2)}</span>
				</div>
			</div>
		</div>
		
		<!-- Expense Management -->
		<div class="bg-orange-50 p-6 rounded-lg mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Trip Expenses</h3>
			
			<!-- Add Expense Form -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div class="space-y-2">
					<label class="block text-sm font-semibold text-gray-700">Category</label>
					<select
						bind:value={newExpense.category_id}
						disabled={isLoading || expenseCategories.length === 0}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
					>
						<option value="">Select Category</option>
						{#each expenseCategories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
				</div>
				
				<div class="space-y-2">
					<label class="block text-sm font-semibold text-gray-700">Amount ($)</label>
					<input
						type="number"
						bind:value={newExpense.amount}
						min="0"
						step="0.01"
						disabled={isLoading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
					/>
				</div>
				
				<div class="space-y-2">
					<label class="block text-sm font-semibold text-gray-700">Description</label>
					<input
						type="text"
						bind:value={newExpense.description}
						placeholder="Optional description"
						disabled={isLoading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
					/>
				</div>
			</div>
			
			<button
				type="button"
				onclick={addExpense}
				disabled={isLoading}
				class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
			>
				Add Expense
			</button>
			
			<!-- Expenses List -->
			{#if expenses.length > 0}
				<div class="space-y-3">
					<h4 class="font-semibold text-gray-900">Added Expenses:</h4>
					{#each expenses as expense, index (index)}
						<div class="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
							<div class="flex-1">
								<div class="font-medium text-gray-900">{getCategoryName(expense.category_id)}</div>
								<div class="text-sm text-gray-600">
									${expense.amount.toFixed(2)}
									{#if expense.description}
										- {expense.description}
									{/if}
								</div>
							</div>
							<button
								type="button"
								onclick={() => removeExpense(index)}
								disabled={isLoading}
								class="text-red-600 hover:text-red-800 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4"
							>
								Remove
							</button>
						</div>
					{/each}
					
					<div class="flex justify-between items-center pt-3 border-t border-gray-200">
						<span class="font-semibold text-gray-900">Total Expenses:</span>
						<span class="font-bold text-orange-600">
							${expenses.reduce((total, expense) => total + expense.amount, 0).toFixed(2)}
						</span>
					</div>
				</div>
			{:else}
				<p class="text-gray-600 text-center py-4">No expenses added yet</p>
			{/if}
		</div>
		
		<div class="space-y-2 mb-8">
			<label for="notes" class="block text-sm font-semibold text-gray-700">Notes</label>
			<textarea
				id="notes"
				bind:value={formData.notes}
				placeholder="Any additional notes about this trip..."
				rows="3"
				disabled={isLoading}
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
			></textarea>
		</div>
		
		<div class="flex flex-col sm:flex-row gap-4 justify-end">
			<button type="button" onclick={handleCancel} disabled={isLoading} class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
				Cancel
			</button>
			<button type="submit" disabled={isLoading} class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
				{#if isLoading}
					Adding Trip...
				{:else}
					Add Trip
				{/if}
			</button>
		</div>
	</form>
</div>
