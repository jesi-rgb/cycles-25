<script lang="ts">
	import { syncEngine } from '../../stores/syncStore';
	import { Trash, Warning } from 'phosphor-svelte';

	import type { HabitType } from '$lib/types';
	import { DateTime } from 'luxon';

	const { habit } = $props();

	let editedHabit: HabitType = $state({ ...habit });
	$inspect(editedHabit);

	let confirmDeletion = $state(false);

	async function handleEdit(event: SubmitEvent) {
		event.preventDefault();
		await syncEngine.update(habit.id, editedHabit);

		const modal = document.getElementById(`edit_modal-${habit.id}`) as HTMLDialogElement;
		modal.close();
	}

	async function handleDelete(id: string) {
		await syncEngine.delete(id);
	}
</script>

<dialog id={`edit_modal-${habit.id}`} class="modal">
	<div class="modal-box">
		<h3 class="mb-4 text-lg font-bold">Edit Habit</h3>
		<form onsubmit={handleEdit} class="space-y-4">
			<div class="form-control">
				<label for="title" class="label">
					<span id="title" class="label-text">Title</span>
				</label>
				<input
					type="text"
					bind:value={editedHabit.title}
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
					bind:value={editedHabit.category}
					class="input input-bordered w-full"
					placeholder="e.g. Health, Fitness, Learning"
				/>
			</div>

			<div class="form-control">
				<label for="target_count" class="label">
					<span id="target_count" class="label-text">Current Count</span>
				</label>
				<input
					type="number"
					bind:value={editedHabit.current_count}
					class="input input-bordered w-full"
					required
				/>
			</div>

			<div class="form-control">
				<label for="target_count" class="label">
					<span id="target_count" class="label-text">Target Count</span>
				</label>
				<input
					type="number"
					bind:value={editedHabit.target_count}
					class="input input-bordered w-full"
					required
					min="1"
				/>
			</div>

			<div class="form-control">
				<label for="cycle" class="label">
					<span id="cycle" class="label-text">Cycle</span>
				</label>
				<select bind:value={editedHabit.cycle} class="select select-bordered w-full" required>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
				</select>
			</div>

			<div class="form-control">
				<label for="next_update" class="label">
					<span id="next_update" class="label-text">Next Update</span>
				</label>
				<div class="">
					{DateTime.fromISO(editedHabit.next_update).toRelativeCalendar()}
					·
					<span class="text-muted text-xs"
						>{DateTime.fromISO(editedHabit.next_update).toRelative()}</span
					>
				</div>
			</div>

			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={() => {
						(document.getElementById(`edit_modal-${habit.id}`) as HTMLDialogElement)?.close();
						confirmDeletion = false;
					}}
				>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary">Edit Habit</button>
			</div>

			{#if confirmDeletion}
				<button
					class="btn btn-error flex justify-baseline"
					onclick={() => {
						handleDelete(habit.id);
						confirmDeletion = false;
					}}
				>
					<Warning weight="bold" class="mb-0.5" />
					Sure?
				</button>
			{:else}
				<button
					type="button"
					class="btn btn-error"
					onclick={() => {
						confirmDeletion = true;
					}}
				>
					<Trash weight="bold" />
					Delete
				</button>
			{/if}
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<svelte:window on:keydown={(e) => (e.key === 'Escape' ? (confirmDeletion = false) : null)} />
