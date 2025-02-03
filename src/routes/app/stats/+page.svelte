<script lang="ts">
	//import { supabase } from '$lib/supabaseClient';
	//import { onMount } from 'svelte';
	import { user } from '../../../stores/user';
	import { sample_history } from '$lib/sample_data';
	import type { HistoryType } from '$lib/types';
	import { scaleLinear } from 'd3';

	//let userId = $derived($user?.id);

	async function fetchHistory() {
		//wait 300 ms and then return history
		await new Promise((resolve) => setTimeout(resolve, 300));
		return sample_history;
	}

	// group sample history in weeks and return objects that count how many habits were completed in each week
	const groupHistoryByWeek = (history: HistoryType[]) => {
		// Sort history by timestamp
		const sortedHistory = [...history].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);

		const weeklyData = new Map<string, number>();

		sortedHistory.forEach((entry) => {
			if (!entry.completed) return; // Skip uncompleted habits

			const date = new Date(entry.timestamp);
			// Get the Monday of the current week
			const monday = new Date(date);
			monday.setDate(date.getDate() - date.getDay() + 1);
			const weekKey = monday.toISOString().split('T')[0];

			weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1);
		});

		// Convert Map to array of objects for easier plotting
		return Array.from(weeklyData.entries()).map(([week, count]) => ({
			week,
			count
		}));
	};

	// Data for plotting x-y axis
	let weeklyStats = $derived(groupHistoryByWeek(sample_history));

	const yTicks = [0, 5, 10, 15, 20];
	const padding = { top: 20, right: 15, bottom: 20, left: 25 };

	let width = $state(500);
	let height = 350;

	let xScale = $derived(
		scaleLinear()
			.domain([0, weeklyStats.length])
			.range([padding.left, width - padding.right])
	);

	let yScale = $derived(
		scaleLinear()
			.domain([0, Math.max(...weeklyStats.map((d) => d.count), ...yTicks)])
			.range([height - padding.bottom, padding.top])
	);

	let innerWidth = $derived(width - (padding.left + padding.right));
	let barWidth = $derived(innerWidth / weeklyStats.length);

	// 3. Functions needed to create the Data elements or Helper functions, e.g d3.line d3.arc when needed

	// Shorten the date axis values for mobile
	function formatMobile(tick) {
		return "'" + tick.toString().slice(-2);
	}

	// 4. Create the main data elements (usually by iteration, using svelte each blocks)
	// We will do this in the html markup
</script>

<div class="chart" bind:clientWidth={width}>
	<svg {width} {height}>
		<!-- 4. Design the bars -->
		<g class="bars">
			{#each weeklyStats as point, i}
				<rect
					x={xScale(i) + 2}
					y={yScale(point.count)}
					width={barWidth * 0.9}
					height={yScale(0) - yScale(point.count)}
					class="fill-primary"
				/>
			{/each}
		</g>
		<!-- Design y axis -->
		<g class="axis y-axis">
			{#each yTicks as tick}
				<g class="tick tick-{tick}" transform="translate(0, {yScale(tick)})">
					<line x2="100%" />
					<text class="fill-base-content" y="-4"
						>{tick} {tick === 20 ? ' per 1,000 population' : ''}</text
					>
				</g>
			{/each}
		</g>

		<!-- Design x axis -->
		<g class="axis x-axis">
			{#each weeklyStats as point, i}
				{#if i % 12 == 0}
					<g class="tick" transform="translate({xScale(i)}, {height})">
						<text x={barWidth / 2} y="-4" class="fill-base-content text-xs">
							{width > 380 ? point.week : formatMobile(new Date(point.week).getFullYear())}
						</text>
					</g>
				{/if}
			{/each}
		</g>
	</svg>
</div>
