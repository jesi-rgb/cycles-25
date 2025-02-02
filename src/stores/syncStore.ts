import { supabase } from '$lib/supabaseClient';
import { SyncEngine } from '$lib/syncEngine';
import type { Habit } from '$lib/types';

export const syncEngine = new SyncEngine<Habit>(supabase, 'habits');


