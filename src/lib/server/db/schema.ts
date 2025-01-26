// schema.ts
import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Profiles Table
export const profiles = pgTable('profiles', {
	id: uuid('id').primaryKey(),
	updated_at: timestamp('updated_at', { withTimezone: true }),
	username: text('username'),
	full_name: text('full_name'),
	avatar_url: text('avatar_url'),
	website: text('website')
});

// Habits Table
export const habits = pgTable('habits', {
	id: integer('id').primaryKey(),
	title: text('title'),
	target_count: integer('target_count'),
	current_count: integer('current_count'),
	category: text('category'),
	created_by: uuid('created_by').references(() => profiles.id),
	created_at: timestamp('timestamp', { withTimezone: true }),
	next_update: text('next_update'),
	cycle: text('cycle')
});

// History Table
export const history = pgTable('history', {
	id: integer('id').primaryKey(),
	habit_id: integer('habit_id').references(() => habits.id),
	completed: boolean('completed'),
	current_count: integer('current_count'),
	target_count: integer('target_count'),
	user_uuid: uuid('user_uuid').references(() => profiles.id),
	type: text('type'),
	timestamp: timestamp('timestamp', { withTimezone: true })
});

// Relations
export const habitsRelations = relations(habits, ({ one }) => ({
	profile: one(profiles, {
		fields: [habits.created_by],
		references: [profiles.id],
	}),
}));

export const historyRelations = relations(history, ({ one }) => ({
	habit: one(habits, {
		fields: [history.habit_id],
		references: [habits.id],
	}),
	profile: one(profiles, {
		fields: [history.user_uuid],
		references: [profiles.id],
	}),
}));
