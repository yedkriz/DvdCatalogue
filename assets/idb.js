// IndexedDB wrapper for items and lists
const DB_NAME = 'catalog-db';
const DB_VERSION = 1;

export async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('items')) {
        const items = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        items.createIndex('title', 'title', { unique: false });
        items.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains('lists')) {
        const lists = db.createObjectStore('lists', { keyPath: 'id', autoIncrement: true });
        lists.createIndex('name', 'name', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function store(db, name, mode = 'readonly') {
  return db.transaction(name, mode).objectStore(name);
}

export async function getAll(name) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = store(db, name).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function get(name, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = store(db, name).get(Number(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function put(name, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = store(db, name, 'readwrite').put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function del(name, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = store(db, name, 'readwrite').delete(Number(id));
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}