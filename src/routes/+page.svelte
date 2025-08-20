<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency, formatDistance } from '$lib/pocketbase';
	import type { Trip, Expense, Platform, ExpenseCategory } from '$lib/pocketbase';
	import {
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { onMount } from 'svelte';
	
	let today = new Date().toISOString().split('T')[0];
	let todayStats = $state({
		trips: 0,
		expenses: 0
	});
	let recentTrips = $state<Trip[]>([]);
	let recentExpenses = $state<Expense[]>([]);
	let platforms = $state<Platform[]>([]);
	let categories = $state<ExpenseCategory[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	
	async function loadDashboardData() {
		try {
			if (!pb.authStore.isValid) {
				isLoading = false;
				return;
			}
			
			const todayStart = new Date(today);
			todayStart.setHours(0, 0, 0, 0);
			const todayEnd = new Date(today);
			todayEnd.setHours(23, 59, 59, 999);
			
			// Get today's trips
			const trips = await pb.collection('trips').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}" && date >= "${todayStart.toISOString()}" && date <= "${todayEnd.toISOString()}"`
			});
			
			// Get today's expenses
			const expenses = await pb.collection('expenses').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}" && date >= "${todayStart.toISOString()}" && date <= "${todayEnd.toISOString()}"`
			});
			
			const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
			
			todayStats = {
				trips: trips.length,
				expenses: totalExpenses
			};
			
			// Get recent trips (last 5)
			const recentTripsData = await pb.collection('trips').getList(1, 5, {
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: '-date,-created'
			});
			recentTrips = recentTripsData.items as unknown as Trip[];
			
			// Get recent expenses (last 5)
			const recentExpensesData = await pb.collection('expenses').getList(1, 5, {
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: '-date,-created'
			});
			recentExpenses = recentExpensesData.items as unknown as Expense[];
			
			// Load platforms for platform names
			const platformRecords = await pb.collection('platforms').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});
			platforms = platformRecords as unknown as Platform[];
			
			// Load categories for category names
			const categoryRecords = await pb.collection('expense_categories').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});
			categories = categoryRecords as unknown as ExpenseCategory[];
			
		} catch (err) {
			console.error('Error loading dashboard data:', err);
			error = 'Failed to load dashboard data';
		} finally {
			isLoading = false;
		}
	}
	
	// Helper functions
	function getPlatformName(platformId: string): string {
		if (!platformId) return 'Unknown';
		const platform = platforms.find(p => p.id === platformId);
		return platform?.name || platformId;
	}
	
	function getCategoryName(categoryId: string): string {
		const category = categories.find(cat => cat.id === categoryId);
		return category?.name || 'Unknown Category';
	}
	
	onMount(() => {
		loadDashboardData();
	});
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<header class="text-center mb-10">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">Taxi Buddy</h1>
		<p class="text-xl text-gray-600">Your driving companion for tracking expenses</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
		<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
			<div class="text-3xl">🚕</div>
			<div>
				<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Today's Trips</h3>
				<p class="text-2xl font-bold text-gray-900">{todayStats.trips}</p>
			</div>
		</div>

		<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
			<div class="text-3xl">⛽</div>
			<div>
				<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Expenses</h3>
				<p class="text-2xl font-bold text-gray-900">{formatCurrency(todayStats.expenses)}</p>
			</div>
		</div>
	</div>

	<div class="mb-10">
		<h2 class="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<a href="/trips/add" class="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl text-center transition-colors flex flex-col items-center gap-3">
				<span class="text-2xl">➕</span>
				<span class="font-medium">Add Trip</span>
			</a>
			<a href="/expenses/add" class="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl text-center transition-colors flex flex-col items-center gap-3">
				<span class="text-2xl">�</span>
				<span class="font-medium">Add Expense</span>
			</a>
			<a href="/reports" class="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl text-center transition-colors flex flex-col items-center gap-3">
				<span class="text-2xl">📊</span>
				<span class="font-medium">View Reports</span>
			</a>
			<a href="/settings" class="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl text-center transition-colors flex flex-col items-center gap-3">
				<span class="text-2xl">⚙️</span>
				<span class="font-medium">Settings</span>
			</a>
		</div>
	</div>

	<div class="space-y-8">
		<!-- Recent Trips Section -->
		<div>
			<h3 class="text-xl font-semibold text-gray-900 mb-4">Recent Trips</h3>
			{#if recentTrips.length === 0}
				<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
					<p class="text-gray-500">No recent trips found</p>
				</div>
			{:else}
				<Table class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<TableHead class="text-xs text-gray-700 uppercase bg-gray-50">
						<TableHeadCell class="px-6 py-3">Date</TableHeadCell>
						<TableHeadCell class="px-6 py-3">Platform</TableHeadCell>
						<TableHeadCell class="px-6 py-3">Distance</TableHeadCell>
						<TableHeadCell class="px-6 py-3">Fare</TableHeadCell>
						<TableHeadCell class="px-6 py-3">Tips</TableHeadCell>
						<TableHeadCell class="px-6 py-3">Total</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each recentTrips as trip}
							<TableBodyRow class="bg-white border-b hover:bg-gray-50">
								<TableBodyCell class="px-6 py-4 whitespace-nowrap">
									{new Date(trip.date).toLocaleDateString()}
								</TableBodyCell>
								<TableBodyCell class="px-6 py-4">
									<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
										{getPlatformName(trip.platform)}
									</span>
								</TableBodyCell>
								<TableBodyCell class="px-6 py-4">{formatDistance(trip.distance)}</TableBodyCell>
								<TableBodyCell class="px-6 py-4 font-medium text-green-600">
									{formatCurrency(trip.fare)}
								</TableBodyCell>
								<TableBodyCell class="px-6 py-4 font-medium text-green-600">
									{formatCurrency(trip.tips)}
								</TableBodyCell>
								<TableBodyCell class="px-6 py-4 font-bold text-green-600">
									{formatCurrency(trip.fare + trip.tips)}
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
				<div class="text-right mt-2">
					<a href="/trips" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
						View All Trips →
					</a>
				</div>
			{/if}
		</div>

		<!-- Recent Expenses Section -->
		<div>
			<h3 class="text-xl font-semibold text-gray-900 mb-4">Recent Expenses</h3>
			{#if recentExpenses.length === 0}
				<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
					<p class="text-gray-500">No recent expenses found</p>
				</div>
			{:else}
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full text-sm text-left text-gray-500">
							<thead class="text-xs text-gray-700 uppercase bg-gray-50">
								<tr>
									<th scope="col" class="px-6 py-3">Date</th>
									<th scope="col" class="px-6 py-3">Category</th>
									<th scope="col" class="px-6 py-3">Amount</th>
									<th scope="col" class="px-6 py-3">Description</th>
								</tr>
							</thead>
							<tbody>
								{#each recentExpenses as expense}
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
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				<div class="text-right mt-2">
					<a href="/expenses" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
						View All Expenses →
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>
