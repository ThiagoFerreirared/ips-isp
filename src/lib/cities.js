import { toKey } from "./ip";

// Cidades padrão (usadas até config/cidades existir no Firestore).
export const DEFAULT_CIDADES = [
  "SANTAREM", "MANAUS", "ITAITUBA", "RUROPOLIS",
  "ALTAMIRA_ALENQUER", "ALENQUER", "SAPEZAL_CJ", "VILHENA",
  "COMODORO", "PRIVADO_BACKBONE", "IPV6_WSP",
];

// Colunas extras por cidade (chaves canônicas).
export const EXTRA_COLS = {
  ITAITUBA: ["subrede", "fabricante"],
  RUROPOLIS: ["ip_privado", "fabricante", "largura_banda"],
  ALTAMIRA_ALENQUER: ["ip_privado", "cidade_local"],
  SAPEZAL_CJ: ["vlan"],
  VILHENA: ["vlan"],
  COMODORO: ["vlan"],
  MANAUS: ["rede", "descricao"],
};

export function extrasFor(cidade) {
  return EXTRA_COLS[toKey(cidade)] || [];
}

// Nome amigável para exibição.
export function cidadeLabel(key) {
  return (key || "").replace(/_/g, " ");
}
