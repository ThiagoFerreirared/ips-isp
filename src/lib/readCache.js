// Short-lived memory cache; shares in-flight reads without persisting customer data.
export function createReadCache(ttl = 300000) {
  const entries = new Map();
  return {
    get(key, read, force = false) {
      const previous = entries.get(key);
      if (previous && (previous.pending || (!force && Date.now() < previous.until))) return previous.promise;
      const entry = { pending: true, until: 0 };
      entry.promise = Promise.resolve().then(read).then((value) => {
        entry.pending = false; entry.until = Date.now() + ttl; return value;
      }, (error) => { if (entries.get(key) === entry) entries.delete(key); throw error; });
      entries.set(key, entry);
      return entry.promise;
    },
    clear() { entries.clear(); },
  };
}
export const readCache = createReadCache();
