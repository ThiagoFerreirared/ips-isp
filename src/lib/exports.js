import * as XLSX from "xlsx";

// Exporta os registros de IP de uma cidade para .xlsx
export function exportIPsExcel(registros, cidadeNome, extras = []) {
  const data = registros.map((r, i) => ({
    "#": i + 1,
    IP: r.ip,
    Login: r.login,
    "Data Verificação": r.data || "",
    Observações: r.obs || "",
    ...Object.fromEntries(extras.map((e) => [e.replace(/_/g, " "), r[e] || ""])),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(cidadeNome).slice(0, 31));
  XLSX.writeFile(wb, `IPs_${cidadeNome}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
