// Classificação de um login/uso de IP em: vago, cgnat, equip ou cliente.

const EQUIP_KEYWORDS = [
  "NE8000", "NE40", "MPLS", "MK ", "MIKROTIK", "BGP", "LOOPBACK",
  "BORDA", "CISCO", "ASR", "OLT", "GPON", "BACKBONE", "PROMOX", "PROXMOX",
  "TPS", "A10", "CASCATA", "STM", "ITB", "WSP", "NOKIA", "HUAWEI", "ZTE",
];

export function classifyLogin(login) {
  if (!login) return "vago";
  const u = login.toUpperCase().trim();
  if (u === "" || u === "VAGO" || u === "NAN") return "vago";
  if (u.includes("CGNAT")) return "cgnat";
  if (EQUIP_KEYWORDS.some((k) => u.includes(k))) return "equip";
  return "cliente";
}

// Metadados de cada tipo: rótulo + classe de badge.
export const TIPO_META = {
  vago:    { label: "Vago",        badge: "badge-vago",    dot: "#94a3b8" },
  equip:   { label: "Equipamento", badge: "badge-equip",   dot: "#818cf8" },
  cgnat:   { label: "CGNAT",       badge: "badge-cgnat",   dot: "#fb923c" },
  cliente: { label: "Cliente",     badge: "badge-cliente", dot: "#4ade80" },
};

export function badgeClass(tipo) {
  return (TIPO_META[tipo] || TIPO_META.cliente).badge;
}
