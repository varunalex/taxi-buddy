<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import type { ExpenseCategory } from '$lib/pocketbase';
	
	let isLoading = $state(false);
	let error = $state('');
	
	let formData = $state({
		name: '',
		type: 'expense' as 'expense'
	});
	
	function validateForm(): boolean {
		if (!formData.name.trim()) {
			alert('Please enter a category name');
			return false;
		}
		
		if (formData.name.trim().length < 2) {
			alert('Category name must be at least 2 characters long');
			return false;
		}
		
		return true;
	}
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!validateForm()) return;
		
		isLoading = true;
		
		try {
			const data = {
				name: formData.name.trim(),
				type: formData.type,
				driver_id: pb.authStore.model?.id
			};
			
			await pb.collection('expense_categories').create(data);
			
			// Redirect back to categories list
			window.location.href = '/expenses/categories';
		} catch (err) {
			console.error('Error creating category:', err);
			alert('Failed to create category. Please try again.');
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Add Category</h1>
		<a href="/expenses/categories" class="text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
			← Back to Categories
		</a>
	</header>
	
	<form onsubmit={handleSubmit} class="bg-white p-6 sm:p-8 rounded-xl shadow-md">
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-gray-900 mb-6">Category Details</h2>
			
			<div class="mb-6">
				<label for="name" class="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
				<input
					id="name"
					type="text"
					bind:value={formData.name}
					required
					placeholder="e.g., Fuel, Maintenance, Insurance"
					maxlength="50"
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
				/>
				<small class="block mt-2 text-sm text-gray-500">Enter a descriptive name for your category (2-50 characters)</small>
			</div>
			
			<div class="mb-6">
				<label for="type" class="block text-sm font-medium text-gray-700 mb-2">Category Type *</label>
				<select
					id="type"
					bind:value={formData.type}
					required
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
					disabled
				>
					<option value="expense">Expense (Money going out)</option>
				</select>
				<small class="block mt-2 text-sm text-gray-500">
					Expenses reduce your net income (e.g., fuel, maintenance)
				</small>
			</div>
		</div>
		
		<div class="mb-8 p-5 bg-gray-50 rounded-lg">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Preview:</h3>
			<div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-red-500">
				<span class="font-semibold text-gray-900">{formData.name || 'Category Name'}</span>
				<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
					Expense
				</span>
			</div>
		</div>
		
		<div class="flex flex-col sm:flex-row sm:justify-end gap-3">
			<button type="button" onclick={() => window.history.back()} class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200 sm:order-1">
				Cancel
			</button>
			<button type="submit" disabled={isLoading} class="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200">
				{#if isLoading}
					Creating...
				{:else}
					Create Category
				{/if}
			</button>
		</div>
	</form>
</div>
