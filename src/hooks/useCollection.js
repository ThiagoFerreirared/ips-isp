import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

// Assina uma coleção em tempo real. Retorna { data, loading }.
export function useCollection(path) {
  const [state, setState] = useState({ data: [], loading: true });

  useEffect(() => {
    if (!path) {
      setState({ data: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false }),
      (err) => {
        console.error("useCollection", path, err);
        setState({ data: [], loading: false });
      }
    );
    return unsub;
  }, [path]);

  return state;
}
