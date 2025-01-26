import { supabase } from '$lib/supabaseClient';

export interface Habit {
	id: number;
	created_by: string;
	title: string;
	category: string;
	target_count: number;
	current_count: number;
	cycle: 'daily' | 'weekly';
	created_at?: string;
}

export type NewHabit = Omit<Habit, 'id' | 'created_by' | 'created_at' | 'current_count'>;

export async function getHabitsForUser(userId: string): Promise<Habit[]> {

	const { data, error } = await supabase
		.from('habits')
		.select('*')
		.eq('created_by', userId);

	console.log(data)
	if (error) throw error;
	return data || [];
}

export async function getHabitById(habitId: number, userId: string): Promise<Habit | null> {
	const { data, error } = await supabase
		.from('habits')
		.select('*')
		.eq('id', habitId)
		.eq('created_by', userId)
		.single();

	if (error) return null;
	return data;
}

export async function createHabit(data: NewHabit, userId: string): Promise<Habit> {
	const { data: habit, error } = await supabase
		.from('habits')
		.insert({
			...data,
			created_by: userId,
			current_count: 0
		})
		.select()
		.single();

	if (error) throw error;
	return habit;
}

export async function updateHabit(
	habitId: number,
	userId: string,
	data: Partial<NewHabit>
): Promise<Habit | null> {
	const { data: updated, error } = await supabase
		.from('habits')
		.update(data)
		.eq('id', habitId)
		.eq('created_by', userId)
		.select()
		.single();

	if (error) return null;
	return updated;
}

export async function deleteHabit(habitId: number, userId: string): Promise<boolean> {
	const { error } = await supabase
		.from('habits')
		.delete()
		.eq('id', habitId)
		.eq('created_by', userId);

	return !error;
}

export async function incrementHabitCount(habit: Habit, userId: string): Promise<Habit | Error> {
	const { data: updated, error } = await supabase
		.from('habits')
		.update({ current_count: habit.current_count + 1 })
		.eq('id', habit.id)
		.eq('created_by', userId)
		.select()
		.single();

	if (error) return error;
	return updated;
}

export async function resetHabitCount(habit: Habit, userId: string): Promise<Habit | null> {
	const { data: updated, error } = await supabase
		.from('habits')
		.update({ current_count: 0 })
		.eq('id', habit.id)
		.eq('created_by', userId)
		.select()
		.single();

	if (error) return null;
	return updated;
}

export async function getHabitsByCategory(userId: string, category: string): Promise<Habit[]> {
	const { data, error } = await supabase
		.from('habits')
		.select('*')
		.eq('created_by', userId)
		.eq('category', category);

	if (error) throw error;
	return data || [];
}

export async function getGroupedHabits(userId: string): Promise<{ [key: string]: Habit[] }> {
	// select all habits for this user

	const { data: habits, error } = await supabase
		.from('habits')
		.select('*')
		.eq('created_by', userId)

	console.log(error)
	// group habits by category
	const groupedHabits: { [key: string]: Habit[] } = {};
	habits?.forEach((habit) => {
		if (!groupedHabits[habit.category]) {
			groupedHabits[habit.category] = [];
		}
		groupedHabits[habit.category].push(habit);
	});

	console.log(habits)

	return groupedHabits;
}
