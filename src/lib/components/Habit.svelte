<script lang="ts">
	import { syncEngine, syncHistory } from '../../stores/syncStore';
	let { habit } = $props();

	import type { HabitType } from '$lib/types';
	import { PencilRuler, Sliders } from 'phosphor-svelte';
	import EditModal from './EditModal.svelte';
	import { user } from '../../stores/user';
	import { DateTime } from 'luxon';

	async function handleIncrement(habit: HabitType) {
		await syncEngine.update(habit.id, {
			current_count: habit.current_count + 1
		});

		await syncHistory.create({
			user_uuid: $user?.id!,
			type: 'update',
			timestamp: DateTime.now().toISO(),
			target_count: habit.target_count,
			current_count: habit.current_count,
			habit_id: habit.id,
			completed: habit.current_count >= habit.target_count
		});
	}
</script>

<div class="px-1 py-4">
	<div class="flex w-full items-center justify-between gap-10">
		<div class="flex items-center gap-10">
			{#if habit.current_count >= habit.target_count}
				<div class="relative flex items-center justify-center">
					<div
						class="radial-progress text-accent shadow-accent/50 absolute -z-1 shadow-[0_0_8px_0]"
						style={`--value:${(habit.current_count / habit.target_count) * 100}; --thickness: 3px`}
					></div>

					<button
						class="font-count btn btn-circle btn-accent size-17 border-0 text-3xl diagonal-fractions"
						onclick={() => handleIncrement(habit)}
					>
						{habit.current_count}/{habit.target_count}
					</button>
				</div>
			{:else}
				<div class="relative flex items-center justify-center">
					<div
						class="radial-progress text-primary absolute -z-1 transform"
						style={`--value:${(habit.current_count / habit.target_count) * 100}; --thickness: 3px`}
					></div>

					<button
						class="font-count btn btn-circle btn-primary dark:btn-soft size-17 border-0 text-3xl diagonal-fractions"
						onclick={() => handleIncrement(habit)}
					>
						{habit.current_count}/{habit.target_count}
					</button>
				</div>
			{/if}

			<div class="flex flex-col">
				<h2 class="card-title font-normal">{habit.title}</h2>
				{#if habit.cycle == 'daily'}
					<span class="badge badge-soft badge-xs badge-primary mt-1 font-bold">{habit.cycle}</span>
				{:else}
					<span class="badge badge-soft badge-xs badge-accent mt-1 font-bold">{habit.cycle}</span>
				{/if}
			</div>
		</div>

		<button
			class="btn btn-circle"
			onclick={() =>
				(document.getElementById(`edit_modal-${habit.id}`) as HTMLDialogElement).showModal()}
		>
			<Sliders size={24} weight="duotone" />
		</button>
	</div>
</div>

<EditModal {habit} />

<style>
	.radial-progress::after {
		background-color: oklch(from currentColor calc(l - 0.2) c h);
		box-shadow: 0 0 8px oklch(from currentColor calc(l - 0.2) c h);
		/* Make the dot 3x bigger than the progress bar thickness */
		inset: calc(50% - (5px / 1.4));
		/* Adjust the transform to keep it centered on the progress bar */
		transform: rotate(calc(var(--value) * 3.6deg - 90deg)) translate(calc(var(--size) / 2.08));
		border-radius: 50%;
	}

	@media (prefers-color-scheme: dark) {
		.radial-progress::after {
			background-color: oklch(from currentColor calc(l + 0.2) c h);
			box-shadow: 0 0 8px oklch(from currentColor calc(l + 0.2) c h);
			/* Make the dot 3x bigger than the progress bar thickness */
			inset: calc(50% - (5px / 1.4));
			/* Adjust the transform to keep it centered on the progress bar */
			transform: rotate(calc(var(--value) * 3.6deg - 90deg)) translate(calc(var(--size) / 2.08));
			border-radius: 50%;
		}
	}
</style>
