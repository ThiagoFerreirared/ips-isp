export const isoDate = (value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value || "") ? value.split("/").reverse().join("-") : value || "";
function nextDay(value) { const date = new Date(value + "T12:00:00Z"); if (Number.isNaN(date.getTime())) return value; date.setUTCDate(date.getUTCDate()+1); return date.toISOString().slice(0,10); }
export function eventOutages(event) {
  if (Array.isArray(event.quedas) && event.quedas.length) return event.quedas.map(q=>({...q}));
  const date = isoDate(event.data);
  return [{data_inicio:date,hora_inicio:event.hora_inicio || "",data_termino:event.hora_termino && event.hora_termino < event.hora_inicio ? nextDay(date) : date,hora_termino:event.hora_termino || ""}];
}
const validDate = value => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false; const d=new Date(value+"T12:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===value; };
export function eventPayload(form) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const quedas = eventOutages(form).map((q,i)=>{
    if (!validDate(q.data_inicio) || !time.test(q.hora_inicio)) throw Error("Informe a data e hora de início da queda " + (i+1) + ".");
    if(q.hora_termino && (!validDate(q.data_termino) || !time.test(q.hora_termino) || q.data_termino+"T"+q.hora_termino < q.data_inicio+"T"+q.hora_inicio)) throw Error("Confira o término da queda " + (i+1) + ". Para o dia seguinte, altere a data de término.");
    return {data_inicio:q.data_inicio,hora_inicio:q.hora_inicio,data_termino:q.hora_termino?q.data_termino:"",hora_termino:q.hora_termino || ""};
  });
  const {id,operadora_custom,timestamp,updatedAt,...rest}=form;
  return {...rest,quedas,data:quedas[0].data_inicio,hora_inicio:quedas[0].hora_inicio,hora_termino:quedas[0].hora_termino};
}
export function outageColumn(event, side) {
  return eventOutages(event).map((q,i)=> (i+1)+". "+(q["hora_"+side] ? isoDate(q["data_"+side]).split("-").reverse().join("/")+" "+q["hora_"+side] : "Em aberto")).join("\n");
}
