// Filiais da WSP Fibra para ocorrências; independentes das coleções de IPs.
export const BRANCHES = [
  ["SANTAREM", "Santarém"], ["RUROPOLIS", "Rurópolis"],
  ["URUARA", "Uruará"], ["ITAITUBA", "Itaituba"],
  ["ALENQUER", "Alenquer"], ["ALTAMIRA", "Altamira"],
  ["MOJUI", "Mojuí"], ["MANAUS", "Manaus"],
  ["OBIDOS", "Óbidos"], ["PALMAS", "Palmas"],
];
export const BRANCH_KEYS = BRANCHES.map(([key]) => key);
export function branchLabel(key) {
  return BRANCHES.find(([id]) => id === key)?.[1];
}
