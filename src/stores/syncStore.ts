import { supabase } from '$lib/supabaseClient';
import { SyncEngine } from '$lib/syncEngine';
import type { HabitType } from '$lib/types';

export const syncEngine = new SyncEngine<HabitType>(supabase, 'habits');



