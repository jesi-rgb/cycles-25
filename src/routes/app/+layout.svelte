<script>
	import CreateModal from '$lib/components/CreateModal.svelte';
	import Dock from '../../lib/components/Dock.svelte';

	const { children } = $props();
</script>

<main class="">
	{@render children()}
	<Dock />
</main>

<CreateModal />
