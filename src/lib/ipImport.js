import { isValidIP, normalizeIPRecord } from "./ip";

const header = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
export function mapSheetRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(header);
  const ip = headers.findIndex((h) => ["ip", "endereco ip", "endereco"].includes(h));
  const login = headers.findIndex((h) => ["login", "login / uso", "cliente", "uso"].includes(h));
  const date = headers.findIndex((h) => ["data", "data verificacao", "data de verificacao"].includes(h));
  if (ip < 0) throw new Error("A primeira linha da planilha precisa ter uma coluna IP. Use também Login e Data, em qualquer ordem.");
  return rows.slice(1).filter((r) => r.some((v) => String(v).trim())).map((r) => [r[ip], login < 0 ? "" : r[login], date < 0 ? "" : r[date]].map((v) => String(v ?? "")));
}
export function previewImport(rows, cidade, existing = []) {
  const known = new Set(existing.map((r) => isValidIP(normalizeIPRecord(r, cidade).ip) ? String(normalizeIPRecord(r, cidade).ip).trim().split(".").map(Number).join(".") : String(normalizeIPRecord(r, cidade).ip || "").trim()));
  const seen = new Set();
  return rows.map((row, i) => {
    const raw = { ip: String(row[0] || "").trim(), login: String(row[1] || "").trim() || "VAGO", data: String(row[2] || "").trim() };
    const record = normalizeIPRecord(raw, cidade);
    const corrected = record !== raw;
    if (isValidIP(record.ip)) record.ip = record.ip.split(".").map(Number).join(".");
    let error = "";
    if (!isValidIP(record.ip)) error = "IP inválido";
    else if (seen.has(record.ip)) error = "Repetido nesta importação";
    else if (known.has(record.ip)) error = "Já cadastrado nesta cidade";
    seen.add(record.ip);
    return { record, line: i + 1, error, corrected };
  });
}
