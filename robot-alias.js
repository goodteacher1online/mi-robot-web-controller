/**
 * Mi Robot Name & Alias Storage Manager
 * Maps BLE Device IDs to friendly custom names (Local persistence)
 */

class RobotAliasManager {
  constructor() {
    this.STORAGE_KEY = 'mi_robot_aliases_v1';
    this.DEFAULT_NAME = 'Mi Robot';
    this.aliases = this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('Local storage not accessible:', e);
      return {};
    }
  }

  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.aliases));
    } catch (e) {
      console.warn('Failed to save alias to local storage:', e);
    }
  }

  getName(deviceId, fallbackOriginalName) {
    if (!deviceId) return fallbackOriginalName || this.DEFAULT_NAME;
    return this.aliases[deviceId] || fallbackOriginalName || this.DEFAULT_NAME;
  }

  setName(deviceId, customName) {
    if (!deviceId) return;
    const cleanName = (customName || '').trim();
    if (cleanName) {
      this.aliases[deviceId] = cleanName;
    } else {
      delete this.aliases[deviceId];
    }
    this._save();
  }

  getAll() {
    return { ...this.aliases };
  }
}

window.RobotAliasManager = RobotAliasManager;
