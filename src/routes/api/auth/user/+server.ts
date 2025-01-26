import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabaseClient';

export const GET: RequestHandler = async () => {
	const { data: { user }, error: userError } = await supabase.auth.getUser();

	if (userError || !user) {
		return new Response('Unauthorized', { status: 401 });
	}

	return json(user);
};
