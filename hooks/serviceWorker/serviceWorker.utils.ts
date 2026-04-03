import type { SyncCapableRegistration } from './serviceWorker.types';

export async function requestSync(tag: string): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const syncRegistration = registration as SyncCapableRegistration;

  if (typeof syncRegistration.sync?.register === 'function') {
    await syncRegistration.sync.register(tag);
    return;
  }

  registration.active?.postMessage({ type: 'RUN_SYNC', tag });
}

export async function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const target = event.target as IDBOpenDBRequest | null;
      const db = target?.result;
      if (!db) {
        return;
      }

      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

export async function getAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
  return requestToPromise<T[]>(store.getAll());
}
