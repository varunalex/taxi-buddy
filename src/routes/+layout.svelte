<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import "../app.css";

	let { children } = $props();
	
	// Check authentication status
	let isAuthenticated = $state(pb.authStore.isValid);
	let mobileMenuOpen = $state(false);
	
	// Listen for auth changes
	$effect(() => {
		const unsubscribe = pb.authStore.onChange(() => {
			isAuthenticated = pb.authStore.isValid;
		});
		
		return () => unsubscribe();
	});
	
	// Redirect to login if not authenticated (except for login page)
	$effect(() => {
		if (!isAuthenticated && typeof window !== 'undefined') {
			const currentPath = window.location.pathname;
			if (currentPath !== '/login') {
				goto('/login');
			}
		}
	});
	
	function handleLogout() {
		pb.authStore.clear();
		goto('/login');
	}
	
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

{#if isAuthenticated}
	<div class="min-h-screen flex flex-col">
		<header class="bg-gray-800 text-white shadow-md">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between h-16">
					<div class="flex items-center">
						<h1 class="text-xl font-bold">Taxi Buddy</h1>
					</div>
					
					<!-- Desktop Navigation -->
					<nav class="hidden md:flex gap-6 items-center">
						<a href="/" class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</a>
						<a href="/trips" class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Trips</a>
						<a href="/expenses" class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Expenses</a>
						<a href="/reports" class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Reports</a>
						<a href="/settings" class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Settings</a>
					</nav>
					
					<div class="hidden md:flex items-center gap-4">
						<button onclick={handleLogout} class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors text-sm">
							Logout
						</button>
					</div>
					
					<!-- Mobile menu button -->
					<div class="md:hidden flex items-center">
						<button onclick={toggleMobileMenu} class="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
							<span class="sr-only">Open main menu</span>
							<!-- Hamburger icon -->
							<svg class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
					</div>
				</div>
			</div>
			
			<!-- Mobile Navigation Menu -->
			{#if mobileMenuOpen}
				<div class="md:hidden bg-gray-800 border-t border-gray-700">
					<div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
						<a href="/" onclick={closeMobileMenu} class="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-colors">Dashboard</a>
						<a href="/trips" onclick={closeMobileMenu} class="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-colors">Trips</a>
						<a href="/expenses" onclick={closeMobileMenu} class="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-colors">Expenses</a>
						<a href="/reports" onclick={closeMobileMenu} class="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-colors">Reports</a>
						<a href="/settings" onclick={closeMobileMenu} class="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-colors">Settings</a>
						<button onclick={() => { handleLogout(); closeMobileMenu(); }} class="w-full text-left bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-base font-medium transition-colors">
							Logout
						</button>
					</div>
				</div>
			{/if}
		</header>
		
		<main class="flex-1 bg-gray-50">
			{@render children?.()}
		</main>
	</div>
{:else}
	{@render children?.()}
{/if}
