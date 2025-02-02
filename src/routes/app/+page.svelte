<script lang="ts">
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/utils';
	import { supabase } from '$lib/supabaseClient';
	import { user } from '../../stores/user';
	import { SyncEngine } from '$lib/syncEngine';
	import { onMount } from 'svelte';
	import { syncEngine } from '../../stores/syncStore';
	import CreateModal from '$lib/components/CreateModal.svelte';
	import Habit from '$lib/components/Habit.svelte';
	import { Info } from 'phosphor-svelte';

	let userId = $derived($user?.id);

	const data = syncEngine.data;

	let groupedHabits: { [key: string]: Habit[] } = $derived(
		$data.reduce((acc: { [key: string]: Habit[] }, habit: Habit) => {
			const category = habit.category || 'Uncategorized';
			if (!acc[category]) acc[category] = [];
			acc[category].push(habit);
			return acc;
		}, {})
	);

	let loading: boolean = $state(true);
	$inspect(loading);
	let online: boolean = $state(false);

	onMount(() => {
		loading = false;
	});

	async function handleSignOut() {
		const { error } = await signOut();
		if (!error) {
			goto('/');
		}
	}
</script>

<div class="mb-8 flex items-center justify-between">
	<div class="flex items-center gap-4">
		<h1 class="text-3xl font-bold">Cycles</h1>
		{#if online}
			<div class="bg-success size-2 rounded-full"></div>
		{:else}
			<div class="bg-error size-2 rounded-full"></div>
		{/if}
	</div>
	<div class="flex gap-2">
		<button
			class="btn btn-primary"
			onclick={() => (document.getElementById('habit_modal') as HTMLDialogElement).showModal()}
			>New Habit</button
		>
		<button class="btn btn-soft btn-secondary" onclick={handleSignOut}>Sign out</button>
	</div>
</div>

{#if user && !loading}
	{#if Object.keys(groupedHabits).length === 0}
		<div class="alert alert-info">
			<Info />
			<span>You haven't created any habits yet. Start by creating your first one!</span>
		</div>
	{:else}
		<div class="">
			{#each Object.entries(groupedHabits) as [category, elements] (category)}
				<div class="divider">{category}</div>
				{#each elements as habit}
					<Habit {habit} />
				{/each}
			{/each}
		</div>
	{/if}
{/if}

<CreateModal />

<svelte:window bind:online />

<style>
	.fraction {
		font-variation-settings:
			'MONO' 0,
			'CASL' 0.5;
		font-variant-numeric: diagonal-fractions;
	}
</style>
