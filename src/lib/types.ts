
export type HabitType = {
	id: string;
	title: string;
	category: string;
	target_count: number;
	current_count: number;
	created_by: string;
	cycle: 'daily' | 'weekly';
}
