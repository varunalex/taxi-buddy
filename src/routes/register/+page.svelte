<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	
	let email = '';
	let password = '';
	let passwordConfirm = '';
	let secureKey = '';
	let error = '';
	let isLoading = false;
	
	async function handleRegister(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = '';
		
		// Validate secure key
		if (secureKey !== '2019+') {
			error = 'Invalid secure key';
			isLoading = false;
			return;
		}
		
		// Validate passwords match
		if (password !== passwordConfirm) {
			error = 'Passwords do not match';
			isLoading = false;
			return;
		}
		
		// Validate password length
		if (password.length < 8) {
			error = 'Password must be at least 8 characters long';
			isLoading = false;
			return;
		}
		
		try {
			// Create the user in PocketBase
			const userData = {
				email: email,
				password: password,
				passwordConfirm: passwordConfirm,
				emailVisibility: true
			};
			
			await pb.collection('users').create(userData);
			alert('Account created successfully! You can now sign in.');
			goto('/login');
			
		} catch (err: any) {
			console.error('Registration error:', err);
			
			if (err?.data?.data?.email?.code === 'validation_invalid_email') {
				error = 'Please enter a valid email address';
			} else if (err?.data?.data?.email?.code === 'validation_not_unique') {
				error = 'This email is already registered';
			} else if (err?.data?.data?.password?.code === 'validation_too_short') {
				error = 'Password must be at least 8 characters long';
			} else {
				error = 'Failed to create account. Please try again.';
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-5">
	<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
			<p class="text-gray-600 dark:text-gray-300">Join Taxi Buddy to track your trips and expenses</p>
		</div>
		
		<form on:submit={handleRegister} class="mb-6">
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
			
			<div class="mb-5">
				<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Password
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					placeholder="Enter your password (min 8 characters)"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="mb-5">
				<label for="passwordConfirm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Confirm Password
				</label>
				<input
					id="passwordConfirm"
					type="password"
					bind:value={passwordConfirm}
					required
					placeholder="Confirm your password"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
			
			<div class="mb-6">
				<label for="secureKey" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Secure Key
				</label>
				<input
					id="secureKey"
					type="text"
					bind:value={secureKey}
					required
					placeholder="Enter the secure key"
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<small class="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
					Contact administrator for the secure key
				</small>
			</div>
			
			<button 
				type="submit" 
				disabled={isLoading}
				class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
			>
				{#if isLoading}
					Creating Account...
				{:else}
					Create Account
				{/if}
			</button>
		</form>
		
		<div class="text-center text-gray-600 dark:text-gray-300">
			<p>Already have an account? <a href="/login" class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors">Sign in</a></p>
		</div>
	</div>
</div>
