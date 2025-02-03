
export type HabitType = {
	id: string;
	title: string;
	category: string;
	target_count: number;
	current_count: number;
	created_by: string;
	cycle: 'daily' | 'weekly';
	next_update: string;
}


export type HistoryType = {
	id: string;              // int8, primary key
	habit_id: string;        // int8, foreign key
	current_count: number;   // int4
	target_count: number;    // int4
	user_uuid: string;       // uuid
	type: string;           // text
	completed: boolean;      // bool
	timestamp: string;        // timestamptz
}
