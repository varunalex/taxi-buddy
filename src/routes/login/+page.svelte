<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	
	let email = '';
	let password = '';
	let error = '';
	let isLoading = false;
	
	async function handleLogin(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = '';
		
		try {
			await pb.collection('users').authWithPassword(email, password);
			goto('/');
		} catch (err) {
			error = 'Invalid email or password';
			console.error('Login error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	function handleRegister() {
		goto('/register');
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-5">
	<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Taxi Buddy</h1>
			<p class="text-gray-600 dark:text-gray-300">Sign in to track your trips and expenses</p>
		</div>
		
		<form on:submit={handleLogin} class="mb-6">
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 font-medium">
					{error}
				</div>
			{/if}
			
			<div class="mb-5">
				<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Email
				</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					placeholder="Enter your email"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="mb-6">
				<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Password
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					placeholder="Enter your password"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
			
			<button 
				type="submit" 
				disabled={isLoading}
				class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
			>
				{#if isLoading}
					Signing in...
				{:else}
					Sign In
				{/if}
			</button>
		</form>
		
		<div class="text-center text-gray-600 dark:text-gray-300">
			<p>Don't have an account? <button on:click={handleRegister} class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors underline">Create one</button></p>
		</div>
	</div>
</div>
