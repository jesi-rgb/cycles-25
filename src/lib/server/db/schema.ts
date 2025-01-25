// schema.ts
import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Profiles Table
export const profiles = pgTable('profiles', {
	id: uuid('id').primaryKey(),
	updatedAt: timestamp('updated_at', { withTimezone: true }),
	username: text('username'),
	fullName: text('full_name'),
	avatarUrl: text('avatar_url'),
	website: text('website')
});

// Habits Table
export const habits = pgTable('habits', {
	id: integer('id').primaryKey(),
	title: text('title'),
	targetCount: integer('target_count'),
	currentCount: integer('current_count'),
	category: text('category'),
	createdBy: uuid('created_by').references(() => profiles.id),
	nextUpdate: text('next_update'),
	cycle: text('cycle')
});

// History Table
export const history = pgTable('history', {
	id: integer('id').primaryKey(),
	habitId: integer('habit_id').references(() => habits.id),
	completed: boolean('completed'),
	currentCount: integer('current_count'),
	targetCount: integer('target_count'),
	userUuid: uuid('user_uuid').references(() => profiles.id),
	type: text('type'),
	timestamp: timestamp('timestamp', { withTimezone: true })
});

// Relations
export const habitsRelations = relations(habits, ({ one }) => ({
	profile: one(profiles, {
		fields: [habits.createdBy],
		references: [profiles.id],
	}),
}));

export const historyRelations = relations(history, ({ one }) => ({
	habit: one(habits, {
		fields: [history.habitId],
		references: [habits.id],
	}),
	profile: one(profiles, {
		fields: [history.userUuid],
		references: [profiles.id],
	}),
}));
