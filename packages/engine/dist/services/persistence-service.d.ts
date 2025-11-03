/**
 * Persistence service for ritual data and preferences
 */
import { RitualState, DailyRitual, RitualPreferences } from '../types/ritual.js';
export interface StorageAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
export interface PersistenceConfig {
    autoSaveInterval: number;
    maxHistoryEntries: number;
    enableBackup: boolean;
}
export declare class PersistenceService {
    private storage;
    private config;
    private autoSaveTimer?;
    private static readonly KEYS;
    constructor(storage: StorageAdapter, config?: PersistenceConfig);
    saveRitualState(state: RitualState): Promise<void>;
    loadRitualState(): RitualState | null;
    savePreferences(preferences: RitualPreferences): Promise<void>;
    loadPreferences(): Promise<RitualPreferences | null>;
    saveRitual(ritual: DailyRitual): Promise<void>;
    loadRitual(ritualId: string): Promise<DailyRitual | null>;
    getRitualHistory(limit?: number): Promise<DailyRitual[]>;
    clearHistory(): Promise<void>;
    createBackup(state: RitualState): Promise<void>;
    restoreFromBackup(timestamp: string): Promise<RitualState | null>;
    startAutoSave(): void;
    stopAutoSave(): void;
    private loadFromStorageSync;
    private validateRitualState;
    private dateReplacer;
    private dateReviver;
    private cleanupOldBackups;
    dispose(): void;
}
