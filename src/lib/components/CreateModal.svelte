<script lang="ts">
	import { syncEngine } from '../../stores/syncStore';
	import { user } from '../../stores/user';

	let userId = $derived($user?.id);

	let newHabit = $state({
		title: '',
		category: '',
		target_count: 1,
		current_count: 0,
		cycle: 'daily'
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

		newHabit = {
			title: '',
			category: '',
			target_count: 1,
			current_count: 0,
			cycle: 'daily'
		};
	}
</script>

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
