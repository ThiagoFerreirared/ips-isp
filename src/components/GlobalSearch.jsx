import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const ALL_CIDADES = [
  "SANTAREM","MANAUS","ITAITUBA","RUROPOLIS","ALTAMIRA_ALENQUER",
  "ALENQUER","SAPEZAL_CJ","VILHENA","COMODORO","PRIVADO_BACKBONE","IPV6_WSP"
];

export default function GlobalSearch({ onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setResults([]);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (q.length < 3) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const found = [];
      for (const cidade of ALL_CIDADES) {
        try {
          const snap = await getDocs(collection(db, "ips_" + cidade));
          snap.docs.forEach(d => {
            const r = d.data();
            if (r.ip?.includes(q) || r.login?.toLowerCase().includes(q.toLowerCase())) {
              found.push({ id: d.id, cidade, ...r });
            }
          });
        } catch {}
      }
      setResults(found.slice(0, 40));
      setSearching(false);
    }, 500);
  }, [q]);

  return (
    <div className="global-search-wrap" ref={wrapRef}>
      <input
        className="search-input"
        style={{width:"260px"}}
        placeholder="🔎 Busca global (todas cidades)..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {(results.length > 0 || searching) && (
        <div className="global-results">
          {searching && <div style={{padding:"12px",color:"#64748b",fontSize:".82rem"}}>Buscando...</div>}
          {results.map(r => (
            <div key={r.id} className="global-result-item" onClick={() => { onSelect(r.cidade); setQ(""); setResults([]); }}>
              <div className="gr-ip">{r.ip}</div>
              <div className="gr-meta">{r.login} — <b>{r.cidade.replace(/_/g," ")}</b></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}