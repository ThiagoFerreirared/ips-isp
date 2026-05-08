export function classifyLogin(login) {
  if (!login) return "vago";
  const u = login.toUpperCase().trim();
  if (u === "VAGO" || u === "" || u === "NAN") return "vago";

  const equipKeywords = [
    "NE8000","NE40","MPLS","MK ","MIKROTIK","BGP","LOOPBACK",
    "BORDA","CISCO","ASR","OLT","GPON","BACKBONE","PROMOX","PROXMOX",
    "TPS","A10","CGNAT","CASCATA","STM","ITB","WSP","NOKIA","HUAWEI","ZTE"
  ];

  if (equipKeywords.some(k => u.includes(k))) return "equip";
  if (u.includes("CGNAT")) return "cgnat";
  return "cliente";
}

export function badgeClass(tipo) {
  return {
    vago: "badge-vago",
    equip: "badge-equip",
    cgnat: "badge-cgnat",
    cliente: "badge-usado"
  }[tipo] || "badge-usado";
}

export function rowClass(tipo) {
  return {
    vago: "row-vago",
    equip: "row-equip",
    cgnat: "row-cgnat",
    cliente: "row-cliente"
  }[tipo] || "";
}