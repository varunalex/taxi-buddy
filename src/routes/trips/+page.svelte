<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency, formatDistance, formatDuration } from '$lib/pocketbase';
	import type { Trip, Platform, Expense } from '$lib/pocketbase';
	import {
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	
	let trips = $state<Trip[]>([]);
	let filteredTrips = $state<Trip[]>([]);
	let platforms = $state<Platform[]>([]);
	let expenses = $state<Expense[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	
	// Modal state
	let showTripModal = $state(false);
	let selectedTrip = $state<Trip | null>(null);
	let selectedTripExpenses = $state<Expense[]>([]);
	
	// Filtering and pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(25);
	let dateFilter = $state<string>('');
	let platformFilter = $state<string>('');
	
	// Get unique platforms for filter dropdown
	let platformOptions = $state<string[]>([]);
	
	async function loadTrips() {
		try {
			isLoading = true;
			// Get trips for the current user
			const records = await pb.collection('trips').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: '-date,-created'
			});
			trips = records as unknown as Trip[];
			filteredTrips = [...trips];
			
			// Load platforms for the current user
			const platformRecords = await pb.collection('platforms').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});
			platforms = platformRecords as unknown as Platform[];
			
			// Load expenses for the current user
			const expenseRecords = await pb.collection('expenses').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: '-date'
			});
			expenses = expenseRecords as unknown as Expense[];
			
			// Extract unique platform IDs for filter dropdown
			platformOptions = [...new Set(trips.map(trip => trip.platform))].sort();
		} catch (err) {
			console.error('Error loading trips:', err);
			error = 'Failed to load trips';
		} finally {
			isLoading = false;
		}
	}
	
	function getTripExpenses(tripId: string): number {
		const tripExpenses = expenses.filter(expense => expense.trip_id === tripId);
		return tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
	}
	
	function getTripPaid(trip: Trip): number {
		return trip.fare + trip.tips;
	}
	
function getTripProfit(trip: Trip): number {
  const paid = getTripPaid(trip);
  const expenses = getTripExpenses(trip.id);
  return paid - expenses;
}

function getProfitPercentage(trip: Trip): number {
  const paid = getTripPaid(trip);
  const expenses = getTripExpenses(trip.id);
  
  if (paid === 0) return 0; // If no income, percentage is 0
  
  return ((paid - expenses) / paid) * 100;
}

// Global wear and tear rate (LKR per km)
const WEAR_AND_TEAR_RATE = Number(import.meta.env.VITE_WEAR_AND_TEAR_RATE) || 15;

// Calculate wear and tear cost for a single trip
function getWearAndTearCost(trip: Trip): number {
  return (trip.distance || 0) * WEAR_AND_TEAR_RATE;
}

// Calculate profit after wear and tear
function getProfitAfterWearAndTear(trip: Trip): number {
  return getTripProfit(trip) - getWearAndTearCost(trip);
}

// Calculate profit percentage after wear and tear
function getProfitPercentageAfterWearAndTear(trip: Trip): number {
  const paid = getTripPaid(trip);
  const expenses = getTripExpenses(trip.id);
  const wearAndTear = getWearAndTearCost(trip);
  
  if (paid === 0) return 0; // If no income, percentage is 0
  
  return ((paid - expenses - wearAndTear) / paid) * 100;
}
	
	function viewTripDetails(trip: Trip) {
		selectedTrip = trip;
		selectedTripExpenses = expenses.filter(expense => expense.trip_id === trip.id);
		showTripModal = true;
	}
	
	function applyFilters() {
		let filtered = [...trips];
		
		// Apply date filter
		if (dateFilter) {
			const filterDate = new Date(dateFilter);
			filtered = filtered.filter(trip => {
				const tripDate = new Date(trip.date);
				return tripDate.toDateString() === filterDate.toDateString();
			});
		}
		
		// Apply platform filter
		if (platformFilter) {
			filtered = filtered.filter(trip => trip.platform === platformFilter);
		}
		
		filteredTrips = filtered;
		currentPage = 1; // Reset to first page when filters change
	}
	
	function clearFilters() {
		dateFilter = '';
		platformFilter = '';
		filteredTrips = [...trips];
		currentPage = 1;
	}
	
	// Calculate pagination
	let totalPages = $state(1);
	let paginatedTrips = $state<Trip[]>([]);
	
	$effect(() => {
		totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		paginatedTrips = filteredTrips.slice(start, end);
	});
	
	async function deleteTrip(tripId: string) {
		if (!confirm('Are you sure you want to delete this trip? This will also delete all expenses associated with this trip.')) return;
		
		try {
			// First, find and delete all expenses associated with this trip
			const tripExpenses = await pb.collection('expenses').getFullList({
				filter: `trip_id = "${tripId}"`
			});
			
			// Delete all associated expenses
			for (const expense of tripExpenses) {
				await pb.collection('expenses').delete(expense.id);
			}
			
			// Then delete the trip
			await pb.collection('trips').delete(tripId);
			
			// Remove from local state
			trips = trips.filter(trip => trip.id !== tripId);
			filteredTrips = filteredTrips.filter(trip => trip.id !== tripId);
		} catch (err) {
			console.error('Error deleting trip and expenses:', err);
			alert('Failed to delete trip and associated expenses. Please try again.');
		}
	}
	
function getPlatformName(platformId: string): string {
	if (!platformId) return 'Unknown';
	const platform = platforms.find(p => p.id === platformId);
	return platform?.name || 'Unknown Platform';
}
	
	// Load trips on component mount
	$effect(() => {
		loadTrips();
	});
	
	// Apply filters when filter values change
	$effect(() => {
		applyFilters();
	});
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<header class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-900">My Trips</h1>
		<a href="/trips/add" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2">
			<span>➕</span>
			<span>Add Trip</span>
		</a>
	</header>
	
	{#if isLoading}
		<div class="text-center py-12 text-gray-600 text-lg">Loading trips...</div>
	{:else if error}
		<div class="text-center py-12 text-red-600 text-lg">{error}</div>
	{:else if trips.length === 0}
		<div class="text-center py-16 px-4">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">No trips yet</h2>
			<p class="text-gray-600 mb-8">Start by adding your first trip to track your earnings!</p>
			<a href="/trips/add" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold inline-block">
				Add Your First Trip
			</a>
		</div>
	{:else}
		<!-- Filter Section -->
		<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Filter Trips</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
					<input
						type="date"
						bind:value={dateFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Platform</label>
					<select
						bind:value={platformFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
					>
						<option value="">All Platforms</option>
						{#each platformOptions as platformId}
							<option value={platformId}>{getPlatformName(platformId)}</option>
						{/each}
					</select>
				</div>
								<div class="flex items-end">
					<button
						type="button"
						on:click={() => clearFilters()}
						class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
					>
						Clear Filters
					</button>
				</div>
			</div>
			<div class="text-sm text-gray-600">
				Showing {filteredTrips.length} of {trips.length} trips
			</div>
		</div>
		
		<!-- Summary Stats -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Total Trips</div>
				<div class="text-2xl font-bold text-gray-900">{filteredTrips.length}</div>
			</div>
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Total Distance</div>
				<div class="text-2xl font-bold text-gray-900">
					{formatDistance(filteredTrips.reduce((sum, trip) => sum + trip.distance, 0))}
				</div>
			</div>
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Total Earnings</div>
				<div class="text-2xl font-bold text-green-600">
					{formatCurrency(filteredTrips.reduce((sum, trip) => sum + trip.fare + trip.tips, 0))}
				</div>
			</div>
			<div class="bg-white p-4 rounded-lg shadow-sm text-center">
				<div class="text-sm text-gray-500 mb-1">Avg. per Trip</div>
				<div class="text-2xl font-bold text-blue-600">
					{filteredTrips.length > 0 ? formatCurrency(
						filteredTrips.reduce((sum, trip) => sum + trip.fare + trip.tips, 0) / filteredTrips.length
					) : formatCurrency(0)}
				</div>
			</div>
		</div>
		
		<!-- Table Section -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<Table class="min-w-full">
					<TableHead class="text-xs text-gray-700 uppercase bg-gray-50">
						<TableHeadCell class="px-4 py-3 sm:px-6">Date</TableHeadCell>
						<TableHeadCell class="px-4 py-3 sm:px-6 hidden sm:table-cell">Platform</TableHeadCell>
						<TableHeadCell class="px-4 py-3 sm:px-6">Distance</TableHeadCell>
						<TableHeadCell class="px-4 py-3 sm:px-6">Paid</TableHeadCell>
						<TableHeadCell class="px-4 py-3 sm:px-6 hidden md:table-cell">Expenses</TableHeadCell>
						<TableHeadCell class="px-4 py-3 sm:px-6">Profit</TableHeadCell>
						<TableHeadCell class="px-4 py-3 sm:px-6">Actions</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each paginatedTrips as trip}
							<TableBodyRow class="bg-white border-b hover:bg-gray-50">
								<TableBodyCell class="px-4 py-4 sm:px-6 whitespace-nowrap text-sm">
									{new Date(trip.date).toLocaleDateString()}
								</TableBodyCell>
								<TableBodyCell class="px-4 py-4 sm:px-6 hidden sm:table-cell">
									<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
										{getPlatformName(trip.platform)}
									</span>
								</TableBodyCell>
								<TableBodyCell class="px-4 py-4 sm:px-6 text-sm">
									{formatDistance(trip.distance)}
								</TableBodyCell>
								<TableBodyCell class="px-4 py-4 sm:px-6 font-medium text-green-600 text-sm">
									{formatCurrency(getTripPaid(trip))}
								</TableBodyCell>
								<TableBodyCell class="px-4 py-4 sm:px-6 font-medium text-red-600 text-sm hidden md:table-cell">
									{formatCurrency(getTripExpenses(trip.id))}
								</TableBodyCell>
								<TableBodyCell class="px-4 py-4 sm:px-6 font-bold text-sm {getTripProfit(trip) >= 0 ? 'text-green-600' : 'text-red-600'}">
									{formatCurrency(getTripProfit(trip))}
									<br>
									<span class="text-xs font-normal {getProfitPercentage(trip) >= 50 ? 'text-green-600' : 'text-red-600'}">
										({getProfitPercentage(trip).toFixed(1)}%)
									</span>
								</TableBodyCell>
								<TableBodyCell class="px-4 py-4 sm:px-6">
									<div class="flex gap-1 sm:gap-2 flex-wrap">
										<button
											type="button"
											on:click={() => viewTripDetails(trip)}
											class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
											title="View details"
										>
											👁️
										</button>
										<a
											href={`/trips/${trip.id}`}
											class="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors no-underline"
											title="Edit trip"
										>
											✏️
										</a>
										<button
											type="button"
											on:click={() => deleteTrip(trip.id)}
											class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
											title="Delete trip"
										>
											🗑️
										</button>
									</div>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</div>
			
			<!-- Pagination -->
		{#if totalPages > 1}
			<div class="px-6 py-4 border-t border-gray-200">
				<div class="flex justify-center items-center gap-2">
					<button
						type="button"
						on:click={() => currentPage = Math.max(1, currentPage - 1)}
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
						on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
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
</div>

<!-- Trip Details Modal -->
	{#if showTripModal && selectedTrip}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300">
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<!-- Modal Header -->
				<div class="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 class="text-2xl font-bold text-gray-900">Trip Details</h2>
					<button
						type="button"
						on:click={() => showTripModal = false}
						class="text-gray-400 hover:text-gray-600 text-2xl font-semibold"
					>
						×
					</button>
				</div>
				
				<!-- Modal Content -->
				<div class="p-6 space-y-6">
					<!-- Trip Information -->
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Trip Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-500">Date</label>
								<p class="text-sm text-gray-900">{new Date(selectedTrip.date).toLocaleDateString()}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-500">Platform</label>
								<p class="text-sm text-gray-900">{getPlatformName(selectedTrip.platform)}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-500">Distance</label>
								<p class="text-sm text-gray-900">{formatDistance(selectedTrip.distance)}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-500">Duration</label>
								<p class="text-sm text-gray-900">{formatDuration(selectedTrip.duration)}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-500">Fare</label>
								<p class="text-sm text-green-600 font-medium">{formatCurrency(selectedTrip.fare)}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-500">Tips</label>
								<p class="text-sm text-green-600 font-medium">{formatCurrency(selectedTrip.tips)}</p>
							</div>
						</div>
					</div>
					
					<!-- Associated Expenses -->
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Associated Expenses</h3>
						{#if selectedTripExpenses.length > 0}
							<div class="bg-gray-50 rounded-lg p-4">
								{#each selectedTripExpenses as expense}
									<div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
										<div>
											<p class="text-sm font-medium text-gray-900">{expense.description}</p>
											<p class="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
										</div>
										<p class="text-sm font-medium text-red-600">{formatCurrency(expense.amount)}</p>
									</div>
								{/each}
								<div class="flex justify-between items-center pt-3 mt-3 border-t border-gray-300">
									<p class="text-sm font-medium text-gray-900">Total Expenses</p>
									<p class="text-sm font-bold text-red-600">{formatCurrency(getTripExpenses(selectedTrip.id))}</p>
								</div>
							</div>
						{:else}
							<p class="text-sm text-gray-500 italic">No expenses associated with this trip</p>
						{/if}
					</div>
					
					<!-- Summary -->
					<div class="bg-blue-50 rounded-lg p-4">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
						<div class="space-y-2">
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600">Total Paid:</span>
								<span class="text-sm font-medium text-green-600">{formatCurrency(getTripPaid(selectedTrip))}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600">Total Expenses:</span>
								<span class="text-sm font-medium text-red-600">{formatCurrency(getTripExpenses(selectedTrip.id))}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600">Wear & Tear Cost:</span>
								<span class="text-sm font-medium text-orange-600">-{formatCurrency(getWearAndTearCost(selectedTrip))}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600">Profit Percentage:</span>
								<span class="text-sm font-medium {getProfitPercentage(selectedTrip) >= 50 ? 'text-green-600' : 'text-red-600'}">
									{getProfitPercentage(selectedTrip).toFixed(1)}% profit
								</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600">Profit after Wear & Tear:</span>
								<span class="text-sm font-medium {getProfitAfterWearAndTear(selectedTrip) >= 0 ? 'text-green-600' : 'text-red-600'}">
									{formatCurrency(getProfitAfterWearAndTear(selectedTrip))}
								</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600">Profit % after Wear & Tear:</span>
								<span class="text-sm font-medium {getProfitPercentageAfterWearAndTear(selectedTrip) >= 50 ? 'text-green-600' : 'text-red-600'}">
									{getProfitPercentageAfterWearAndTear(selectedTrip).toFixed(1)}% profit
								</span>
							</div>
							<div class="flex justify-between items-center pt-2 border-t border-gray-300">
								<span class="text-sm font-medium text-gray-900">Profit:</span>
								<span class="text-sm font-bold {getTripProfit(selectedTrip) >= 0 ? 'text-green-600' : 'text-red-600'}">
									{formatCurrency(getTripProfit(selectedTrip))}
								</span>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Modal Footer -->
				<div class="flex justify-end gap-3 p-6 border-t border-gray-200">
					<button
						type="button"
						on:click={() => showTripModal = false}
						class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
