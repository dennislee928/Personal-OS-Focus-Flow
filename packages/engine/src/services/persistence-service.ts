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
  autoSaveInterval: number; // milliseconds
  maxHistoryEntries: number;
  enableBackup: boolean;
}

export class PersistenceService {
  private storage: StorageAdapter;
  private config: PersistenceConfig;
  private autoSaveTimer?: NodeJS.Timeout;

  private static readonly KEYS = {
    RITUAL_STATE: 'ritual_state',
    PREFERENCES: 'ritual_preferences',
    HISTORY: 'ritual_history',
    BACKUP_PREFIX: 'ritual_backup_'
  };

  constructor(
    storage: StorageAdapter,
    config: PersistenceConfig = {
      autoSaveInterval: 30000, // 30 seconds
      maxHistoryEntries: 30,   // 30 days
      enableBackup: true
    }
  ) {
    this.storage = storage;
    this.config = config;
    this.startAutoSave();
  }

  async saveRitualState(state: RitualState): Promise<void> {
    try {
      // Save current state
      const stateJson = JSON.stringify(state, this.dateReplacer);
      await this.storage.set(PersistenceService.KEYS.RITUAL_STATE, stateJson);

      // Save preferences separately for easier access
      const preferencesJson = JSON.stringify(state.preferences);
      await this.storage.set(PersistenceService.KEYS.PREFERENCES, preferencesJson);

      // Save history with size limit
      const limitedHistory = state.history.slice(-this.config.maxHistoryEntries);
      const historyJson = JSON.stringify(limitedHistory, this.dateReplacer);
      await this.storage.set(PersistenceService.KEYS.HISTORY, historyJson);

      // Create backup if enabled
      if (this.config.enableBackup) {
        await this.createBackup(state);
      }

    } catch (error) {
      console.error('Failed to save ritual state:', error);
      throw new Error('Failed to persist ritual state');
    }
  }

  loadRitualState(): RitualState | null {
    try {
      const stateData = this.loadFromStorageSync(PersistenceService.KEYS.RITUAL_STATE);
      if (!stateData) {
        return null;
      }

      const state = JSON.parse(stateData, this.dateReviver) as RitualState;
      
      // Validate loaded state
      if (!this.validateRitualState(state)) {
        console.warn('Invalid ritual state loaded, returning null');
        return null;
      }

      return state;

    } catch (error) {
      console.error('Failed to load ritual state:', error);
      return null;
    }
  }

  async savePreferences(preferences: RitualPreferences): Promise<void> {
    try {
      const preferencesJson = JSON.stringify(preferences);
      await this.storage.set(PersistenceService.KEYS.PREFERENCES, preferencesJson);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw new Error('Failed to persist preferences');
    }
  }

  async loadPreferences(): Promise<RitualPreferences | null> {
    try {
      const preferencesData = await this.storage.get(PersistenceService.KEYS.PREFERENCES);
      if (!preferencesData) {
        return null;
      }

      return JSON.parse(preferencesData) as RitualPreferences;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return null;
    }
  }

  async saveRitual(ritual: DailyRitual): Promise<void> {
    try {
      const ritualJson = JSON.stringify(ritual, this.dateReplacer);
      const key = `ritual_${ritual.id}`;
      await this.storage.set(key, ritualJson);
    } catch (error) {
      console.error('Failed to save ritual:', error);
      throw new Error('Failed to persist ritual');
    }
  }

  async loadRitual(ritualId: string): Promise<DailyRitual | null> {
    try {
      const key = `ritual_${ritualId}`;
      const ritualData = await this.storage.get(key);
      if (!ritualData) {
        return null;
      }

      return JSON.parse(ritualData, this.dateReviver) as DailyRitual;
    } catch (error) {
      console.error('Failed to load ritual:', error);
      return null;
    }
  }

  async getRitualHistory(limit?: number): Promise<DailyRitual[]> {
    try {
      const historyData = await this.storage.get(PersistenceService.KEYS.HISTORY);
      if (!historyData) {
        return [];
      }

      const history = JSON.parse(historyData, this.dateReviver) as DailyRitual[];
      return limit ? history.slice(-limit) : history;
    } catch (error) {
      console.error('Failed to load ritual history:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await this.storage.delete(PersistenceService.KEYS.HISTORY);
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw new Error('Failed to clear ritual history');
    }
  }

  async createBackup(state: RitualState): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `${PersistenceService.KEYS.BACKUP_PREFIX}${timestamp}`;
      const backupData = JSON.stringify(state, this.dateReplacer);
      
      await this.storage.set(backupKey, backupData);
      
      // Clean up old backups (keep last 7 days)
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Failed to create backup:', error);
      // Don't throw - backup failure shouldn't break normal operation
    }
  }

  async restoreFromBackup(timestamp: string): Promise<RitualState | null> {
    try {
      const backupKey = `${PersistenceService.KEYS.BACKUP_PREFIX}${timestamp}`;
      const backupData = await this.storage.get(backupKey);
      
      if (!backupData) {
        return null;
      }

      return JSON.parse(backupData, this.dateReviver) as RitualState;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return null;
    }
  }

  startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      // Auto-save is handled by the engine calling saveRitualState
      // This timer could be used for additional periodic tasks
    }, this.config.autoSaveInterval);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  private loadFromStorageSync(key: string): string | null {
    // This is a simplified sync version for initial load
    // In a real implementation, you might need to handle async storage differently
    try {
      // This would need to be implemented based on your storage adapter
      // For now, returning null to indicate no saved state
      return null;
    } catch {
      return null;
    }
  }

  private validateRitualState(state: any): state is RitualState {
    return (
      state &&
      typeof state === 'object' &&
      'currentStep' in state &&
      'preferences' in state &&
      'history' in state &&
      Array.isArray(state.history)
    );
  }

  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  private dateReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }

  private async cleanupOldBackups(): Promise<void> {
    // Implementation would depend on storage adapter capabilities
    // This is a placeholder for backup cleanup logic
    console.log('Backup cleanup not implemented for this storage adapter');
  }

  dispose(): void {
    this.stopAutoSave();
  }
}