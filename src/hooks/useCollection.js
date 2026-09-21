import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

// Assina uma coleção em tempo real. Retorna { data, loading }.
export function useCollection(path) {
  const [state, setState] = useState({ data: [], loading: true });

  useEffect(() => {
    if (!path) {
      setState({ path, data: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => setState({ path, data: snap.docs.map((d) => ({ ...d.data(), id: d.id })), loading: false }),
      (err) => {
        console.error("useCollection", path, err);
        setState({ path, data: [], loading: false });
      }
    );
    return unsub;
  }, [path]);

  return state.path === path ? state : { data: [], loading: !!path };
}
