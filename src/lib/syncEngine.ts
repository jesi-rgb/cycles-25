// syncEngine.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'localSync';
const DB_VERSION = 1;

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface SyncOperation<T> {
	id: string;
	timestamp: number;
	type: 'create' | 'update' | 'delete';
	table: string;
	data: T;
	status: SyncStatus;
}

export interface SyncState<T> {
	data: Map<string, T>;
	operations: SyncOperation<T>[];
	lastSynced: number;
	isOnline: boolean;
}

export class SyncEngine<T extends { id: string }> {
	private store: Writable<SyncState<T>>;
	private db: SupabaseClient;
	private table: string;
	private isBrowser: boolean;

	public data: Readable<T[]>;
	public pendingCount: Readable<number>;
	public errorCount: Readable<number>;

	constructor(supabaseClient: SupabaseClient, tableName: string) {
		this.db = supabaseClient;
		this.table = tableName;
		this.isBrowser = typeof window !== 'undefined';

		// Initialize the store
		this.store = writable<SyncState<T>>({
			data: new Map(),
			operations: [],
			lastSynced: Date.now(),
			isOnline: this.isBrowser ? navigator.onLine : false
		});

		// Create derived stores
		this.data = derived(this.store, ($store) =>
			Array.from($store.data.values())
		);

		this.pendingCount = derived(this.store, ($store) =>
			$store.operations.filter(op => op.status === 'pending').length
		);

		this.errorCount = derived(this.store, ($store) =>
			$store.operations.filter(op => op.status === 'error').length
		);

		// Initialize only in browser environment
		if (this.isBrowser) {
			this.initialize();
		}
	}

	private async initialize() {
		// Load from IndexedDB
		await this.loadFromIndexedDB();

		// Setup online/offline listeners
		window.addEventListener('online', this.handleOnline);
		window.addEventListener('offline', this.handleOffline);

		// Initial sync if online
		if (navigator.onLine) {
			this.sync();
		}
	}

	private async getIndexedDB(): Promise<IDBPDatabase | null> {
		if (!this.isBrowser) return null;

		try {
			return await openDB(DB_NAME, DB_VERSION, {
				upgrade(db) {
					// Create object stores if they don't exist
					if (!db.objectStoreNames.contains('data')) {
						db.createObjectStore('data');
					}
					if (!db.objectStoreNames.contains('operations')) {
						db.createObjectStore('operations');
					}
					if (!db.objectStoreNames.contains('metadata')) {
						db.createObjectStore('metadata');
					}
				}
			});
		} catch (error) {
			console.error('IndexedDB not available:', error);
			return null;
		}
	}

	private async saveToIndexedDB() {
		const indexedDB = await this.getIndexedDB();
		if (!indexedDB) return;

		try {
			const state = get(this.store);
			const tx = indexedDB.transaction(['data', 'operations', 'metadata'], 'readwrite');

			// Save data
			await tx.objectStore('data').put(
				Array.from(state.data.entries()),
				this.table
			);

			// Save operations
			await tx.objectStore('operations').put(
				state.operations,
				this.table
			);

			// Save metadata
			await tx.objectStore('metadata').put(
				{
					lastSynced: state.lastSynced,
					isOnline: state.isOnline
				},
				this.table
			);

			await tx.done;
		} catch (error) {
			console.error('Error saving to IndexedDB:', error);
		}
	}

	private async loadFromIndexedDB() {
		const indexedDB = await this.getIndexedDB();
		if (!indexedDB) return;

		try {
			const tx = indexedDB.transaction(['data', 'operations', 'metadata'], 'readonly');

			const [data, operations, metadata] = await Promise.all([
				tx.objectStore('data').get(this.table),
				tx.objectStore('operations').get(this.table),
				tx.objectStore('metadata').get(this.table)
			]);

			await tx.done;

			this.store.set({
				data: new Map(data || []),
				operations: operations || [],
				lastSynced: metadata?.lastSynced || Date.now(),
				isOnline: this.isBrowser ? navigator.onLine : false
			});
		} catch (error) {
			console.error('Error loading from IndexedDB:', error);
			// Initialize with empty state if loading fails
			this.store.set({
				data: new Map(),
				operations: [],
				lastSynced: Date.now(),
				isOnline: this.isBrowser ? navigator.onLine : false
			});
		}
	}

	private handleOnline = () => {
		this.store.update(state => ({ ...state, isOnline: true }));
		console.log('syncing...')
		this.sync();
	};

	private handleOffline = () => {
		this.store.update(state => ({ ...state, isOnline: false }));
	};

	public async create(item: Omit<T, 'id'>): Promise<T> {
		const id = crypto.randomUUID();
		const newItem = { ...item, id } as T;

		this.store.update(state => {
			const newData = new Map(state.data);
			newData.set(id, newItem);

			return {
				...state,
				data: newData,
				operations: [...state.operations, {
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					type: 'create',
					table: this.table,
					data: newItem,
					status: 'pending'
				}]
			};
		});

		if (this.isBrowser) {
			await this.saveToIndexedDB();
			if (navigator.onLine) {
				this.sync();
			}
		}

		return newItem;
	}

	public async update(id: string, updates: Partial<T>): Promise<void> {
		this.store.update(state => {
			const existing = state.data.get(id);
			if (!existing) throw new Error('Item not found');

			const updated = { ...existing, ...updates };
			const newData = new Map(state.data);
			newData.set(id, updated);

			return {
				...state,
				data: newData,
				operations: [...state.operations, {
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					type: 'update',
					table: this.table,
					data: updated,
					status: 'pending'
				}]
			};
		});

		if (this.isBrowser) {
			await this.saveToIndexedDB();
			if (navigator.onLine) {
				this.sync();
			}
		}
	}

	public async delete(id: string): Promise<void> {
		this.store.update(state => {
			const item = state.data.get(id);
			if (!item) throw new Error('Item not found');

			const newData = new Map(state.data);
			newData.delete(id);

			return {
				...state,
				data: newData,
				operations: [...state.operations, {
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					type: 'delete',
					table: this.table,
					data: item,
					status: 'pending'
				}]
			};
		});

		if (this.isBrowser) {
			await this.saveToIndexedDB();
			if (navigator.onLine) {
				this.sync();
			}
		}
	}

	private async sync() {
		const state = get(this.store);
		const pendingOps = state.operations.filter(op => op.status === 'pending');

		for (const op of pendingOps) {
			try {
				switch (op.type) {
					case 'create':
						await this.db.from(this.table).insert(op.data);
						break;
					case 'update':
						await this.db.from(this.table)
							.update(op.data)
							.eq('id', op.data.id);
						break;
					case 'delete':
						await this.db.from(this.table)
							.delete()
							.eq('id', op.data.id);
						break;
				}

				this.store.update(state => ({
					...state,
					operations: state.operations.map(o =>
						o.id === op.id ? { ...o, status: 'synced' } : o
					)
				}));
			} catch (error) {
				this.store.update(state => ({
					...state,
					operations: state.operations.map(o =>
						o.id === op.id ? { ...o, status: 'error' } : o
					)
				}));
				console.error('Sync error:', error);
			}
		}

		// Clean up synced operations
		this.store.update(state => ({
			...state,
			operations: state.operations.filter(op => op.status !== 'synced'),
			lastSynced: Date.now()
		}));

		if (this.isBrowser) {
			await this.saveToIndexedDB();
		}
	}

	public destroy() {
		if (this.isBrowser) {
			window.removeEventListener('online', this.handleOnline);
			window.removeEventListener('offline', this.handleOffline);
		}
	}
}
