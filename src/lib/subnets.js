import { isValidIP, sortIP } from "./ip";

export const PREFIXES = [24, 25, 26, 27, 28, 29, 30, 31, 32];
export function ipText(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}
export function subnetFor(ip, prefix = 24) {
  if (!isValidIP(ip) || !PREFIXES.includes(Number(prefix))) return null;
  const size = 2 ** (32 - Number(prefix));
  const start = Math.floor(sortIP(String(ip).trim()) / size) * size;
  return { cidr: ipText(start) + "/" + prefix, start, end: start + size - 1, size, prefix: Number(prefix) };
}
export function parseCIDR(value) {
  const parts = String(value).trim().split("/");
  if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
  return subnetFor(parts[0], Number(parts[1]));
}
export function inSubnet(ip, cidr) {
  const subnet = parseCIDR(cidr);
  return !!subnet && isValidIP(ip) && sortIP(ip) >= subnet.start && sortIP(ip) <= subnet.end;
}
export function subnetOptions(records, prefix) {
  return [...new Set(records.map((r) => subnetFor(r.ip, prefix)?.cidr).filter(Boolean))]
    .sort((a, b) => parseCIDR(a).start - parseCIDR(b).start);
}
export function expandConfiguredBlocks(records, blocks) {
  const result = [...records];
  const existing = new Set(records.map((r) => String(r.ip || "").trim()));
  for (const block of blocks) {
    const subnet = parseCIDR(block);
    if (!subnet) continue;
    for (let n = subnet.start; n <= subnet.end; n++) {
      const ip = ipText(n);
      if (existing.has(ip)) continue;
      existing.add(ip);
      result.push({ id: "uncatalogued:" + ip, ip, login: "Não cadastrado", virtual: true });
    }
  }
  return result.sort((a, b) => sortIP(a.ip) - sortIP(b.ip));
}
