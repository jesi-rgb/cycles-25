import { supabase } from '$lib/supabaseClient';
import { SyncEngine } from '$lib/syncEngine';
import type { HabitType, HistoryType } from '$lib/types';
import { derived, fromStore, get } from 'svelte/store';
import { user } from './user';

export const syncHistory = new SyncEngine<HistoryType, 'id'>(supabase, 'history', 'id', {
	queryBuilder: (query) => {
		const userId = get(user)?.id;
		if (!userId) throw new Error('User not authenticated');
		return query.eq('user_uuid', userId);
	},
	createTransform: (data) => {
		const userId = get(user)?.id;
		if (!userId) throw new Error('User not authenticated');
		return {
			...data,
			user_uuid: userId
		};
	}

});
export const syncEngine = new SyncEngine<HabitType, 'id'>(
	supabase,
	'habits',
	'id',
	{
		// Add user filtering to all queries
		queryBuilder: (query) => {
			const userId = get(user)?.id;
			if (!userId) throw new Error('User not authenticated');
			return query.eq('created_by', userId);
		},

		// Add user_id to all create operations
		createTransform: (data) => {
			const userId = get(user)?.id;
			if (!userId) throw new Error('User not authenticated');
			return {
				...data,
				created_by: userId
			};
		},

		// Modify data before updates
		updateTransform: (data) => {
			const { ...rest } = data;
			return rest;
		},
	}
);


