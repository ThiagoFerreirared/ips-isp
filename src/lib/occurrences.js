export const OCCURRENCE_STATUS = ["ABERTA", "EM ATENDIMENTO", "RESOLVIDA"];
export function nowLocal() {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (key) => parts.find((p) => p.type === key).value;
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute") + ":" + get("second");
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return false;
  const full = value.length === 16 ? value + ":00" : value;
  const date = new Date(full + "Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 19) === full;
}
export function occurrencePayload(form) {
  const result = Object.fromEntries(["cidade", "olt", "cto", "motivo", "protocolo", "inicio", "fim", "status", "responsavel", "observacoes"].map((k) => [k, String(form[k] || "").trim()]));
  if (!result.cidade) throw new Error("Selecione a cidade.");
  if (!result.motivo) throw new Error("Informe o motivo da ocorrência.");
  if (!validDate(result.inicio)) throw new Error("Informe uma data e hora de abertura válidas.");
  if (!OCCURRENCE_STATUS.includes(result.status)) throw new Error("Selecione um status válido.");
  if (result.fim && (!validDate(result.fim) || result.fim < result.inicio)) throw new Error("O encerramento deve ser igual ou posterior à abertura.");
  if (result.status === "RESOLVIDA" && !result.fim) throw new Error("Informe a data e hora de encerramento.");
  if (result.status !== "RESOLVIDA") result.fim = "";
  return result;
}
export function formatOccurrenceDate(value) {
  if (!value) return "—";
  const [date, time] = value.split("T");
  return date.split("-").reverse().join("/") + " " + (time || "");
}
const normalize = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function filterOccurrences(records, { cidade = "", status = "", search = "", from = "", to = "" }, cityLabel = (c) => c) {
  const query = normalize(search.trim());
  return records.filter((r) => (!cidade || r.cidade === cidade) && (!status || r.status === status) && (!from || r.inicio?.slice(0, 10) >= from) && (!to || r.inicio?.slice(0, 10) <= to) && (!query || [cityLabel(r.cidade), r.olt, r.cto, r.motivo, r.protocolo, r.responsavel, r.observacoes].some((s) => normalize(s).includes(query))))
    .sort((a, b) => (b.inicio || "").localeCompare(a.inicio || ""));
}
