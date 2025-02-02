<script lang="ts">
	import { syncEngine } from '../../stores/syncStore';
	const { habit } = $props();
	import type { HabitType } from '$lib/types';
	import { X } from 'phosphor-svelte';

	async function handleDelete(id: string) {
		await syncEngine.delete(id);
	}

	async function handleIncrement(habit: HabitType) {
		await syncEngine.update(habit.id, {
			current_count: habit.current_count + 1
		});
	}
</script>

<div class="card-body">
	<div class="flex items-center gap-10">
		{#if habit.current_count >= habit.target_count}
			<div class="relative flex items-center justify-center">
				<div
					class="radial-progress text-primary shadow-primary/50 absolute
					-z-1 shadow-[0_0_8px_0]"
					style={`--value:${(habit.current_count / habit.target_count) * 100}; --thickness: 3px`}
				></div>

				<button
					class="font-count btn btn-circle btn-primary size-17 border-0 text-3xl diagonal-fractions"
					onclick={() => handleIncrement(habit)}
				>
					{habit.current_count}/{habit.target_count}
				</button>
			</div>
		{:else}
			<div class="relative flex items-center justify-center">
				<div
					class="radial-progress text-accent absolute -z-1 transform"
					style={`--value:${(habit.current_count / habit.target_count) * 100}; --thickness: 3px`}
				></div>

				<button
					class="font-count btn btn-circle btn-accent dark:btn-soft size-17 border-0 text-3xl diagonal-fractions"
					onclick={() => handleIncrement(habit)}
				>
					{habit.current_count}/{habit.target_count}
				</button>
			</div>
		{/if}

		<div class="flex flex-col">
			<h2 class="card-title">{habit.title}</h2>
			<span class="badge badge-soft badge-xs badge-success mt-1 font-semibold">{habit.cycle}</span>
		</div>

		<button
			class="btn btn-circle btn-error"
			onclick={() => {
				handleDelete(habit.id);
			}}
			><X weight="bold" />
		</button>
	</div>
</div>

<style>
	.radial-progress::after {
		background-color: oklch(from currentColor calc(l + 0.2) c h);
		box-shadow: 0 0 8px currentColor;
		/* Make the dot 3x bigger than the progress bar thickness */
		inset: calc(50% - (5px / 1.4));
		/* Adjust the transform to keep it centered on the progress bar */
		transform: rotate(calc(var(--value) * 3.6deg - 90deg)) translate(calc(var(--size) / 2.08));
		border-radius: 50%;
	}
</style>
