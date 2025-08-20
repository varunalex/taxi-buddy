<script lang="ts">
	import { page } from '$app/state';
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';

	let currentUser = $state<any>(null);
	let isLoading = $state(true);
	let activeTab = $state('profile');

	onMount(async () => {
		try {
			currentUser = pb.authStore.model;
			isLoading = false;
		} catch (error) {
			console.error('Error loading user data:', error);
			isLoading = false;
		}
	});

	function navigateTo(tab: string) {
		activeTab = tab;
	}
</script>

<div class="max-w-6xl mx-auto p-6">
	<h1 class="text-3xl font-bold text-gray-800 mb-8">Settings</h1>
	
	{#if isLoading}
		<div class="text-center py-12 text-gray-600 text-lg">Loading settings...</div>
	{:else if !currentUser}
		<div class="text-center py-12 text-red-600 text-lg">Please log in to access settings</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
			<nav class="flex flex-col gap-2 lg:sticky lg:top-6 lg:self-start">
				<button 
					class={`px-4 py-3 rounded-lg text-left transition-colors ${
						activeTab === 'profile' 
							? 'bg-blue-600 text-white' 
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
					}`}
					onclick={() => navigateTo('profile')}
				>
					Profile
				</button>
				<button 
					class={`px-4 py-3 rounded-lg text-left transition-colors ${
						activeTab === 'preferences' 
							? 'bg-blue-600 text-white' 
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
					}`}
					onclick={() => navigateTo('preferences')}
				>
					Preferences
				</button>
				<button 
					class={`px-4 py-3 rounded-lg text-left transition-colors ${
						activeTab === 'platforms' 
							? 'bg-blue-600 text-white' 
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
					}`}
					onclick={() => navigateTo('platforms')}
				>
					Platforms
				</button>
				<button 
					class={`px-4 py-3 rounded-lg text-left transition-colors ${
						activeTab === 'categories' 
							? 'bg-blue-600 text-white' 
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
					}`}
					onclick={() => navigateTo('categories')}
				>
					Categories
				</button>
				<button 
					class={`px-4 py-3 rounded-lg text-left transition-colors ${
						activeTab === 'data' 
							? 'bg-blue-600 text-white' 
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
					}`}
					onclick={() => navigateTo('data')}
				>
					Data Management
				</button>
			</nav>

			<div class="bg-white rounded-xl shadow-md p-8">
				{#if activeTab === 'profile'}
					<div>
						<h2 class="text-2xl font-semibold text-gray-800 mb-6">Profile Settings</h2>
						<form class="space-y-6">
							<div>
								<label for="username" class="block text-sm font-medium text-gray-700 mb-2">Username</label>
								<input 
									type="text" 
									id="username" 
									name="username" 
									value={currentUser.username}
									disabled
									class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 opacity-70"
								/>
							</div>
							<div>
								<label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
								<input 
									type="email" 
									id="email" 
									name="email" 
									value={currentUser.email}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
								<input 
									type="password" 
									id="currentPassword" 
									name="currentPassword" 
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
								<input 
									type="password" 
									id="newPassword" 
									name="newPassword" 
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
								<input 
									type="password" 
									id="confirmPassword" 
									name="confirmPassword" 
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">Update Profile</button>
						</form>
					</div>

				{:else if activeTab === 'preferences'}
					<div>
						<h2 class="text-2xl font-semibold text-gray-800 mb-6">Preferences</h2>
						<form class="space-y-6">
							<div>
								<label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
								<select id="currency" name="currency" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
									<option value="USD">USD ($)</option>
									<option value="EUR">EUR (€)</option>
									<option value="GBP">GBP (£)</option>
									<option value="LKR">LKR (Rs)</option>
									<option value="INR">INR (₹)</option>
								</select>
							</div>
							<div>
								<label for="dateFormat" class="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
								<select id="dateFormat" name="dateFormat" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
									<option value="MM/DD/YYYY">MM/DD/YYYY</option>
									<option value="DD/MM/YYYY">DD/MM/YYYY</option>
									<option value="YYYY-MM-DD">YYYY-MM-DD</option>
								</select>
							</div>
							<div>
								<label for="distanceUnit" class="block text-sm font-medium text-gray-700 mb-2">Distance Unit</label>
								<select id="distanceUnit" name="distanceUnit" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
									<option value="km">Kilometers (km)</option>
									<option value="mi">Miles (mi)</option>
								</select>
							</div>
							<div class="flex items-center gap-3">
								<input type="checkbox" id="notifications" name="notifications" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
								<label for="notifications" class="text-sm font-medium text-gray-700">Enable Email Notifications</label>
							</div>
							<div class="flex items-center gap-3">
								<input type="checkbox" id="weeklyReports" name="weeklyReports" checked class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
								<label for="weeklyReports" class="text-sm font-medium text-gray-700">Send Weekly Reports</label>
							</div>
							<button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">Save Preferences</button>
						</form>
					</div>

				{:else if activeTab === 'platforms'}
					<div>
						<h2 class="text-2xl font-semibold text-gray-800 mb-6">Platform Management</h2>
						<p class="text-gray-600 mb-6">Manage your ride-sharing platforms here.</p>
						<div class="flex gap-4">
							<a href="/platforms" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">View Platforms</a>
							<a href="/platforms/add" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold border border-gray-300">Add New Platform</a>
						</div>
					</div>

				{:else if activeTab === 'categories'}
					<div>
						<h2 class="text-2xl font-semibold text-gray-800 mb-6">Category Management</h2>
						<p class="text-gray-600 mb-6">Manage your expense categories here.</p>
						<div class="flex gap-4">
							<a href="/expenses/categories" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">View Categories</a>
							<a href="/expenses/categories/add" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold border border-gray-300">Add New Category</a>
						</div>
					</div>

				{:else if activeTab === 'data'}
					<div>
						<h2 class="text-2xl font-semibold text-gray-800 mb-6">Data Management</h2>
						<div class="space-y-6">
							<div class="p-6 bg-white border border-gray-200 rounded-lg">
								<h3 class="text-lg font-semibold text-gray-800 mb-2">Export Data</h3>
								<p class="text-gray-600 mb-4 text-sm">Download your data as CSV or JSON for backup or analysis.</p>
								<div class="flex gap-3">
									<button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold border border-gray-300">Export to CSV</button>
									<button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold border border-gray-300">Export to JSON</button>
								</div>
							</div>
							<div class="p-6 bg-white border border-gray-200 rounded-lg">
								<h3 class="text-lg font-semibold text-gray-800 mb-2">Import Data</h3>
								<p class="text-gray-600 mb-4 text-sm">Import data from previous backups or other systems.</p>
								<input type="file" accept=".csv,.json" class="mb-3" />
								<button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold border border-gray-300">Import Data</button>
							</div>
							<div class="p-6 bg-red-50 border border-red-200 rounded-lg">
								<h3 class="text-lg font-semibold text-red-800 mb-2">Danger Zone</h3>
								<p class="text-red-600 mb-4 text-sm">Permanently delete your account and all associated data.</p>
								<button class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold">Delete Account</button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
