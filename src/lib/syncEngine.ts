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

export interface SyncState<T, K extends keyof T> {
	data: Map<T[K], T>;
	operations: SyncOperation<T>[];
	lastSynced: number;
	isOnline: boolean;
}

// Define types for customization
export type QueryBuilder<T> = (query: any) => any;
export type DataTransformer<T> = (data: T) => any;

export interface SyncEngineOptions<T> {
	queryBuilder?: QueryBuilder<T>;        // Customize how data is queried
	createTransform?: DataTransformer<T>;  // Transform data before creation
	updateTransform?: DataTransformer<T>;  // Transform data before updates
	filterData?: (data: T) => boolean;     // Filter data after fetching
}

export class SyncEngine<T, K extends keyof T> {
	private store: Writable<SyncState<T, K>>;
	private db: SupabaseClient;
	private table: string;
	private primaryKey: K;
	private isBrowser: boolean;
	private options: SyncEngineOptions<T>;

	public readonly data: { subscribe: Readable<T[]>['subscribe'] };
	public readonly pendingCount: { subscribe: Readable<number>['subscribe'] };
	public readonly errorCount: { subscribe: Readable<number>['subscribe'] };

	constructor(
		supabaseClient: SupabaseClient,
		tableName: string,
		primaryKey: K = 'id' as K,
		options: SyncEngineOptions<T> = {}
	) {
		this.options = {
			queryBuilder: (query) => query,
			createTransform: (data) => data,
			updateTransform: (data) => data,
			filterData: () => true,
			...options
		};
		this.primaryKey = primaryKey;
		this.db = supabaseClient;
		this.table = tableName;
		this.isBrowser = typeof window !== 'undefined';

		// Initialize the store
		this.store = writable<SyncState<T, K>>({
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
		window.addEventListener('visibilitychange', this.visibilitySync);

		// Initial fetch of data from Supabase

		// Initial sync if online
		if (navigator.onLine) {
			this.push();
		}

		this.pull()

		// Periodic sync
		setInterval(() => {
			if (navigator.onLine) {
				this.push();
			}
			console.log('Periodic sync');
		}, 1000 * 60);
	}

	/*
	 * "Pull" data from supabase
	 * */
	private async pull() {
		try {
			let query = this.db
				.from(this.table)
				.select('*');

			// Apply custom query modifications

			const builder = this.options.queryBuilder!
			query = builder(query);

			const { data, error } = await query;

			if (error) throw error;

			if (data) {
				this.store.update(state => ({
					...state,
					data: new Map(data.map(item => [item.id, item]))
				}));

				await this.saveToIndexedDB();
			}
		} catch (error) {
			console.error('Error fetching initial data:', error);
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

			// Save data as array of objects
			await tx.objectStore('data').put(
				Array.from(state.data.values()),
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

			// Convert array of objects to Map
			const dataMap = new Map<T[K], T>(
				(data || []).map(item => [item[this.primaryKey], item])
			);

			this.store.set({
				data: dataMap,
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
		this.push();
	};

	private handleOffline = () => {
		this.store.update(state => ({ ...state, isOnline: false }));
	};

	private visibilitySync = () => {
		const vizState = document.visibilityState;
		if (vizState !== 'hidden') {
			this.pull();
		}
	}

	public async create(item: Omit<T, K>): Promise<void> {
		const tempId = crypto.randomUUID();
		const createTrans = this.options.createTransform!
		const transformedData = createTrans(item as T);

		this.store.update(state => {
			return {
				...state,
				operations: [...state.operations, {
					id: tempId,
					timestamp: Date.now(),
					type: 'create',
					table: this.table,
					data: transformedData,
					status: 'pending'
				}]
			};
		});

		if (this.isBrowser) {
			await this.saveToIndexedDB();
			if (navigator.onLine) {
				await this.push();
				await this.pull(); // Pull to get the server-generated ID
			}
		}
	}

	public async update(id: T[K], updates: Partial<T>): Promise<void> {
		this.store.update(state => {
			const existing = state.data.get(id);
			if (!existing) throw new Error('Item not found');

			const updated = { ...existing, ...updates };
			const upTrans = this.options.updateTransform!
			const transformedData = upTrans(updated);

			const newData = new Map(state.data);
			newData.set(id, transformedData);

			//transformedData.set(id, updated);

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
				this.push();
			}
		}
	}

	public async delete(id: T[K]): Promise<void> {
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
				this.push();
			}
		}
	}

	/*
	 * Push data to Supabase
	 */
	private async push() {
		const state = get(this.store);
		const pendingOps = state.operations.filter(op => op.status === 'pending');

		for (const op of pendingOps) {
			try {
				switch (op.type) {
					case 'create':
						const { error: createError } = await this.db.from(this.table).insert(op.data);
						if (createError) throw createError;
						break;
					case 'update': {
						const { [this.primaryKey]: pk, ...updateData } = op.data;
						const { error: updateError } = await this.db.from(this.table)
							.update(updateData)
							.eq(this.primaryKey as string, pk);
						if (updateError) throw updateError;
						break;
					}
					case 'delete': {
						const pk = op.data[this.primaryKey];
						const { error: deleteError } = await this.db.from(this.table)
							.delete()
							.eq(this.primaryKey as string, pk);
						if (deleteError) throw deleteError;
						break;
					}
				}

				this.store.update(state => ({
					...state,
					operations: state.operations.map(o =>
						o.id === op.id ? { ...o, status: 'synced' } : o
					)
				}));
			} catch (error) {
				console.error('Sync error for operation:', op.id, error);
				this.store.update(state => ({
					...state,
					operations: state.operations.map(o =>
						o.id === op.id ? { ...o, status: 'error' } : o
					)
				}));
			}
		}

		// Clean up synced operations
		this.store.update(state => ({
			...state,
			operations: state.operations.filter(op => op.status !== 'synced'),
			lastSynced: Date.now()
		}));


		// Save the clean state to IndexedDB
		if (this.isBrowser) {
			await this.saveToIndexedDB();
		}
	}


	public async createAndReturn(item: Omit<T, K>): Promise<T | null> {
		const { data, error } = await this.db
			.from(this.table)
			.insert(item)
			.select()
			.single();

		if (error) {
			console.error(`Error creating item in ${this.table}:`, error);
			return null;
		}

		// Update local state
		await this.pull();

		return data;
	}

	public destroy() {
		if (this.isBrowser) {
			window.removeEventListener('online', this.handleOnline);
			window.removeEventListener('offline', this.handleOffline);
		}
	}
}
