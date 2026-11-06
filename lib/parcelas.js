// Monta o texto do aviso diário de parcelas (vencidas e perto de vencer), no fuso de Divinópolis.
const TZ = "America/Sao_Paulo";
const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtBR = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
function diaUTC(ts) { const [y, m, d] = fmtDia.format(new Date(ts)).split("-").map(Number); return Date.UTC(y, m - 1, d); }
function brl(n) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function parcelasDe(c) {
  if (Array.isArray(c.parcelas) && c.parcelas.length) return c.parcelas;
  return [{ n: 1, valor: Number(c.total) || 0, vencimentoTs: c.vencimentoTs, pago: !!c.pago }];
}

function montarAviso(dados, agora) {
  const hoje = diaUTC(agora || Date.now());
  const dias = Number.isFinite(Number(dados.dias)) ? Number(dados.dias) : 3;
  const itens = [];
  (dados.compras || []).forEach(c => {
    const ps = parcelasDe(c);
    ps.forEach(p => {
      if (p.pago === true || !p.vencimentoTs) return;
      const falta = Math.round((diaUTC(p.vencimentoTs) - hoje) / 86400000);
      if (falta > dias) return;
      itens.push({ fornecedor: c.fornecedor || "Compra sem fornecedor", n: p.n, total: ps.length, valor: Number(p.valor) || 0, venc: p.vencimentoTs, falta });
    });
  });
  if (!itens.length) return null;
  itens.sort((a, b) => a.falta - b.falta);
  const vencidas = itens.filter(i => i.falta < 0).length;
  const quando = i => i.falta < -1 ? `venceu dia ${fmtBR.format(new Date(i.venc))}` : i.falta === -1 ? "venceu ontem" : i.falta === 0 ? "vence hoje" : i.falta === 1 ? "vence amanhã" : `vence em ${i.falta} dias (${fmtBR.format(new Date(i.venc))})`;
  const linhas = itens.slice(0, 4).map(i => `${i.fornecedor} ${i.n}/${i.total}: ${brl(i.valor)}, ${quando(i)}`);
  if (itens.length > 4) linhas.push(`e mais ${itens.length - 4}`);
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const titulo = vencidas
    ? `⚠️ ${vencidas} ${vencidas === 1 ? "parcela vencida" : "parcelas vencidas"}${itens.length > vencidas ? ` e ${itens.length - vencidas} a vencer` : ""}`
    : `📅 ${itens.length} ${itens.length === 1 ? "parcela vence" : "parcelas vencem"} em breve`;
  return { title: titulo, body: linhas.join("\n") + `\nTotal: ${brl(total)}`, url: "/?aba=compras", qtd: itens.length };
}

module.exports = { montarAviso };
