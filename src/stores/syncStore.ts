import { supabase } from '$lib/supabaseClient';
import { SyncEngine } from '$lib/syncEngine';
import type { HabitType, HistoryType } from '$lib/types';

export const syncEngine = new SyncEngine<HabitType, 'id'>(supabase, 'habits');
export const syncHistory = new SyncEngine<HistoryType, 'id'>(supabase, 'history');



