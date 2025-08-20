<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { formatCurrency, formatDistance, formatDuration } from '$lib/pocketbase';
	import type { Trip, Platform } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	
	let trip = $state<Trip | null>(null);
	let platforms = $state<Platform[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let isSubmitting = $state(false);
	
	let formData = $state({
		date: '',
		start_time: '',
		duration: '',
		distance: '',
		fuel_used: '',
		fare: '',
		tips: '',
		platform: '',
		notes: ''
	});
	
	async function loadTrip(tripId: string) {
		try {
			const record = await pb.collection('trips').getOne(tripId);
			trip = record as unknown as Trip;
			
			// Populate form data
			// Convert date to YYYY-MM-DD format for HTML date input
			const tripDate = new Date(trip.date);
			formData.date = tripDate.toISOString().split('T')[0];
			formData.start_time = trip.start_time || '08:00';
			formData.duration = trip.duration.toString();
			formData.distance = trip.distance.toString();
			formData.fuel_used = trip.fuel_used?.toString() || '';
			formData.fare = trip.fare.toString();
			formData.tips = trip.tips?.toString() || '';
			formData.platform = trip.platform;
			formData.notes = trip.notes || '';
		} catch (err) {
			console.error('Error loading trip:', err);
			error = 'Failed to load trip';
		}
	}
	
	async function loadPlatforms() {
		try {
			const records = await pb.collection('platforms').getFullList({
				filter: `driver_id = "${pb.authStore.model?.id}"`,
				sort: 'name'
			});
			platforms = records as unknown as Platform[];
		} catch (err) {
			console.error('Error loading platforms:', err);
			error = 'Failed to load platforms';
		}
	}
	
	function calculateTotal(): number {
		const fare = parseFloat(formData.fare) || 0;
		const tips = parseFloat(formData.tips) || 0;
		return fare + tips;
	}
	
	function validateForm(): boolean {
		if (!formData.platform) {
			alert('Please select a platform');
			return false;
		}
		
		if (!formData.date) {
			alert('Please select a date');
			return false;
		}
		
		if (!formData.duration || parseFloat(formData.duration) <= 0) {
			alert('Please enter a valid duration greater than 0');
			return false;
		}
		
		if (!formData.distance || parseFloat(formData.distance) < 0) {
			alert('Please enter a valid distance');
			return false;
		}
		
		if (!formData.fare || parseFloat(formData.fare) < 0) {
			alert('Please enter a valid fare amount');
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
				date: formData.date,
				start_time: formData.start_time,
				duration: parseFloat(formData.duration),
				distance: parseFloat(formData.distance),
				fuel_used: formData.fuel_used ? parseFloat(formData.fuel_used) : 0,
				fare: parseFloat(formData.fare),
				tips: formData.tips ? parseFloat(formData.tips) : 0,
				platform: formData.platform,
				notes: formData.notes
			};
			
			if (!page.params.id) {
				throw new Error('Trip ID is required');
			}
			
			await pb.collection('trips').update(page.params.id, data);
			
			// Redirect back to trips list
			window.location.href = '/trips';
		} catch (err) {
			console.error('Error updating trip:', err);
			alert('Failed to update trip. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}
	
	async function deleteTrip() {
		if (!confirm('Are you sure you want to delete this trip? This will also delete all expenses associated with this trip.')) return;
		
		try {
			if (!page.params.id) {
				throw new Error('Trip ID is required');
			}
			
			// First, find and delete all expenses associated with this trip
			const expenses = await pb.collection('expenses').getFullList({
				filter: `trip_id = "${page.params.id}"`
			});
			
			// Delete all associated expenses
			for (const expense of expenses) {
				await pb.collection('expenses').delete(expense.id);
			}
			
			// Then delete the trip
			await pb.collection('trips').delete(page.params.id);
			window.location.href = '/trips';
		} catch (err) {
			console.error('Error deleting trip and expenses:', err);
			alert('Failed to delete trip and associated expenses. Please try again.');
		}
	}
	
	onMount(async () => {
		if (!page.params.id) {
			error = 'Trip ID is required';
			isLoading = false;
			return;
		}
		
		try {
			await Promise.all([
				loadTrip(page.params.id),
				loadPlatforms()
			]);
		} catch (err) {
			console.error('Error loading data:', err);
			error = 'Failed to load trip data';
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Edit Trip</h1>
		<a href="/trips" class="text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
			← Back to Trips
		</a>
	</header>
	
	{#if isLoading}
		<div class="text-center py-16 text-gray-600 text-lg">Loading...</div>
	{:else if error}
		<div class="text-center py-16 text-red-600 text-lg">{error}</div>
	{:else if !trip}
		<div class="text-center py-16 text-red-600 text-lg">Trip not found</div>
	{:else}
		<form onsubmit={handleSubmit} class="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<div class="space-y-2">
					<label for="date" class="block text-sm font-semibold text-gray-700">Date *</label>
					<input
						id="date"
						type="date"
						bind:value={formData.date}
						required
						disabled={isSubmitting}
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
						disabled={isSubmitting}
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
						disabled={isSubmitting}
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
						disabled={isSubmitting}
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
						disabled={isSubmitting}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
					/>
				</div>
				
				<div class="space-y-2">
					<label for="platform" class="block text-sm font-semibold text-gray-700">Platform *</label>
					<select
						id="platform"
						bind:value={formData.platform}
						required
						disabled={isSubmitting}
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
						disabled={isSubmitting}
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
						disabled={isSubmitting}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
					/>
				</div>
			</div>
			
			<div class="bg-gray-50 p-6 rounded-lg mb-8">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<span class="text-gray-700">Fare:</span>
						<span class="font-medium text-gray-900">${(parseFloat(formData.fare) || 0).toFixed(2)}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-gray-700">Tips:</span>
						<span class="font-medium text-gray-900">${(parseFloat(formData.tips) || 0).toFixed(2)}</span>
					</div>
					<div class="flex justify-between items-center pt-3 border-t border-gray-200">
						<span class="font-semibold text-gray-900">Total:</span>
						<span class="font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
					</div>
				</div>
			</div>
			
			<div class="space-y-2 mb-8">
				<label for="notes" class="block text-sm font-semibold text-gray-700">Notes</label>
				<textarea
					id="notes"
					bind:value={formData.notes}
					placeholder="Any additional notes about this trip..."
					rows="3"
					disabled={isSubmitting}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
				></textarea>
			</div>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-between">
				<button type="button" onclick={deleteTrip} disabled={isSubmitting} class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
					Delete Trip
				</button>
				<div class="flex flex-col sm:flex-row gap-3">
					<button type="button" onclick={() => window.history.back()} class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
						{#if isSubmitting}
							Updating...
						{:else}
							Update Trip
						{/if}
					</button>
				</div>
			</div>
		</form>
	{/if}
</div>
