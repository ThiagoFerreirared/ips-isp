import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, setDoc, onSnapshot, collection, getDocs, deleteField, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../firebase/config";
import { DEFAULT_CIDADES, cidadeLabel as defaultLabel } from "../lib/cities";
import { toKey, colName } from "../lib/ip";

const CitiesContext = createContext(null);
export const useCities = () => useContext(CitiesContext);

const REF = () => doc(db, "config", "cidades");

export function CitiesProvider({ children }) {
  const [cidades, setCidadesState] = useState(DEFAULT_CIDADES);
  const [nomes, setNomes] = useState({});
  const cidadeLabel = (key) => nomes[key] || defaultLabel(key);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      REF(),
      (snap) => {
        const lista = snap.exists() ? snap.data().lista : null;
        setCidadesState(Array.isArray(lista) && lista.length ? lista : DEFAULT_CIDADES);
        setNomes(snap.exists() ? snap.data().nomes || {} : {});
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  // Persiste otimisticamente (snapshot reconcilia depois).
  async function persist(next) {
    setCidadesState(next);
    await setDoc(REF(), { lista: next }, { merge: true });
  }

  async function addCidade(nome) {
    const key = toKey(nome);
    if (!key) return null;
    if (cidades.includes(key) || cidades.some((c) => toKey(cidadeLabel(c)) === key)) throw new Error("Já existe uma aba com esse nome.");
    await persist([...cidades, key]);
    return key;
  }

  async function renameCidade(key, nome) {
    const label = nome.trim().replace(/\s+/g, " ");
    if (!label) throw new Error("Informe o nome da cidade.");
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(REF());
      const data = snap.exists() ? snap.data() : {};
      const lista = Array.isArray(data.lista) && data.lista.length ? data.lista : DEFAULT_CIDADES;
      const labels = data.nomes || {};
      if (!lista.includes(key)) throw new Error("Esta cidade não existe mais.");
      if (lista.some((c) => c !== key && toKey(labels[c] || defaultLabel(c)) === toKey(label))) {
        throw new Error("Já existe uma aba com esse nome.");
      }
      transaction.set(REF(), { nomes: { [key]: label } }, { merge: true });
    });
  }

  async function removeCidade(key) {
    await deletarColecao(key);
    await setDoc(REF(), { nomes: { [key]: deleteField() } }, { merge: true });
    await persist(cidades.filter((c) => c !== key));
  }

  // Salva uma nova ordem completa (usado pelo drag-and-drop das abas).
  async function saveOrder(list) {
    await persist(list);
  }

  return (
    <CitiesContext.Provider value={{ cidades, cidadeLabel, loading, addCidade, renameCidade, removeCidade, saveOrder }}>
      {children}
    </CitiesContext.Provider>
  );
}

// Apaga todos os documentos da coleção da cidade (em lotes de 450).
async function deletarColecao(key) {
  const snap = await getDocs(collection(db, colName(key)));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
