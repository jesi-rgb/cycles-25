<script lang="ts">
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/utils';
	import { supabase } from '$lib/supabaseClient';
	import { user } from '../../stores/user';
	import { SyncEngine } from '$lib/syncEngine';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	let userId = $derived($user?.id);

	interface Habit {
		id: string;
		title: string;
		category: string;
		target_count: number;
		current_count: number;
		created_by: string;
		cycle: 'daily' | 'weekly';
	}

	const syncEngine = new SyncEngine<Habit>(supabase, 'habits');
	const data = syncEngine.data;

	let groupedHabits: { [key: string]: Habit[] } = $derived(
		$data.reduce((acc: { [key: string]: Habit[] }, habit: Habit) => {
			const category = habit.category || 'Uncategorized';
			if (!acc[category]) acc[category] = [];
			acc[category].push(habit);
			return acc;
		}, {})
	);

	async function handleSignOut() {
		const { error } = await signOut();
		if (!error) {
			goto('/');
		}
	}

	async function handleIncrement(habit: Habit) {
		await syncEngine.update(habit.id, {
			current_count: habit.current_count + 1
		});
	}

	// a new habit will need a title, category, target and current counts and a
	// cycle value
	let newHabit = $state({
		title: '',
		category: '',
		target_count: 1,
		current_count: 0,
		cycle: 'daily' as 'daily' | 'weekly'
	});

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		const newItem = await syncEngine.create({
			...newHabit,
			created_by: userId!
		});

		console.log(newItem);

		const modal = document.getElementById('habit_modal') as HTMLDialogElement;
		modal.close();
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this habit?')) return;
		await syncEngine.delete(id);
	}
</script>

<div class="mb-8 flex items-center justify-between">
	<h1 class="text-3xl font-bold">Dashboard</h1>
	<div class="flex gap-2">
		<button
			class="btn btn-primary"
			onclick={() => (document.getElementById('habit_modal') as HTMLDialogElement).showModal()}
			>New Habit</button
		>
		<button class="btn btn-outline" onclick={handleSignOut}>Sign out</button>
	</div>
</div>

{#if user}
	<div class="status mb-4">
		{#if syncEngine.getPendingCount > 0}
			<div class="alert alert-info">
				Syncing {syncEngine.getPendingCount} changes...
			</div>
		{/if}
		{#if syncEngine.getErrorCount > 0}
			<div class="alert alert-error">
				Failed to sync {syncEngine.getErrorCount} changes
			</div>
		{/if}
	</div>

	{#if Object.keys(groupedHabits).length === 0}
		<div class="alert alert-info">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="h-6 w-6 shrink-0 stroke-current"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path></svg
			>
			<span>You haven't created any habits yet. Start by creating your first one!</span>
		</div>
	{:else}
		<div class="">
			{#each Object.entries(groupedHabits) as [category, elements] (category)}
				<div class="divider">{category}</div>
				{#each elements as habit}
					<div class="border-b">
						<div class="card-body">
							<div class="flex items-start justify-between">
								<div>
									<h2 class="card-title">{habit.title}</h2>
									<span class="badge badge-ghost mt-1">{habit.category}</span>
								</div>
								<button
									aria-label="Delete"
									class="btn btn-square btn-sm btn-ghost"
									onclick={() => handleDelete(habit.id)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>

							<div class="mt-4">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">Progress</span>
									<div>{habit.current_count}/{habit.target_count}</div>
								</div>
							</div>

							<div class="card-actions mt-4 justify-end">
								<button class="btn btn-primary btn-sm" onclick={() => handleIncrement(habit)}>
									Complete +1
								</button>
							</div>
						</div>
					</div>
				{/each}
			{/each}
		</div>
	{/if}

	<dialog id="habit_modal" class="modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Create New Habit</h3>
			<form onsubmit={handleCreate} class="space-y-4">
				<div class="form-control">
					<label for="title" class="label">
						<span id="title" class="label-text">Habit Title</span>
					</label>
					<input
						type="text"
						bind:value={newHabit.title}
						class="input input-bordered w-full"
						required
						placeholder="What habit do you want to track?"
					/>
				</div>

				<div class="form-control">
					<label for="category" class="label">
						<span id="category" class="label-text">Category</span>
					</label>
					<input
						type="text"
						bind:value={newHabit.category}
						class="input input-bordered w-full"
						required
						placeholder="e.g. Health, Fitness, Learning"
					/>
				</div>

				<div class="form-control">
					<label for="target_count" class="label">
						<span id="target_count" class="label-text">Target Count</span>
					</label>
					<input
						type="number"
						bind:value={newHabit.target_count}
						class="input input-bordered w-full"
						required
						min="1"
					/>
				</div>

				<div class="form-control">
					<label for="cycle" class="label">
						<span id="cycle" class="label-text">Cycle</span>
					</label>
					<select bind:value={newHabit.cycle} class="select select-bordered w-full" required>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly</option>
					</select>
				</div>

				<div class="modal-action">
					<button
						type="button"
						class="btn"
						onclick={() => (document.getElementById('habit_modal') as HTMLDialogElement)?.close()}
					>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">Create Habit</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
