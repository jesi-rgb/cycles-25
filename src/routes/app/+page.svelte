<script lang="ts">
	import { goto } from '$app/navigation';
	import { signOut, updateTimesAndReset } from '$lib/utils';
	import { user } from '../../stores/user';
	import { onMount } from 'svelte';
	import { syncEngine } from '../../stores/syncStore';
	import CreateModal from '$lib/components/CreateModal.svelte';
	import Habit from '$lib/components/Habit.svelte';
	import { Info, PlusCircle } from 'phosphor-svelte';
	import type { HabitType } from '$lib/types';
	import EditModal from '$lib/components/EditModal.svelte';

	const data = syncEngine.data;

	let groupedHabits: { [key: string]: HabitType[] } = $derived(
		$data.reduce((acc: { [key: string]: HabitType[] }, habit: HabitType) => {
			const category = habit.category || 'Uncategorized';
			if (!acc[category]) acc[category] = [];
			acc[category].push(habit);
			return acc;
		}, {})
	);

	let loading: boolean = $state(true);
	let online: boolean = $state(false);

	onMount(() => {
		setTimeout(() => (loading = false), 1);

		$data.map(async (habit) => {
			console.log(habit);
			await updateTimesAndReset(habit);
		});
	});

	async function handleSignOut() {
		const { error } = await signOut();
		if (!error) {
			goto('/');
		}
	}
</script>

<main>
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<h1 class="text-3xl font-bold">Cycles</h1>
			{#if online}
				<div class="bg-success size-2 rounded-full"></div>
			{:else}
				<div class="bg-error size-2 rounded-full"></div>
			{/if}
		</div>
		<div class="flex gap-2"></div>
	</div>

	{#if user && $data.length > 0}
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

	<button
		class="btn btn-primary btn-circle btn-soft fixed right-10 bottom-10"
		onclick={() => (document.getElementById('create_modal') as HTMLDialogElement).showModal()}
	>
		<PlusCircle weight="bold" size={24} />
	</button>
</main>

<CreateModal />

<svelte:window bind:online />
