// Rotina diária (Vercel Cron): confere as parcelas a prazo e manda notificação para os aparelhos inscritos.
const webpush = require("web-push");
const { montarAviso } = require("../lib/parcelas");

module.exports = async (req, res) => {
  const segredo = process.env.CRON_SECRET;
  const auth = req.headers["authorization"] || "";
  const chave = (req.query && req.query.key) || "";
  if (!segredo || (auth !== `Bearer ${segredo}` && chave !== segredo)) {
    return res.status(401).json({ erro: "não autorizado" });
  }
  const teste = req.query && req.query.teste === "1";
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_KEY, token = process.env.ROTINA_TOKEN;
    const rpc = (nome, corpo) => fetch(`${url}/rest/v1/rpc/${nome}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    });
    const r = await rpc("rotina_parcelas", { token });
    if (!r.ok) return res.status(502).json({ erro: "falha ao ler parcelas", status: r.status });
    const dados = await r.json();

    let aviso = montarAviso(dados, Date.now());
    if (!aviso && teste) aviso = { title: "✅ Teste de aviso", body: "Os avisos de parcelas da L&F estão funcionando neste aparelho.", url: "/?aba=compras" };
    const inscricoes = dados.inscricoes || [];
    if (!aviso) return res.json({ ok: true, parcelas: 0, aparelhos: inscricoes.length, enviados: 0 });

    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    let enviados = 0, removidos = 0, falhas = 0;
    await Promise.all(inscricoes.map(async i => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          JSON.stringify(aviso), { TTL: 12 * 3600, urgency: "high" });
        enviados++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) { await rpc("rotina_remover_inscricao", { token, ep: i.endpoint }); removidos++; }
        else falhas++;
      }
    }));
    return res.json({ ok: true, parcelas: aviso.qtd || 0, aparelhos: inscricoes.length, enviados, removidos, falhas });
  } catch (e) {
    return res.status(500).json({ erro: "falha na rotina" });
  }
};
