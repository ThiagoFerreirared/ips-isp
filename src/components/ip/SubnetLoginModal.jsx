import React, { useState } from "react";
import { Modal, Button, Input, Field } from "../ui";
import { parseCIDR, ipText } from "../../lib/subnets";
import { normalizeIPRecord } from "../../lib/ip";
import { classifyLogin } from "../../lib/classify";
import { setSubnetLogin } from "../../lib/ipStore";
import { useToast } from "../../context/ToastContext";

export default function SubnetLoginModal({ cidade, cityName, cidr, records, release, onClose, onDone }) {
  const toast = useToast();
  const [login, setLogin] = useState("");
  const [replace, setReplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const subnet = parseCIDR(cidr);
  const value = release ? "VAGO" : login.trim();
  const rows = Array.from({ length: subnet.size }, (_, i) => {
    const ip = ipText(subnet.start + i);
    const current = records.map((r) => normalizeIPRecord(r, cidade)).filter((r) => r.ip?.trim() === ip);
    return { ip, current };
  });
  const conflicts = rows.filter((r) => r.current.some((c) => c.login !== value && classifyLogin(c.login) !== "vago")).length;
  async function submit() {
    if (saving || !value || (conflicts && !replace)) return;
    setSaving(true);
    try {
      const result = await setSubnetLogin(cidade, cidr, value, replace);
      toast.success(result.count + " IPs " + (release ? "liberados" : "atualizados") + " no bloco " + cidr + ".");
      onDone();
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }
  return <Modal title={(release ? "Liberar bloco — " : "Aplicar login ao bloco — ") + cidr} onClose={() => { if (!saving) onClose(); }} footer={<>
    <Button variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
    <Button disabled={saving || !value || (!!conflicts && !replace)} onClick={submit}>{saving ? "Salvando…" : release ? "Liberar " + subnet.size + " IPs" : "Aplicar aos " + subnet.size + " IPs"}</Button>
  </>}>
    <p className="mb-3 text-sm text-muted">{cityName} · {ipText(subnet.start)} até {ipText(subnet.end)}. A ação abrange todos os {subnet.size} IPs, incluindo os extremos, mesmo que a busca ou outro filtro oculte linhas.</p>
    {release ? <p className="mb-3 text-sm">Todos os logins deste bloco serão substituídos por VAGO. Os endereços, observações e demais campos serão mantidos.</p> : <Field label="Login para todo o bloco"><Input aria-label="Login para todo o bloco" autoFocus disabled={saving} value={login} onChange={(e) => { setLogin(e.target.value); setReplace(false); }} placeholder="ex: cliente@provedor.com.br" /></Field>}
    <div className="my-3 max-h-56 overflow-auto rounded-lg border border-border p-3 text-xs">
      {rows.map((r) => <div key={r.ip} className="flex justify-between gap-3 py-1"><span className="ip-mono">{r.ip}</span><span>{r.current.length ? r.current.map((c) => c.login || "VAGO").join(" / ") : "Não cadastrado"}</span></div>)}
    </div>
    {conflicts > 0 && <label className="flex items-start gap-2 text-sm text-amber-500"><input type="checkbox" disabled={saving} checked={replace} onChange={(e) => setReplace(e.target.checked)} />Substituir os logins existentes em {conflicts} IPs, incluindo eventuais reservas.</label>}
  </Modal>;
}
