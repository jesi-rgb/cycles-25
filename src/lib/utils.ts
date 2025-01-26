import { supabase } from '$lib/supabaseClient'
import type { AuthError, Provider, User } from '@supabase/supabase-js'


export async function signInWithGoogle(): Promise<{ provider: Provider | null, error: AuthError | null }> {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${window.location.origin}/app`
		}
	})

	return {
		provider: data.provider,
		error
	}

}

export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null, error: AuthError | null }> {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	})

	return {
		user: data.user,
		error
	}
}

export async function signOut(): Promise<{ error: AuthError | null }> {
	const { error } = await supabase.auth.signOut()
	return { error }
}

export async function getCurrentUser(): Promise<User | null> {
	try {
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();

		console.log('Current session:', session);

		if (sessionError) {
			console.error('Session error:', sessionError);
			return null;
		}

		if (!session?.user) {
			console.log('No session found, attempting refresh...');
			const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

			if (refreshError || !refreshedSession?.user) {
				console.log('No valid session after refresh');
				return null;
			}

			return refreshedSession.user;
		}

		return session.user;
	} catch (error) {
		console.error('Error in getCurrentUser:', error);
		return null;
	}
}
