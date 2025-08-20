<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import type { ExpenseCategory } from '$lib/pocketbase';
	
	let categories = $state<ExpenseCategory[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	
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
		} finally {
			isLoading = false;
		}
	}
	
	async function deleteCategory(categoryId: string, categoryName: string) {
		if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This will also delete all expenses in this category.`)) return;
		
		try {
			// First check if there are any expenses using this category
			const expenses = await pb.collection('expenses').getFullList({
				filter: `category_id = "${categoryId}"`
			});
			
			if (expenses.length > 0) {
				// Delete all expenses in this category
				for (const expense of expenses) {
					await pb.collection('expenses').delete(expense.id);
				}
			}
			
			// Then delete the category
			await pb.collection('expense_categories').delete(categoryId);
			
			// Update local state
			categories = categories.filter(cat => cat.id !== categoryId);
			
			alert(`Category "${categoryName}" and its ${expenses.length} expense(s) have been deleted successfully.`);
		} catch (err) {
			console.error('Error deleting category:', err);
			alert('Failed to delete category. Please try again.');
		}
	}
	
	function getCategoryCount(categoryId: string): Promise<number> {
		return pb.collection('expenses').getList(1, 1, {
			filter: `category_id = "${categoryId}"`
		}).then(result => result.totalItems);
	}
	
	// Load categories on component mount
	$effect(() => {
		loadCategories();
	});
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Expense Categories</h1>
		<div class="flex flex-wrap gap-3">
			<a href="/expenses/categories/add" class="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-semibold transition-colors duration-200">
				➕ Add Category
			</a>
			<a href="/expenses" class="border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200">
				← Back to Expenses
			</a>
		</div>
	</header>
	
	{#if isLoading}
		<div class="text-center py-16 text-gray-600 text-lg">Loading categories...</div>
	{:else if error}
		<div class="text-center py-16 text-red-600 text-lg">{error}</div>
	{:else if categories.length === 0}
		<div class="text-center py-20 text-gray-600">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">No categories yet</h2>
			<p class="text-lg mb-6">Start by adding your first category to organize your expenses!</p>
			<a href="/expenses/categories/add" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200">
				Add Your First Category
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each categories as category (category.id)}
				<div class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-l-4 border-red-500">
					<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5">
						<h3 class="text-xl font-semibold text-gray-900 flex-1">{category.name}</h3>
						<span class="px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
							Expense
						</span>
					</div>
					
					<div class="flex items-center gap-3 mb-5 flex-wrap">
						{#if category.color}
							<div class="w-5 h-5 rounded-full border-2 border-gray-100" style="background-color: {category.color}"></div>
						{/if}
						
						{#if category.icon}
							<span class="text-xl">{category.icon}</span>
						{/if}
					</div>
					
					<div class="bg-gray-50 p-3 rounded-lg text-center mb-5">
						{#await getCategoryCount(category.id) then count}
							<span class="text-gray-900 font-semibold text-sm">
								{count} {count === 1 ? 'expense' : 'expenses'}
							</span>
						{:catch}
							<span class="text-red-600 text-sm">Error loading count</span>
						{/await}
					</div>
					
					<div class="text-center">
						<button 
							onclick={() => deleteCategory(category.id, category.name)}
							class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-200"
							title="Delete category and all associated expenses"
						>
							🗑️ Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
