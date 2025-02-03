<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<main class="mx-auto my-10 w-[95%] max-w-5xl sm:my-20">
	{@render children()}
</main>
