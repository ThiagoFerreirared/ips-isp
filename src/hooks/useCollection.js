import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, limit } from "firebase/firestore";
import { db, auth } from "../firebase/config";
const subscriptions = new Map();
export function useCollection(path, options = {}) {
  const key = JSON.stringify([auth.currentUser?.uid || "public", path, options.take || 0, options.statuses || null]);
  const [state, setState] = useState({ data: [], loading: true });
  useEffect(() => {
    if (!path) { setState({ key, data: [], loading: false }); return; }
    let entry = subscriptions.get(key);
    if (!entry) {
      entry = { listeners: new Set(), state: { key, data: [], loading: true }, timer: null };
      subscriptions.set(key, entry);
      const constraints = [];
      if (options.statuses) constraints.push(where("status", "in", options.statuses));
      if (options.take) constraints.push(limit(options.take));
      entry.stop = onSnapshot(query(collection(db, path), ...constraints), (snap) => {
        entry.state = { key, data: snap.docs.map((d) => ({ ...d.data(), id: d.id })), loading: false, error: null };
        entry.listeners.forEach((notify) => notify(entry.state));
      }, (error) => {
        entry.state = { ...entry.state, loading: false, error };
        entry.listeners.forEach((notify) => notify(entry.state));
      });
    }
    clearTimeout(entry.timer);
    entry.listeners.add(setState);
    setState(entry.state);
    return () => {
      entry.listeners.delete(setState);
      entry.timer = setTimeout(() => {
        if (!entry.listeners.size) { entry.stop(); if (subscriptions.get(key) === entry) subscriptions.delete(key); }
      }, 60000);
    };
  }, [key]);
  return state.key === key ? state : { data: [], loading: !!path };
}
export function clearCollectionSubscriptions() {
  subscriptions.forEach((entry) => { clearTimeout(entry.timer); entry.stop(); });
  subscriptions.clear();
}
