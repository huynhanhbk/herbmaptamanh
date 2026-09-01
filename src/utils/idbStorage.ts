/**
 * IndexedDB storage engine for HerbMap Tam Anh
 * Provides large-capacity (>50MB-1GB) persistence to avoid localStorage 5MB quota errors.
 */
import { MedicinalPlant, BackupSnapshot } from '../types';

const DB_NAME = 'HerbMapTamAnh_v2';
const DB_VERSION = 1;
const STORE_PLANTS = 'plants_store';
const STORE_BACKUPS = 'backups_store';

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PLANTS)) {
          db.createObjectStore(STORE_PLANTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
          db.createObjectStore(STORE_BACKUPS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export async function idbSaveAllPlants(plants: MedicinalPlant[]): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PLANTS, 'readwrite');
      const store = tx.objectStore(STORE_PLANTS);
      
      // Clear existing records and rewrite fresh deduplicated batch
      store.clear();
      plants.forEach((p) => {
        if (p && p.id) {
          store.put(p);
        }
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGetAllPlants(): Promise<MedicinalPlant[] | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PLANTS, 'readonly');
      const store = tx.objectStore(STORE_PLANTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as MedicinalPlant[]);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSaveBackups(backups: BackupSnapshot[]): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BACKUPS, 'readwrite');
      const store = tx.objectStore(STORE_BACKUPS);
      store.clear();
      backups.forEach((b) => {
        if (b && b.id) {
          store.put(b);
        }
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGetAllBackups(): Promise<BackupSnapshot[] | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BACKUPS, 'readonly');
      const store = tx.objectStore(STORE_BACKUPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result)) {
          resolve(result as BackupSnapshot[]);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
