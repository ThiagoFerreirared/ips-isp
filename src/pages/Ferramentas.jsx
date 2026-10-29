import React, { useEffect, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase/config";
import html from "../assets/operational-tools.html?raw";
export default function Ferramentas() {
  const frame = useRef(null);
  useEffect(() => {
    const lookup = httpsCallable(getFunctions(auth.app, 'southamerica-east1'), 'lookupNokia');
    const handleMessage = async event => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      const { type, id, query } = event.data || {};
      if (type !== 'nokia-search' || !Number.isSafeInteger(id) || typeof query !== 'string') return;
      const target = event.source;
      let response;
      try {
        if (!auth.currentUser) throw new Error('Login necessário');
        response = (await lookup({ query })).data;
      } catch (error) {
        const messages = {
          'functions/permission-denied': 'Seu usuário não tem permissão para consulta Nokia.',
          'functions/unauthenticated': 'Entre novamente para consultar.',
          'functions/resource-exhausted': 'Limite de consultas. Aguarde um minuto.',
          'functions/invalid-argument': 'Digite pelo menos 4 letras ou números do serial.',
        };
        response = { error: messages[error.code] || 'Consulta indisponível. Verifique a conexão ou solicite a ativação da base ao administrador.' };
      }
      if (target === frame.current?.contentWindow) {
        target.postMessage({ type: 'nokia-results', id, ...response }, window.location.origin);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  return <div className="space-y-3 p-4"><h1 className="text-xl font-extrabold">Central de Atividades Operacionais</h1><p className="text-sm text-muted">Relatórios e preferências são salvos neste navegador. A consulta Nokia usa uma base privada e exige autorização do operador.</p><iframe ref={frame} title="Central de ferramentas operacionais" srcDoc={html} className="w-full rounded-xl border border-border" style={{height:"calc(100vh - 180px)",minHeight:600}} sandbox="allow-scripts allow-same-origin allow-downloads allow-modals" allow="clipboard-write" /></div>;
}
