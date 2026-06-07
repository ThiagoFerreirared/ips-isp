// Utilidades de IP e nomes de coleção do Firestore.

// Converte nome de cidade em chave canônica (igual ao backend existente).
export const toKey = (c) => (c || "").replace(/[\/\s]/g, "_").toUpperCase();

// Nome da coleção Firestore de uma cidade.
export const colName = (c) => "ips_" + toKey(c);

// Valor numérico de um IPv4 para ordenação.
export function sortIP(ip = "") {
  return (ip || "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0)
    .reduce((acc, val) => acc * 256 + val, 0);
}

// Detecta os blocos /24 presentes numa lista de registros.
export function detectarBlocos(registros) {
  const blocos = new Set();
  registros.forEach((r) => {
    if (r.ip) {
      const partes = r.ip.split(".");
      if (partes.length === 4) blocos.add(partes.slice(0, 3).join("."));
    }
  });
  return ["TODOS", ...Array.from(blocos).sort(sortBlock)];
}

function sortBlock(a, b) {
  return sortIP(a + ".0") - sortIP(b + ".0");
}

// Gera IPs a partir de uma base "x.y.z" e expressões de octeto: "0-255", "1,5,10".
export function generateIPs(base, blocks) {
  const ips = [];
  for (const block of blocks) {
    const b = String(block).trim();
    if (b.includes("-")) {
      const [start, end] = b.split("-").map(Number);
      for (let i = start; i <= end; i++) ips.push(`${base}.${i}`);
    } else if (b.includes(",")) {
      b.split(",").forEach((n) => ips.push(`${base}.${n.trim()}`));
    } else if (b !== "") {
      ips.push(`${base}.${b}`);
    }
  }
  return ips;
}

// Valida um IPv4 simples.
export function isValidIP(ip = "") {
  const parts = String(ip).trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p) && +p >= 0 && +p <= 255);
}
