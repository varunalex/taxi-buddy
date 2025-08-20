<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency } from '$lib/pocketbase';
	import type { Expense, ExpenseCategory } from '$lib/pocketbase';
	
	let expenses = $state<Expense[]>([]);
	let filteredExpenses = $state<Expense[]>([]);
	let categories = $state<ExpenseCategory[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let activeTab = $state<'expenses' | 'categories'>('expenses');
	
	// Filtering and pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(25);
	let dateFilter = $state<string>('');
	let categoryFilter = $state<string>('');
	
	// Get unique categories for filter dropdown
	let categoryOptions = $state<string[]>([]);
	
	
	// Handle URL parameters for tab switching
	$effect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const tab = urlParams.get('tab');
		if (tab === 'categories') {
			activeTab = 'categories';
		} else {
			activeTab = 'expenses';
		}
	});
	
	async function loadExpenses() {
		try {
			const records = await pb.collection('expenses').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: '-date,-created',
				expand: 'category_id,trip_id'
			});
			expenses = records as unknown as Expense[];
			filteredExpenses = [...expenses];
			
			// Extract unique categories for filter dropdown
			categoryOptions = [...new Set(expenses.map(expense => getCategoryName(expense.category_id)))].sort();
		} catch (err) {
			console.error('Error loading expenses:', err);
			error = 'Failed to load expenses';
		}
	}
	
	async function loadCategories() {
		try {
			const records = await pb.collection('expense_categories').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});
			categories = records as unknown as ExpenseCategory[];
			
			// Create default categories if user has no categories yet
			if (categories.length === 0) {
				await createDefaultCategories();
				// Reload categories after creating defaults
				const updatedRecords = await pb.collection('expense_categories').getFullList({
					filter: `driver_id = "${pb.authStore.model?.id}"`,
					sort: 'name'
				});
				categories = updatedRecords as unknown as ExpenseCategory[];
			}
		} catch (err) {
			console.error('Error loading categories:', err);
			error = 'Failed to load categories';
		}
	}
	
	async function createDefaultCategories() {
		const defaultCategories = [
			{ name: 'Fuel', type: 'expense', color: '#e74c3c', icon: '⛽' },
			{ name: 'Maintenance', type: 'expense', color: '#f39c12', icon: '🔧' },
			{ name: 'Insurance', type: 'expense', color: '#3498db', icon: '🛡️' },
			{ name: 'Cleaning', type: 'expense', color: '#9b59b6', icon: '🧹' },
			{ name: 'Parking/Tolls', type: 'expense', color: '#34495e', icon: '🚗' }
		];
		
		const userId = pb.authStore.model?.id;
		if (!userId) return;
		
		try {
			for (const category of defaultCategories) {
				await pb.collection('expense_categories').create({
					...category,
					driver_id: userId,
					is_default: true
				});
			}
			console.log('Default categories created successfully');
		} catch (err) {
			console.error('Error creating default categories:', err);
		}
	}
	
	function applyFilters() {
		let filtered = [...expenses];
		
		// Apply date filter
		if (dateFilter) {
			const filterDate = new Date(dateFilter);
			filtered = filtered.filter(expense => {
				const expenseDate = new Date(expense.date);
				return expenseDate.toDateString() === filterDate.toDateString();
			});
		}
		
		// Apply category filter
		if (categoryFilter) {
			filtered = filtered.filter(expense => getCategoryName(expense.category_id) === categoryFilter);
		}
		
		filteredExpenses = filtered;
		currentPage = 1; // Reset to first page when filters change
	}
	
	function clearFilters() {
		dateFilter = '';
		categoryFilter = '';
		filteredExpenses = [...expenses];
		currentPage = 1;
	}
	
	// Calculate pagination
	let totalPages = $state(1);
	let paginatedExpenses = $state<Expense[]>([]);
	
	$effect(() => {
		totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		paginatedExpenses = filteredExpenses.slice(start, end);
	});
	
	async function deleteExpense(expenseId: string) {
		if (!confirm('Are you sure you want to delete this expense?')) return;
		
		try {
			await pb.collection('expenses').delete(expenseId);
			expenses = expenses.filter(expense => expense.id !== expenseId);
			filteredExpenses = filteredExpenses.filter(expense => expense.id !== expenseId);
		} catch (err) {
			console.error('Error deleting expense:', err);
			alert('Failed to delete expense');
		}
	}
	
	async function deleteCategory(categoryId: string) {
		if (!confirm('Are you sure you want to delete this category? This will also delete all expenses in this category.')) return;
		
		try {
			// First delete all expenses in this category
			const expensesToDelete = await pb.collection('expenses').getFullList({
				filter: `category_id = "${categoryId}"`
			});
			
			for (const expense of expensesToDelete) {
				await pb.collection('expenses').delete(expense.id);
			}
			
			// Then delete the category
			await pb.collection('expense_categories').delete(categoryId);
			
			// Update local state
			categories = categories.filter(cat => cat.id !== categoryId);
			expenses = expenses.filter(expense => expense.category_id !== categoryId);
		} catch (err) {
			console.error('Error deleting category:', err);
			alert('Failed to delete category');
		}
	}
	
	function getCategoryName(categoryId: string): string {
		const category = categories.find(cat => cat.id === categoryId);
		return category?.name || 'Unknown Category';
	}
	
	function getCategoryType(categoryId: string): string {
		const category = categories.find(cat => cat.id === categoryId);
		return category?.type || 'expense';
	}
	
	function getTotalExpenses(): number {
		return filteredExpenses.reduce((total, expense) => {
			const categoryType = getCategoryType(expense.category_id);
			if (categoryType === 'expense') {
				return total + expense.amount;
			}
			return total;
		}, 0);
	}
	
	// Load data on component mount
	$effect(() => {
		(async () => {
			isLoading = true;
			await Promise.all([loadExpenses(), loadCategories()]);
			isLoading = false;
		})();
	});
	
	// Apply filters when filter values change
	$effect(() => {
		if (activeTab === 'expenses') {
			applyFilters();
		}
	});
</script>

<div class="max-w-6xl mx-auto p-6">
	<header class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-800">Expense Tracking</h1>
		<div class="flex gap-3">
			{#if activeTab === 'expenses'}
				<a href="/expenses/add" class="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-semibold transition-colors">
					➕ Add Expense
				</a>
			{:else}
				<a href="/expenses/categories/add" class="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-semibold transition-colors">
					➕ Add Category
				</a>
			{/if}
		</div>
	</header>
	
	<div class="flex border-b border-gray-200 mb-8">
		<button
			class={`px-6 py-4 font-medium transition-colors border-b-2 ${
				activeTab === 'expenses' 
					? 'text-blue-600 border-blue-600' 
					: 'text-gray-500 border-transparent hover:text-gray-700'
			}`}
			onclick={() => activeTab = 'expenses'}
		>
			Expenses
		</button>
		<button
			class={`px-6 py-4 font-medium transition-colors border-b-2 ${
				activeTab === 'categories' 
					? 'text-blue-600 border-blue-600' 
					: 'text-gray-500 border-transparent hover:text-gray-700'
			}`}
			onclick={() => activeTab = 'categories'}
		>
			Categories
		</button>
	</div>
	
	{#if isLoading}
		<div class="text-center py-10 text-gray-500 text-lg">Loading...</div>
	{:else if error}
		<div class="text-center py-10 text-red-600 text-lg">{error}</div>
	{:else if activeTab === 'expenses'}
		<!-- Filter Section -->
		<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Filter Expenses</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div>
					<label for="dateFilter" class="block text-sm font-medium text-gray-700 mb-2">Date</label>
					<input
						id="dateFilter"
						type="date"
						bind:value={dateFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label for="categoryFilter" class="block text-sm font-medium text-gray-700 mb-2">Category</label>
					<select
						id="categoryFilter"
						bind:value={categoryFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
					>
						<option value="">All Categories</option>
						{#each categoryOptions as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-end">
					<button
						type="button"
						onclick={() => clearFilters()}
						class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
					>
						Clear Filters
					</button>
				</div>
			</div>
			<div class="text-sm text-gray-600">
				Showing {filteredExpenses.length} of {expenses.length} expenses
			</div>
		</div>
		
		<!-- Summary Stats -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Total Expenses</div>
				<div class="text-2xl font-bold text-red-600">
					{formatCurrency(getTotalExpenses())}
				</div>
			</div>
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Total Entries</div>
				<div class="text-2xl font-bold text-gray-900">{filteredExpenses.length}</div>
			</div>
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Avg. per Entry</div>
				<div class="text-2xl font-bold text-blue-600">
					{filteredExpenses.length > 0 ? formatCurrency(
						getTotalExpenses() / filteredExpenses.length
					) : formatCurrency(0)}
				</div>
			</div>
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Categories</div>
				<div class="text-2xl font-bold text-purple-600">
					{[...new Set(filteredExpenses.map(e => getCategoryName(e.category_id)))].length}
				</div>
			</div>
		</div>
		
		{#if expenses.length === 0}
			<div class="text-center py-16 text-gray-500">
				<h2 class="text-2xl font-semibold text-gray-800 mb-4">No expenses yet</h2>
				<p class="mb-6">Start by adding your first expense to track your spending!</p>
				<a href="/expenses/add" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
					Add Your First Expense
				</a>
			</div>
		{:else}
			<!-- Table Section -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-sm text-left text-gray-500">
						<thead class="text-xs text-gray-700 uppercase bg-gray-50">
							<tr>
								<th scope="col" class="px-6 py-3">Date</th>
								<th scope="col" class="px-6 py-3">Category</th>
								<th scope="col" class="px-6 py-3">Amount</th>
								<th scope="col" class="px-6 py-3">Description</th>
								<th scope="col" class="px-6 py-3">Linked Trip</th>
								<th scope="col" class="px-6 py-3">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each paginatedExpenses as expense}
								<tr class="bg-white border-b hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										{new Date(expense.date).toLocaleDateString()}
									</td>
									<td class="px-6 py-4">
										<span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
											{getCategoryName(expense.category_id)}
										</span>
									</td>
									<td class="px-6 py-4 font-bold text-red-600">
										-{formatCurrency(expense.amount)}
									</td>
									<td class="px-6 py-4">
										{#if expense.description}
											<div class="text-gray-600 max-w-xs truncate" title={expense.description}>
												{expense.description}
											</div>
										{:else}
											<span class="text-gray-400">-</span>
										{/if}
									</td>
									<td class="px-6 py-4">
										{#if expense.trip_id}
											<span class="text-blue-600 text-sm">Yes</span>
										{:else}
											<span class="text-gray-400">No</span>
										{/if}
									</td>
									<td class="px-6 py-4">
										<div class="flex space-x-2">
											<a href={`/expenses/${expense.id}`} class="text-blue-600 hover:text-blue-800 font-medium text-sm">
												Edit
											</a>
											<button
												type="button"
												onclick={() => deleteExpense(expense.id)}
												class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				
				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="px-6 py-4 border-t border-gray-200">
						<div class="flex justify-center items-center gap-2">
							<button
								type="button"
								onclick={() => currentPage = Math.max(1, currentPage - 1)}
								disabled={currentPage === 1}
								class="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
							>
								←
							</button>
							
							<span class="text-sm text-gray-600">
								Page {currentPage} of {totalPages}
							</span>
							
							<button
								type="button"
								onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
							>
								→
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		{#if categories.length === 0}
			<div class="text-center py-16 text-gray-500">
				<h2 class="text-2xl font-semibold text-gray-800 mb-4">No categories yet</h2>
				<p class="mb-6">Start by adding your first category to organize your expenses!</p>
				<a href="/expenses/categories/add" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
					Add Your First Category
				</a>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each categories as category (category.id)}
					<div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
						<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-gray-100">
							<h3 class="text-xl font-semibold text-gray-800">{category.name}</h3>
							<span class="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
								Expense
							</span>
						</div>
						
						<div class="text-gray-600 text-sm mb-5">
							{(() => {
								const categoryExpenses = expenses.filter(e => e.category_id === category.id);
								const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
								const count = categoryExpenses.length;
								
								return `
									${count} ${count === 1 ? 'entry' : 'entries'}, 
									Total: ${formatCurrency(total)}
								`;
							})()}
						</div>
						
						<div class="text-right">
							<button onclick={() => deleteCategory(category.id)} class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
								Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
