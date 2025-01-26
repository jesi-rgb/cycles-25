import { writable, derived } from 'svelte/store';
import { openDB, type DBSchema } from 'idb';
import { supabase } from '$lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

// Define Habit type based on schema.ts
export interface Habit {
	id: number;
	title: string;
	target_count: number;
	current_count: number;
	category: string | null;
	created_by: string; // UUID from profiles
	created_at: Date;
	next_update: string | null;
	cycle: string;
}

// Types for our IndexedDB schema
interface HabitsDB extends DBSchema {
	habits: {
		key: number;
		value: Habit;
		indexes: { 'by-user': string };
	};
	pendingChanges: {
		key: number;
		value: {
			type: 'create' | 'update' | 'delete';
			data: Partial<Habit>;
			timestamp: Date;
		};
	};
}


// Create stores
export const user = writable<User | null>(null);
export const habits = writable<Habit[]>([]);
export const syncStatus = writable({
	lastSynced: null as Date | null,
	pendingChanges: 0
});

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
	user.set(session?.user ?? null);
});

// Setup auth listener
supabase.auth.onAuthStateChange((_event, session) => {
	user.set(session?.user ?? null);
});

// Derived stores
export const habitsByCategory = derived(habits, $habits => {
	const grouped = new Map<string, Habit[]>();
	$habits.forEach(habit => {
		const category = habit.category || 'Uncategorized';
		if (!grouped.has(category)) grouped.set(category, []);
		grouped.get(category)?.push(habit);
	});
	return grouped;
});

// Store actions
export const habitsActions = {
	async ensureDB() {
		if (!db && typeof window !== 'undefined') {
			await initializeDB();
		}
	},
	async init(userId: string) {
		await this.ensureDB();
		if (!db) return;
		// Load from IndexedDB first
		const localHabits = await db.getAllFromIndex('habits', 'by-user', userId);
		habits.set(localHabits);

		// Then sync with server
		await this.sync();
	},

	async add(data: Omit<Habit, 'id' | 'created_by' | 'created_at'>, userId: string) {
		await this.ensureDB();
		if (!db) return;
		try {
			const habitData = {
				...data,
				created_by: userId,
				created_at: new Date(),
				current_count: data.current_count || 0,
				category: data.category || null,
				next_update: data.next_update || null
			};

			const { data: newHabit, error } = await supabase
				.from('habits')
				.insert(habitData)
				.select()
				.single();

			if (error) throw error;

			await db.add('habits', newHabit);
			habits.update(h => [...h, newHabit]);
		} catch (error) {
			// Store for later sync
			await db.add('pendingChanges', {
				type: 'create',
				data: { ...data, created_by: userId, created_at: new Date() },
				timestamp: new Date()
			});
			updateSyncStatus();
		}
	},

	async update(id: number, changes: Partial<Habit>) {
		await this.ensureDB();
		if (!db) return;
		try {
			const habit = await db.get('habits', id);
			const updated = { ...habit, ...changes };

			await db.put('habits', updated);
			habits.update(list => list.map(h => h.id === id ? updated : h));

			const { error } = await supabase
				.from('habits')
				.update(changes)
				.eq('id', id);

			if (error) throw error;
		} catch (error) {
			await db.add('pendingChanges', {
				type: 'update',
				data: { id, ...changes },
				timestamp: new Date()
			});
			updateSyncStatus();
		}
	},

	async delete(id: number) {
		await this.ensureDB();
		if (!db) return;
		try {
			await db.delete('habits', id);
			habits.update(list => list.filter(h => h.id !== id));

			const { error } = await supabase
				.from('habits')
				.delete()
				.eq('id', id);

			if (error) throw error;
		} catch (error) {
			await db.add('pendingChanges', {
				type: 'delete',
				data: { id },
				timestamp: new Date()
			});
			updateSyncStatus();
		}
	},

	async sync() {
		await this.ensureDB();
		if (!db) return;
		const userId = (await supabase.auth.getUser()).data.user?.id;
		if (!userId) return;

		try {
			// Process pending changes
			const changes = await db.getAll('pendingChanges');
			for (const change of changes) {
				try {
					switch (change.type) {
						case 'create':
							await supabase.from('habits').insert(change.data);
							break;
						case 'update':
							await supabase.from('habits')
								.update(change.data)
								.eq('id', change.data.id);
							break;
						case 'delete':
							await supabase.from('habits')
								.delete()
								.eq('id', change.data.id);
							break;
					}
					await db.delete('pendingChanges', change.key);
				} catch (error) {
					console.error('Failed to sync change:', error);
				}
			}

			// Get fresh data
			const { data, error } = await supabase
				.from('habits')
				.select(`
					id,
					title,
					target_count,
					current_count,
					category,
					created_by,
					created_at,
					next_update,
					cycle
				`)
				.eq('created_by', userId);

			if (error) throw error;

			// Update local storage and store
			for (const habit of data) {
				await db.put('habits', habit);
			}
			habits.set(data);

			syncStatus.set({
				lastSynced: new Date(),
				pendingChanges: 0
			});
		} catch (error) {
			console.error('Sync failed:', error);
		}
	}
};


// Initialize IndexedDB
let db: ReturnType<typeof openDB<HabitsDB>>;

async function initializeDB() {
	if (typeof window === 'undefined') return;

	db = await openDB<HabitsDB>('habits-app', 1, {
		upgrade(db) {
			const habitsStore = db.createObjectStore('habits', { keyPath: 'id' });
			habitsStore.createIndex('by-user', 'created_by');
			db.createObjectStore('pendingChanges', { autoIncrement: true });
		}
	});
}

// Initialize DB if we're in the browser
if (typeof window !== 'undefined') {
	initializeDB();
}

// Helper function
async function updateSyncStatus() {
	if (!db) return;
	const changes = await db.count('pendingChanges');
	syncStatus.update(s => ({ ...s, pendingChanges: changes }));
}

// Start periodic sync
if (typeof window !== 'undefined') {
	// Wait for user to be set before starting sync
	user.subscribe(u => {
		if (u) {
			setInterval(() => {
				habitsActions.sync();
			}, 30000); // Sync every 30 seconds
		}
	});
}
