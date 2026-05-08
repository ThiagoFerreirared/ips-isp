export function generateIPs(base, blocks) {
  const ips = [];
  for (const block of blocks) {
    const b = block.trim();
    if (b.includes("-")) {
      const [start, end] = b.split("-").map(Number);
      for (let i = start; i <= end; i++) ips.push(`${base}.${i}`);
    } else if (b.includes(",")) {
      b.split(",").forEach(n => ips.push(`${base}.${n.trim()}`));
    } else if (b !== "") {
      ips.push(`${base}.${b}`);
    }
  }
  return ips;
}