<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="shortcut icon" href="/favicon.ico" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<meta name="apple-mobile-web-app-title" content="MyWebSite" />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="description" content="Cycles" />
	<title>Cycles</title>

	<meta name="theme-color" content="#F8F8F8" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#272322" media="(prefers-color-scheme: dark)" />
</svelte:head>

<main class="mx-auto my-10 w-[95%] max-w-5xl sm:my-20">
	{@render children()}
</main>
