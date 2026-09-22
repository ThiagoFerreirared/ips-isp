import { collection, doc, getDocs, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { colName, isValidIP, normalizeIPRecord, toKey } from "./ip";
import { parseCIDR, ipText } from "./subnets";
import { classifyLogin } from "./classify";

export async function setSubnetLogin(cidade, cidr, login, allowReplace = false) {
  const subnet = parseCIDR(cidr);
  if (!cidade || !subnet || ![28, 29, 30].includes(subnet.prefix)) throw new Error("Selecione uma sub-rede /28, /29 ou /30.");
  const value = String(login || "").trim();
  if (!value) throw new Error("Informe o login do bloco.");
  return changeCity(cidade, (tx, rows, col) => {
    const byIP = new Map();
    for (const row of rows) {
      const ip = canonical(normalizeIPRecord(row, cidade).ip);
      if (!byIP.has(ip)) byIP.set(ip, []);
      byIP.get(ip).push(row);
    }
    const plan = [];
    for (let n = subnet.start; n <= subnet.end; n++) {
      const ip = ipText(n);
      const matches = byIP.get(ip) || [];
      if (matches.length > 1) throw new Error("O IP " + ip + " tem registros duplicados. Corrija a duplicidade antes de alterar o bloco.");
      const before = matches[0];
      const currentLogin = before ? normalizeIPRecord(before, cidade).login : "";
      if (before && currentLogin !== value && classifyLogin(currentLogin) !== "vago" && !allowReplace) {
        throw new Error("O bloco contém logins existentes. Confira a lista e autorize a substituição.");
      }
      if (!before || before.ip !== ip || before.login !== value) plan.push({ ip, before });
    }
    for (const { ip, before } of plan) {
      tx.set(before ? doc(col, before.id) : doc(col), { ip, login: value }, { merge: true });
      audit(tx, cidade, ip, value === "VAGO" ? "Liberação de bloco " + subnet.cidr : "Login do bloco " + subnet.cidr, {
        login: { de: before?.login || "", para: value },
        ...(!before || before.ip !== ip ? { ip: { de: before?.ip || "", para: ip } } : {}),
      });
    }
    return { changed: plan.length > 0, count: plan.length, total: subnet.size };
  });
}

// All current app writers share a revision. Retry if records changed while reading
// the legacy collection, including documents whose IDs are not the IP address.
async function changeCity(cidade, plan) {
  const col = collection(db, colName(cidade));
  const guard = doc(db, "config", "ip_revision_" + toKey(cidade));
  for (let attempt = 0; attempt < 5; attempt++) {
    const revision = await getDoc(guard);
    const version = revision.data()?.version || 0;
    const snap = await getDocs(col);
    const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    try {
      return await runTransaction(db, async (tx) => {
        const current = await tx.get(guard);
        if ((current.data()?.version || 0) !== version) throw new Error("IP_RETRY");
        const result = plan(tx, rows, col);
        if (result.changed) tx.set(guard, { version: version + 1, updatedAt: serverTimestamp() });
        return result;
      });
    } catch (error) {
      if (error.message !== "IP_RETRY") throw error;
    }
  }
  throw new Error("Os dados foram alterados por outra sessão. Tente novamente.");
}

function audit(tx, cidade, ip, acao, diff = {}) {
  tx.set(doc(collection(db, "historico")), { cidade: toKey(cidade), ip, acao, diff,
    usuario: auth.currentUser?.email || "desconhecido", timestamp: serverTimestamp() });
}
function payload(form) {
  const { id, virtual, ...value } = form;
  value.ip = String(value.ip || "").trim();
  if (!isValidIP(value.ip)) throw new Error("IP inválido.");
  value.ip = value.ip.split(".").map(Number).join(".");
  return value;
}
const canonical = (value) => isValidIP(value) ? String(value).trim().split(".").map(Number).join(".") : value;

export async function saveIP(cidade, form, id = null) {
  const value = payload(form);
  return changeCity(cidade, (tx, rows, col) => {
    if (rows.some((r) => r.id !== id && canonical(normalizeIPRecord(r, cidade).ip) === value.ip)) {
      throw new Error("Este IP já está cadastrado nesta cidade.");
    }
    const before = id ? rows.find((r) => r.id === id) : null;
    if (id && !before) throw new Error("Este registro foi removido. Atualize a lista.");
    const diff = {};
    for (const key of Object.keys(value)) {
      if ((before?.[key] ?? "") !== value[key]) diff[key] = { de: before?.[key] ?? "", para: value[key] };
    }
    tx.set(id ? doc(col, id) : doc(col), value, { merge: true });
    audit(tx, cidade, value.ip, id ? "Edição" : "Criação", diff);
    return { changed: true };
  });
}

export async function deleteIP(cidade, id) {
  return changeCity(cidade, (tx, rows, col) => {
    const record = rows.find((r) => r.id === id);
    if (!record) return { changed: false };
    tx.delete(doc(col, id));
    audit(tx, cidade, normalizeIPRecord(record, cidade).ip, "Exclusão");
    return { changed: true };
  });
}

export async function importIPs(cidade, records, onProgress = () => {}) {
  const values = records.map(payload);
  let added = 0, skipped = 0;
  for (let i = 0; i < values.length; i += 100) {
    try {
      const result = await changeCity(cidade, (tx, rows, col) => {
        const known = new Set(rows.map((r) => canonical(normalizeIPRecord(r, cidade).ip)));
        let count = 0;
        for (const value of values.slice(i, i + 100)) {
          if (known.has(value.ip)) continue;
          known.add(value.ip);
          tx.set(doc(col), value);
          audit(tx, cidade, value.ip, "Importação");
          count++;
        }
        return { changed: count > 0, count };
      });
      added += result.count;
      skipped += Math.min(100, values.length - i) - result.count;
      onProgress(added);
    } catch (error) {
      throw new Error(added + " IPs salvos antes da falha. Você pode tentar novamente; existentes serão ignorados. " + error.message);
    }
  }
  return { added, skipped };
}

export async function migrateManaus() {
  let total = 0;
  for (;;) {
    const result = await changeCity("MANAUS", (tx, rows, col) => {
      const inverted = rows.filter((r) => normalizeIPRecord(r, "MANAUS") !== r).slice(0, 100);
      for (const before of inverted) {
        const corrected = normalizeIPRecord(before, "MANAUS");
        // Backup and correction commit atomically. A failed backup prevents correction.
        tx.set(doc(collection(db, "ip_backups")), { cidade: "MANAUS", recordId: before.id,
          original: before, motivo: "manaus_ip_login_v1", createdAt: serverTimestamp() });
        tx.update(doc(col, before.id), { ip: corrected.ip, login: corrected.login });
        audit(tx, "MANAUS", corrected.ip, "Correção de campos", {
          ip: { de: before.ip || "", para: corrected.ip }, login: { de: before.login, para: corrected.login },
        });
      }
      return { changed: inverted.length > 0, count: inverted.length };
    });
    total += result.count;
    if (result.count < 100) return total;
  }
}
