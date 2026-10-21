// The POS's own storage on this device (IndexedDB): setup, orders, shifts, settings.
// Works with no internet; everything here is sent to the cloud by the sync engine.
const DB_NAME = "bizhub-pos";
const VERSION = 1;
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("orders")) db.createObjectStore("orders", { keyPath: "_id" });
      if (!db.objectStoreNames.contains("shifts")) db.createObjectStore("shifts", { keyPath: "_id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => (result = r));
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
const req2p = (r) => new Promise((res, rej) => ((r.onsuccess = () => res(r.result)), (r.onerror = () => rej(r.error))));

export const db = {
  get: (key) => run("kv", "readonly", (s) => req2p(s.get(key))),
  set: (key, value) => run("kv", "readwrite", (s) => s.put(value, key)),
  del: (key) => run("kv", "readwrite", (s) => s.delete(key)),
  allOrders: () => run("orders", "readonly", (s) => req2p(s.getAll())),
  putOrders: (list) => run("orders", "readwrite", (s) => list.forEach((o) => s.put(o))),
  delOrders: (ids) => run("orders", "readwrite", (s) => ids.forEach((id) => s.delete(id))),
  allShifts: () => run("shifts", "readonly", (s) => req2p(s.getAll())),
  putShifts: (list) => run("shifts", "readwrite", (s) => list.forEach((x) => s.put(x))),
  async clear() {
    await run("kv", "readwrite", (s) => s.clear());
    await run("orders", "readwrite", (s) => s.clear());
    await run("shifts", "readwrite", (s) => s.clear());
  },
};

// ask the browser not to clean this storage up when space runs low
export function keepStorage() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}
