<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency } from '$lib/pocketbase';
	import type { Expense, ExpenseCategory, Trip } from '$lib/pocketbase';
	
	let expenses = $state<Expense[]>([]);
	let categories = $state<ExpenseCategory[]>([]);
	let trips = $state<Trip[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let selectedPeriod = $state<'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
	let customStartDate = $state<string>('');
	let customEndDate = $state<string>('');
	
	// Global wear and tear rate (LKR per km)
	const WEAR_AND_TEAR_RATE = Number(import.meta.env.VITE_WEAR_AND_TEAR_RATE) || 15;
	
	// Date range calculations - return timestamps instead of Date objects to avoid reference issues
	const getDateRange = () => {
		const now = new Date();
		let startTimestamp: number;
		let endTimestamp: number;
		
		switch (selectedPeriod) {
			case 'today':
				startTimestamp = new Date(now).setHours(0, 0, 0, 0);
				endTimestamp = new Date(now).setHours(23, 59, 59, 999);
				break;
			case 'yesterday':
				startTimestamp = new Date(now.getTime() - 86400000).setHours(0, 0, 0, 0);
				endTimestamp = new Date(now.getTime() - 86400000).setHours(23, 59, 59, 999);
				break;
			case 'this_week':
				startTimestamp = new Date(now.getTime() - (now.getDay() * 86400000)).setHours(0, 0, 0, 0);
				endTimestamp = new Date(now).setHours(23, 59, 59, 999);
				break;
			case 'last_week':
				startTimestamp = new Date(now.getTime() - ((now.getDay() + 7) * 86400000)).setHours(0, 0, 0, 0);
				endTimestamp = new Date(now.getTime() - ((now.getDay() + 1) * 86400000)).setHours(23, 59, 59, 999);
				break;
			case 'this_month':
				startTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
				endTimestamp = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
				break;
			case 'last_month':
				startTimestamp = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
				endTimestamp = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
				break;
			case 'this_year':
				startTimestamp = new Date(now.getFullYear(), 0, 1).getTime();
				endTimestamp = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
				break;
			case 'custom':
				if (customStartDate && customEndDate) {
					startTimestamp = new Date(customStartDate).setHours(0, 0, 0, 0);
					endTimestamp = new Date(customEndDate).setHours(23, 59, 59, 999);
				} else {
					// Default to this month if custom dates not set
					startTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
					endTimestamp = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
				}
				break;
			default:
				startTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
				endTimestamp = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
		}
		
		return { startTimestamp, endTimestamp };
	};
	
	// Format date for display
	function formatDateDisplay(date: Date): string {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
	
	// Get current date range display text
	function getDateRangeDisplay() {
		const { startTimestamp, endTimestamp } = getDateRange();
		const startDate = new Date(startTimestamp);
		const endDate = new Date(endTimestamp);
		return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
	}
	
	async function loadData() {
		try {
			const [expensesData, categoriesData, tripsData] = await Promise.all([
				pb.collection('expenses').getFullList({
					filter: `driver_id = "${pb.authStore.model?.id}"`,
					sort: '-date',
					expand: 'category_id,trip_id'
				}),
				pb.collection('expense_categories').getFullList({
					filter: `driver_id = "${pb.authStore.model?.id}"`,
					sort: 'name'
				}),
				pb.collection('trips').getFullList({
					filter: `driver_id = "${pb.authStore.model?.id}"`,
					sort: '-date'
				})
			]);
			
			expenses = expensesData as unknown as Expense[];
			categories = categoriesData as unknown as ExpenseCategory[];
			trips = tripsData as unknown as Trip[];
		} catch (err) {
			console.error('Error loading data:', err);
			error = 'Failed to load reports data';
		} finally {
			isLoading = false;
		}
	}
	
	// Get filtered expenses for current date range
	function getFilteredExpenses() {
		if (isLoading) return [];
		
		const { startTimestamp, endTimestamp } = getDateRange();
		return expenses.filter(expense => {
			if (!expense.date) return false;
			const expenseTimestamp = new Date(expense.date).getTime();
			return expenseTimestamp >= startTimestamp && expenseTimestamp <= endTimestamp;
		});
	}
	
	// Calculate total expenses
	function getTotalExpenses(filteredExpenses: Expense[]) {
		return filteredExpenses
			.filter(expense => {
				const category = categories.find(cat => cat.id === expense.category_id);
				return category?.type === 'expense';
			})
			.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
	}

	// Calculate wear and tear expenses
	function getWearAndTearExpenses(): number {
		if (isLoading) return 0;
		
		const { startTimestamp, endTimestamp } = getDateRange();
		const totalDistance = trips
			.filter(trip => {
				if (!trip.date) return false;
				const tripTimestamp = new Date(trip.date).getTime();
				return tripTimestamp >= startTimestamp && tripTimestamp <= endTimestamp;
			})
			.reduce((sum: number, trip: Trip) => sum + (trip.distance || 0), 0);
		
		return totalDistance * WEAR_AND_TEAR_RATE;
	}

	// Calculate total expenses including wear and tear
	function getTotalExpensesWithWearAndTear(filteredExpenses: Expense[]): number {
		return getTotalExpenses(filteredExpenses) + getWearAndTearExpenses();
	}
	
	// Calculate total income from trips in date range (fare + tips)
	function getTotalIncome() {
		if (isLoading) return 0;
		
		const { startTimestamp, endTimestamp } = getDateRange();
		return trips
			.filter(trip => {
				if (!trip.date) return false;
				const tripTimestamp = new Date(trip.date).getTime();
				return tripTimestamp >= startTimestamp && tripTimestamp <= endTimestamp;
			})
			.reduce((sum: number, trip: Trip) => sum + ((trip.fare || 0) + (trip.tips || 0)), 0);
	}
	
	// Calculate net profit (income - expenses)
	function getNetProfit() {
		return getTotalIncome() - getTotalExpenses(getFilteredExpenses());
	}

	// Calculate profit percentage ((income - expenses) / income * 100)
	function getProfitPercentage(): number {
		const totalIncome = getTotalIncome();
		const totalExpenses = getTotalExpenses(getFilteredExpenses());
		
		if (totalIncome === 0) return 0; // If no income, percentage is 0
		
		return ((totalIncome - totalExpenses) / totalIncome) * 100;
	}

	// Calculate profit percentage after wear and tear ((income - expenses - wearAndTear) / income * 100)
	function getProfitPercentageAfterWearAndTear(): number {
		const totalIncome = getTotalIncome();
		const totalExpensesWithWearAndTear = getTotalExpensesWithWearAndTear(getFilteredExpenses());
		
		if (totalIncome === 0) return 0; // If no income, percentage is 0
		
		return ((totalIncome - totalExpensesWithWearAndTear) / totalIncome) * 100;
	}
	
	// Get category breakdown
	function getCategoryBreakdown(filteredExpenses: Expense[]) {
		const breakdown: { [key: string]: { amount: number; name: string } } = {};
		
		filteredExpenses.forEach(expense => {
			const category = categories.find(cat => cat.id === expense.category_id);
			if (category && category.type === 'expense') {
				if (!breakdown[category.id]) {
					breakdown[category.id] = {
						amount: 0,
						name: category.name
					};
				}
				breakdown[category.id].amount += expense.amount;
			}
		});
		
		return Object.entries(breakdown)
			.map(([id, data]) => ({ id, ...data }))
			.sort((a, b) => b.amount - a.amount);
	}
	
	// Get top expenses
	function getTopExpenses(filteredExpenses: Expense[]) {
		return filteredExpenses
			.filter(expense => {
				const category = categories.find(cat => cat.id === expense.category_id);
				return category?.type === 'expense';
			})
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5);
	}
	
	// Get top earning trips (sorted by fare + tips)
	function getTopTrips() {
		if (isLoading) return [];
		
		const { startTimestamp, endTimestamp } = getDateRange();
		return trips
			.filter(trip => {
				if (!trip.date) return false;
				const tripTimestamp = new Date(trip.date).getTime();
				return tripTimestamp >= startTimestamp && tripTimestamp <= endTimestamp;
			})
			.sort((a, b) => ((b.fare || 0) + (b.tips || 0)) - ((a.fare || 0) + (a.tips || 0)))
			.slice(0, 5);
	}
	
	// Get platform breakdown for income
	function getPlatformBreakdown() {
		const breakdown: { [key: string]: { earnings: number; name: string; trips: number } } = {};
		
		const { startTimestamp, endTimestamp } = getDateRange();
		const filteredTrips = trips.filter(trip => {
			if (!trip.date) return false;
			const tripTimestamp = new Date(trip.date).getTime();
			return tripTimestamp >= startTimestamp && tripTimestamp <= endTimestamp;
		});
		
		filteredTrips.forEach(trip => {
			const platformName = trip.platform || 'Unknown Platform';
			const tripEarnings = (trip.fare || 0) + (trip.tips || 0);
			if (!breakdown[platformName]) {
				breakdown[platformName] = {
					earnings: 0,
					name: platformName,
					trips: 0
				};
			}
			breakdown[platformName].earnings += tripEarnings;
			breakdown[platformName].trips += 1;
		});
		
		return Object.entries(breakdown)
			.map(([_, data]) => ({ ...data }))
			.sort((a, b) => b.earnings - a.earnings);
	}
	
	// Helper function to get category name
	function getCategoryName(categoryId: string): string {
		const category = categories.find(cat => cat.id === categoryId);
		return category?.name || 'Unknown Category';
	}
	
	// Load data on component mount
	$effect(() => {
		loadData();
	});
</script>

<div class="max-w-7xl mx-auto p-6">
	<header class="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-800">Financial Reports</h1>
			<p class="text-gray-600 mt-1">{getDateRangeDisplay()}</p>
		</div>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col sm:flex-row gap-4">
				<select bind:value={selectedPeriod} class="px-4 py-2 border-2 border-blue-500 rounded-lg bg-white text-gray-800 min-w-[180px]">
					<option value="today">Today</option>
					<option value="yesterday">Yesterday</option>
					<option value="this_week">This Week</option>
					<option value="last_week">Last Week</option>
					<option value="this_month">This Month</option>
					<option value="last_month">Last Month</option>
					<option value="this_year">This Year</option>
					<option value="custom">Custom Range</option>
				</select>
			</div>
			
			{#if selectedPeriod === 'custom'}
				<div class="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
					<div class="flex flex-col">
						<label for="startDate" class="text-sm font-medium text-gray-700 mb-1">Start Date</label>
						<input 
							id="startDate"
							type="date" 
							bind:value={customStartDate}
							class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<div class="flex flex-col">
						<label for="endDate" class="text-sm font-medium text-gray-700 mb-1">End Date</label>
						<input 
							id="endDate"
							type="date" 
							bind:value={customEndDate}
							class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>
			{/if}
		</div>
	</header>
	
	{#if isLoading}
		<div class="text-center py-16 text-gray-500 text-lg">Loading reports...</div>
	{:else if error}
		<div class="text-center py-16 text-red-600 text-lg">{error}</div>
	{:else}
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
			<div class="bg-white p-6 rounded-xl shadow-sm text-center border-t-4 border-green-500">
				<h3 class="text-gray-600 text-lg mb-4">Total Income</h3>
				<div class="text-3xl font-bold text-green-600 mb-2">{formatCurrency(getTotalIncome())}</div>
				<p class="text-gray-500">From {getTopTrips().length} trips</p>
			</div>
			
			<div class="bg-white p-6 rounded-xl shadow-sm text-center border-t-4 border-red-500">
				<h3 class="text-gray-600 text-lg mb-4">Total Expenses</h3>
				<div class="text-3xl font-bold text-red-600 mb-2">{formatCurrency(getTotalExpenses(getFilteredExpenses()))}</div>
				<p class="text-gray-500 text-sm">+ Wear & Tear: {formatCurrency(getWearAndTearExpenses())}</p>
				<p class="text-gray-500 text-sm font-semibold mt-1">Total with Wear & Tear: {formatCurrency(getTotalExpensesWithWearAndTear(getFilteredExpenses()))}</p>
				<p class="text-gray-500 text-xs mt-1">({getWearAndTearExpenses() > 0 ? (getWearAndTearExpenses() / WEAR_AND_TEAR_RATE).toFixed(1) : '0'} km × LKR {WEAR_AND_TEAR_RATE})</p>
			</div>
			
			<div class="bg-white p-6 rounded-xl shadow-sm text-center border-t-4 border-blue-500">
				<h3 class="text-gray-600 text-lg mb-4">Net Profit</h3>
				<div class="text-3xl font-bold text-blue-600 mb-2">{formatCurrency(getNetProfit())}</div>
				<p class="text-xs {getProfitPercentage() >= 50 ? 'text-green-600' : 'text-red-600'} mt-1">({getProfitPercentage().toFixed(1)}% profit)</p>
				<p class="text-gray-500 text-sm font-semibold mt-1">- Profit after Wear & Tear: {formatCurrency(getNetProfit() - getWearAndTearExpenses())}</p>
				<p class="text-xs {getProfitPercentageAfterWearAndTear() >= 50 ? 'text-green-600' : 'text-red-600'} mt-1">({getProfitPercentageAfterWearAndTear().toFixed(1)}% profit after wear & tear)</p>
			</div>
			
			<div class="bg-white p-6 rounded-xl shadow-sm text-center border-t-4 border-purple-500">
				<h3 class="text-gray-600 text-lg mb-4">Transactions</h3>
				<div class="text-3xl font-bold text-purple-600 mb-2">{getFilteredExpenses().length}</div>
				<p class="text-gray-500">Expense transactions</p>
			</div>
		</div>
		
		
		<!-- Detailed Breakdown -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
			<div class="bg-white p-6 rounded-xl shadow-sm">
				<h3 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">Top Expenses</h3>
				{#if getTopExpenses(getFilteredExpenses()).length === 0}
					<p class="text-gray-500 italic text-center py-8">No expenses in selected period</p>
				{:else}
					<div class="w-full">
						<div class="space-y-2">
							{#each getTopExpenses(getFilteredExpenses()) as expense}
								<div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-800 truncate">{getCategoryName(expense.category_id)}</p>
									</div>
									<div class="ml-4 flex-shrink-0">
										<p class="text-sm font-bold text-red-600">-{formatCurrency(expense.amount)}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<div class="bg-white p-6 rounded-xl shadow-sm">
				<h3 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">Top Earning Trips</h3>
				{#if getTopTrips().length === 0}
					<p class="text-gray-500 italic text-center py-8">No trips in selected period</p>
				{:else}
					<div class="w-full">
						<div class="space-y-2">
							{#each getTopTrips() as trip}
								<div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-800 truncate">{trip.platform || 'Unknown Platform'}</p>
										<p class="text-xs text-gray-500 mt-1">{new Date(trip.date).toLocaleDateString()}</p>
									</div>
									<div class="ml-4 flex-shrink-0">
										<p class="text-sm font-bold text-green-600">+{formatCurrency((trip.fare || 0) + (trip.tips || 0))}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
		
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<div class="bg-white p-6 rounded-xl shadow-sm">
				<h3 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">Category Breakdown</h3>
				{#if getCategoryBreakdown(getFilteredExpenses()).length === 0}
					<p class="text-gray-500 italic text-center py-8">No data in selected period</p>
				{:else}
					<div class="w-full">
						<div class="space-y-2">
							{#each getCategoryBreakdown(getFilteredExpenses()) as item}
								<div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-800 truncate">{item.name}</p>
									</div>
									<div class="ml-4 flex-shrink-0">
										<p class="text-sm font-bold text-red-600">-{formatCurrency(item.amount)}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<div class="bg-white p-6 rounded-xl shadow-sm">
				<h3 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">Platform Breakdown</h3>
				{#if getPlatformBreakdown().length === 0}
					<p class="text-gray-500 italic text-center py-8">No trips in selected period</p>
				{:else}
					<div class="w-full">
						<div class="space-y-2">
							{#each getPlatformBreakdown() as platform}
								<div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-800 truncate">{platform.name}</p>
										<p class="text-xs text-gray-500 mt-1">{platform.trips} trips</p>
									</div>
									<div class="ml-4 flex-shrink-0">
										<p class="text-sm font-bold text-green-600">+{formatCurrency(platform.earnings)}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Custom range styling */
	input[type="date"] {
		min-width: 140px;
	}
</style>
