import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

// Assina um documento em tempo real. Retorna { data, loading, exists }.
export function useDocument(col, id) {
  const [state, setState] = useState({ data: null, loading: true, exists: false });

  useEffect(() => {
    if (!col || !id) {
      setState({ key: col + "/" + id, data: null, loading: false, exists: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      doc(db, col, id),
      (snap) => setState({ key: col + "/" + id, data: snap.exists() ? snap.data() : null, loading: false, exists: snap.exists() }),
      (err) => {
        console.error("useDocument", col, id, err);
        setState({ key: col + "/" + id, data: null, loading: false, exists: false });
      }
    );
    return unsub;
  }, [col, id]);

  return state.key === col + "/" + id ? state : { data: null, loading: !!(col && id), exists: false };
}
