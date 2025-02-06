<script lang="ts">
	import { ChartBar, ChartBarHorizontal, House, Plus, PlusCircle, Wrench } from 'phosphor-svelte';
</script>

<div
	class="dock dock-xs to-primary/10 dark:to-base-100 mb-7 bg-gradient-to-b pt-3 text-xs backdrop-blur-2xl"
>
	<a href="/app" class="btn btn-ghost">
		<House weight="bold" />
		<span class="dock-label">Home</span>
	</a>

	<button
		class="btn z-10"
		onclick={() => (document.getElementById('create_modal') as HTMLDialogElement).showModal()}
	>
		<PlusCircle weight="bold" size={24} />
	</button>

	<a href="/app/stats" class="btn btn-ghost">
		<ChartBar weight="bold" />
		<span class="dock-label">Stats</span>
	</a>
</div>
