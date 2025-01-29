
import { get, writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

export const user = writable<User | null>(null);

// Initialize user store with session if it exists
if (typeof window !== 'undefined') {
	supabase.auth.getSession().then(({ data: { session } }) => {
		user.set(session?.user ?? null);
		//console.log('User after session init:', get(user));
	});

	// Listen for auth changes
	supabase.auth.onAuthStateChange((_event, session) => {
		user.set(session?.user ?? null);
		//console.log('User after auth change:', get(user));
	});
}
