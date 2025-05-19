/* geeLogistics – IndexedDB helper
   Stores every product in the “items” objectStore
   (primary key: id, autoIncrement fallback) */

const DB_NAME   = 'geeLogistics';
const DB_VERSION = 1;
const STORE      = 'items';

/* ---------- open DB ---------- */
export function getDB () {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);

    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    open.onerror   = () => reject(open.error);
    open.onsuccess = () => resolve(open.result);
  });
}

/* ---------- add or update item ----------
   • If item.id exists -> use it (update or insert)
   • If item.id is null/undefined -> auto-assign next integer id */
export async function addItem (item) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    // Need an id?  Peek at the highest key and add 1
    if (item.id === undefined || item.id === null) {
      const curReq = store.openCursor(null, 'prev');   // last record
      curReq.onsuccess = () => {
        const nextId = curReq.result ? curReq.result.key + 1 : 1;
        item.id = nextId;
        store.put(item);
      };
      curReq.onerror = () => tx.abort();
    } else {
      store.put(item);   // keep caller-supplied id
    }

    tx.oncomplete = () => resolve(item.id);   // return the id that was used
    tx.onerror    = () => reject(tx.error);
  });
}

/* ---------- get all items ---------- */
export async function getAll () {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

/* ---------- delete item by ID ---------- */
export async function deleteItem (id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror    = () => reject(tx.error);
  });
}
