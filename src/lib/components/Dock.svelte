<script lang="ts">
	import { ChartBar, ChartBarHorizontal, House, Plus, PlusCircle, Wrench } from 'phosphor-svelte';
</script>

<div class="dock dock-xs mb-7 pt-3 text-xs backdrop-blur-2xl">
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
