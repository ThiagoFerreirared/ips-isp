import * as XLSX from "xlsx";

export function exportToExcel(registros, cidadeNome) {
  const data = registros.map((r, i) => ({
    "#": i + 1,
    IP: r.ip,
    Login: r.login,
    "Data Verificação": r.data,
    Observações: r.obs || "",
    ...Object.fromEntries(
      Object.entries(r).filter(([k]) => !["id","ip","login","data","obs"].includes(k))
    )
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, cidadeNome.slice(0,31));
  XLSX.writeFile(wb, `IPs_${cidadeNome}_${new Date().toISOString().slice(0,10)}.xlsx`);
}