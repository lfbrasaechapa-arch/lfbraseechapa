function fornStats(f){
const cs = compras().filter(c => c.fornecedorId === f.id || (!c.fornecedorId && (c.fornecedor||"").trim().toLowerCase() === f.nome.trim().toLowerCase()));
const total = round2(cs.reduce((s,c)=>s+c.total,0));
let aberto = 0; cs.forEach(c => parcelasDe(c).forEach(p => { if(!p.pago) aberto += p.valor; }));
const ult = cs.length ? Math.max(...cs.map(c=>c.ts)) : null;
return {n:cs.length, total, aberto:round2(aberto), ult};
}
function viewFornecedores(){
const q = ui.fornQ.trim().toLowerCase();
const all = fornecedores();
const fs = all.filter(f => !q || [f.nome,f.contato,f.doc,f.obs].some(x => (x||"").toLowerCase().includes(q)));
const cards = fs.length ? `<div class="forn-grid">${fs.map(f => { const st = fornStats(f); const wa = waLink(f.telefone);
return `<div class="card forn">
<div class="fn">${esc(f.nome)}</div>
<dl>
${f.telefone?`<dt>Telefone</dt><dd class="num">${esc(f.telefone)}</dd>`:""}
${f.contato?`<dt>Contato</dt><dd>${esc(f.contato)}</dd>`:""}
${f.doc?`<dt>CNPJ/CPF</dt><dd class="num">${esc(f.doc)}</dd>`:""}
${f.pix?`<dt>Chave Pix</dt><dd class="num">${esc(f.pix)}</dd>`:""}
${f.obs?`<dt>Fornece</dt><dd>${esc(f.obs)}</dd>`:""}
</dl>
<div class="stats"><span>${st.n} ${st.n===1?"compra":"compras"}</span><span>Total <b>${brl(st.total)}</b></span>${st.aberto?`<span>Em aberto <b style="color:var(--warn)">${brl(st.aberto)}</b></span>`:""}${st.ult?`<span>Última ${fmtDate(st.ult)}</span>`:""}</div>
<div class="acts">
<button class="btn btn-primary" style="padding:6px 12px" data-act="forn-buy" data-v="${f.id}">Nova compra</button>
${wa?`<a class="btn" style="padding:6px 12px;text-decoration:none" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`:""}
<button class="btn btn-ghost" style="padding:6px 12px" data-act="forn-edit" data-v="${f.id}">Editar</button>
</div></div>`; }).join("")}</div>`
: `<div class="empty">${all.length ? "Nenhum fornecedor com esse nome." : "Nenhum fornecedor cadastrado. Toque em <b>Novo fornecedor</b>."}</div>`;
const subnav = `<div class="subnav"><button class="chip" data-act="buy-view" data-v="compras" aria-pressed="false">Compras</button><button class="chip" data-act="buy-view" data-v="fornecedores" aria-pressed="true">Fornecedores (${all.length})</button></div>`;
return `<div class="panel-head"><h2>Fornecedores</h2>${subnav}</div>
<div class="toolbar"><input type="search" id="fornQ" placeholder="Buscar fornecedor, contato ou produto" value="${esc(ui.fornQ)}" style="flex:1 1 220px;width:auto"><button class="btn btn-primary" data-act="forn-new">+ Novo fornecedor</button></div>
${cards}`;
}
function updateFornNote(){
const el = $("#b-forn-note"); if(!el || !ui.compra) return;
const nome = ui.compra.fornecedor.trim();
const state = !nome ? "empty" : findForn(nome) ? "ok" : "new:"+nome;
if(el.dataset.state === state) return; el.dataset.state = state;
if(state === "empty") el.innerHTML = S.data.fornecedores.size ? "" : `<button type="button" class="btn btn-ghost" style="padding:2px 8px;font-size:12.5px" data-act="forn-new">+ Cadastrar fornecedor</button>`;
else if(state === "ok"){ const f = findForn(nome); el.innerHTML = `Cadastrado${f.telefone?` · <span class="num">${esc(f.telefone)}</span>`:""}`; }
else el.innerHTML = `Não cadastrado. <button type="button" class="btn btn-ghost" style="padding:2px 8px;font-size:12.5px" data-act="forn-new-from">Cadastrar “${esc(nome)}”</button>`;
}
function viewParcelas(){
const ab = parcelasAbertas();
const dias = alertaDias();
const rows = ab.length ? `<div class="buy-list">${ab.map(p => { const d = dueInfo(p);
return `<div class="buy-item" style="cursor:default"><span class="bi-t">${esc(p.fornecedor||"Compra sem fornecedor")} <span class="muted num" style="font-weight:400">· ${p.n}/${p.total}</span></span><span class="bi-v">${brl(p.valor)}</span>
<span class="bi-m"><span class="num">${fmtDate(p.vencimentoTs)}</span><span class="due ${d[0]}">${d[1]}</span><span style="margin-left:auto;display:flex;gap:6px"><button class="btn btn-ghost" style="padding:3px 8px" data-act="buy-hist" data-v="${p.cid}">Ver compra</button><button class="btn" style="padding:3px 10px" data-act="parc-pay" data-v="${p.cid}:${p.idx}">Pagar</button></span></span></div>`; }).join("")}</div>`
: `<p class="muted" style="margin:0;font-size:14px">Nenhuma parcela em aberto.</p>`;
const tot = round2(ab.reduce((s,p)=>s+p.valor,0));
return `<div class="card"><div class="panel-head" style="margin-bottom:6px"><h3 style="margin:0">Parcelas a pagar</h3><span class="num" style="font-weight:600">${brl(tot)}</span></div>
<label class="check" style="font-weight:400;margin-bottom:8px;flex-wrap:wrap">Avisar com
<select id="alert-dias" style="width:auto;padding:4px 8px">${[0,1,2,3,5,7].map(n=>`<option value="${n}" ${n===dias?"selected":""}>${n===0?"no dia":n+(n===1?" dia":" dias")}</option>`).join("")}</select> de antecedência</label>
${rows}</div>`;
}
function buyLineCalc(l){ const q = parseInt(l.qtd,10), c = parseMoney(l.custo); return {q: isFinite(q)?q:0, c: isFinite(c)?c:0, t: round2((isFinite(q)?q:0)*(isFinite(c)?c:0))}; }
function updateBuyCalc(){
const k = ui.compra; if(!k || !$("#b-total")) return;
updateFornNote();
let total = 0;
k.linhas.forEach((l,i) => {
const {q, t} = buyLineCalc(l); total += t;
const te = $("#bl-tot-"+i); if(te) te.textContent = t ? brl(t) : "—";
const ne = $("#bl-note-"+i); if(!ne) return;
const p = findProd(l.nome);
const state = !l.nome.trim() ? "empty" : p ? "match:"+p.id+":"+q+":"+p.estoque : "new";
if(ne.dataset.state === state) return;
ne.dataset.state = state;
if(state === "empty") ne.innerHTML = "";
else if(p){
const ctl = p.estoque !== null && p.estoque !== undefined;
ne.innerHTML = ctl ? `Estoque de ${esc(p.nome)}: <b class="num">${p.estoque}</b> → <b class="num" style="color:var(--ok)">${p.estoque + q}</b>` : `${esc(p.nome)} passa a ter controle de estoque com <b class="num">${q}</b> un.`;
} else {
ne.innerHTML = `<span class="new">Produto novo:</span> será cadastrado no estoque. <label style="display:flex;gap:6px;align-items:center">Preço de venda <input type="text" id="bl-venda-${i}" inputmode="decimal" placeholder="opcional" value="${esc(l.venda)}"></label><span>Sem preço, fica como insumo e não aparece nas comandas.</span>`;
}
});
$("#b-total").textContent = brl(round2(total));
updateParcPreview(round2(total));
}
function updateParcPreview(total){
const k = ui.compra, box = $("#b-parc"); if(!box || k.pagamento !== "prazo") return;
if(!k.manual) k.parcelas = gerarParcelas(total, k.nparc, k.venc, k.intervalo);
if(!k.manual || !box.children.length){
box.innerHTML = k.parcelas.map((p,i) => `<div class="parc-row"><span class="pn">${p.n}/${k.parcelas.length}</span>
<input type="text" id="pc-val-${i}" inputmode="decimal" value="${moneyIn(p.valor)}" aria-label="Valor da parcela ${p.n}">
<input type="date" id="pc-venc-${i}" value="${toDateInput(p.vencimentoTs)}" aria-label="Vencimento da parcela ${p.n}"></div>`).join("");
}
const soma = round2((k.parcelas||[]).reduce((s,p)=>s+(isFinite(p.valor)?p.valor:0),0));
const w = $("#b-parc-warn");
if(w) w.textContent = (k.manual && Math.abs(soma-total) > 0.004) ? "A soma das parcelas ("+brl(soma)+") está diferente do total da compra ("+brl(total)+")." : "";
}
function finalizarCompra(){
const k = ui.compra;
const linhas = k.linhas.filter(l => l.nome.trim() || l.qtd || l.custo);
if(!linhas.length){ toast("Adicione pelo menos um produto."); return; }
for(const l of linhas){
const {q} = buyLineCalc(l); const c = parseMoney(l.custo);
if(!l.nome.trim()){ toast("Informe o nome de todos os produtos."); return; }
if(q <= 0){ toast("Informe a quantidade de "+l.nome.trim()+"."); return; }
if(!isFinite(c) || c < 0){ toast("Informe o valor unitário de "+l.nome.trim()+", por exemplo 4,50."); return; }
}
const ts = new Date(k.data+"T12:00").getTime();
if(!isFinite(ts)){ toast("Informe a data da compra."); return; }
if(k.pagamento === "prazo"){
if(!k.parcelas || !k.parcelas.length){ toast("Informe o número de parcelas e o 1º vencimento."); return; }
if(k.parcelas.some(p => !isFinite(p.valor) || p.valor <= 0 || !isFinite(p.vencimentoTs))){ toast("Confira o valor e a data de cada parcela."); return; }
const totalPrev = round2(k.linhas.filter(l => l.nome.trim()).reduce((s,l)=>s+buyLineCalc(l).t,0));
const soma = round2(k.parcelas.reduce((s,p)=>s+p.valor,0));
if(Math.abs(soma-totalPrev) > 0.004){ toast("A soma das parcelas precisa ser igual ao total da compra ("+brl(totalPrev)+")."); return; }
}
const itens = [];
for(const l of linhas){
const {q, c, t} = buyLineCalc(l);
let p = findProd(l.nome), pid;
if(p){
pid = p.id; const ref = S.data.produtos.get(pid);
ref.estoque = (ref.estoque === null || ref.estoque === undefined ? 0 : ref.estoque) + q;
ref.custo = c; persist("produtos", pid);
} else {
pid = "p-"+uid(); const venda = parseMoney(l.venda);
put("produtos", pid, {nome:l.nome.trim(), categoria: isFinite(venda) ? "Outros" : "Insumos", preco: isFinite(venda) ? venda : 0, venda: isFinite(venda), estoque:q, custo:c, criadoTs:Date.now()});
}
itens.push({pid, nome:l.nome.trim(), qtd:q, custo:c});
}
const total = round2(itens.reduce((s,i)=>s+i.qtd*i.custo,0));
const fo = findForn(k.fornecedor);
const doc = {fornecedor: fo ? fo.nome : k.fornecedor.trim(), fornecedorId: fo ? fo.id : null, ts, itens, total, pagamento:k.pagamento, criadoTs:Date.now()};
if(k.pagamento === "avista"){ doc.forma = k.forma; doc.pago = true; doc.pagoTs = ts; }
else { doc.parcelas = k.parcelas.map((p,i)=>({n:i+1, valor:round2(p.valor), vencimentoTs:p.vencimentoTs, pago:false})); doc.pago = false; }
put("compras", uid(), doc);
toast("Compra de "+brl(total)+" registrada. Estoque atualizado.");
ui.compra = novaCompra(); render();
}
/* ----- aba financeiro ----- */
const DAY = 86400000;
function sod(d){ const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); }
function periodRange(p){
const now = new Date(), t0 = sod(now);
if(p==="hoje") return [t0, t0+DAY, "Hoje"];
if(p==="ontem") return [t0-DAY, t0, "Ontem"];
if(p==="7d") return [sod(t0-6*DAY), t0+DAY, "Últimos 7 dias"];
if(p==="mes") return [new Date(now.getFullYear(),now.getMonth(),1).getTime(), new Date(now.getFullYear(),now.getMonth()+1,1).getTime(), "Este mês"];
if(p==="mespass") return [new Date(now.getFullYear(),now.getMonth()-1,1).getTime(), new Date(now.getFullYear(),now.getMonth(),1).getTime(), "Mês passado"];
return [0, Infinity, "Todo o período"];
}
function viewFinanceiro(){
const [a,b,label] = periodRange(ui.period);
const fin = comandas().filter(c => (c.status==="fechada"||c.status==="cancelada") && c.fechamentoTs>=a && c.fechamentoTs<b).sort((x,y)=>y.fechamentoTs-x.fechamentoTs);
const fech = fin.filter(c => c.status==="fechada");
const desp = [...S.data.despesas.entries()].map(([id,d])=>({id,...d})).filter(d => d.ts>=a && d.ts<b).sort((x,y)=>y.ts-x.ts);
const fat = round2(fech.reduce((s,c)=>s+(c.total||0),0));
const taxaCartao = round2(fech.reduce((s,c)=>s+taxaComanda(c),0));
const liquido = round2(fat - taxaCartao);
const descontos = round2(fech.reduce((s,c)=>s+(c.desconto||0),0));
let saidasCompras = 0; const movCompras = [];
compras().forEach(c => {
const quem = c.fornecedor || "compra sem fornecedor";
if(c.pagamento==="avista"){ if(c.pagoTs>=a && c.pagoTs<b){ saidasCompras += c.total; movCompras.push({ts:c.pagoTs, desc:"Compra à vista · "+quem+(c.forma?" ("+FORMAS[c.forma]+")":""), valor:c.total, cid:c.id}); } }
else parcelasDe(c).forEach((p,i,arr) => { if(p.pago && p.pagoTs>=a && p.pagoTs<b){ saidasCompras += p.valor; movCompras.push({ts:p.pagoTs, desc:"Parcela "+p.n+"/"+arr.length+" · "+quem, valor:p.valor, cid:c.id}); } });
});
saidasCompras = round2(saidasCompras);
const saidasOutras = round2(desp.reduce((s,d)=>s+d.valor,0));
const saidas = round2(saidasCompras + saidasOutras);
const pend = parcelasAbertas();
const aPagar = round2(pend.reduce((s,p)=>s+p.valor,0));
const ticket = fech.length ? fat/fech.length : 0;
const abertasNow = abertas(); const emAberto = round2(abertasNow.reduce((s,c)=>s+subtotal(c),0));
const porForma = {pix:0,dinheiro:0,cartao:0}, cart = {debito:0,credito:0};
fech.forEach(c => (c.pagamentos||[]).forEach(p => { porForma[p.forma] = (porForma[p.forma]||0) + p.valor; if(p.forma==="cartao") cart[p.tipo||"debito"] += p.valor; }));
const bars = Object.keys(FORMAS).map(k => {
const v = round2(porForma[k]||0), pct = fat ? v/fat*100 : 0;
const extra = k==="cartao" && v ? ` <span class="muted" style="font-size:12.5px">débito ${brl(cart.debito)} · crédito ${brl(cart.credito)}</span>` : "";
return `<div><div class="bar-top"><span><span class="dot" style="background:${FORMA_COLOR[k]}"></span>${FORMAS[k]}${extra}</span><span><b>${brl(v)}</b> <span class="muted num">${pct.toFixed(0)}%</span></span></div>
<div class="track"><div class="fill" style="width:${pct}%;background:${FORMA_COLOR[k]}"></div></div></div>`;
}).join("");
// vendas ao longo do tempo
let buckets = [];
if(fech.length){
const lo = Math.min(...fech.map(c=>c.fechamentoTs)), hi = Math.max(...fech.map(c=>c.fechamentoTs));
const span = (ui.period==="tudo") ? hi - lo : Math.min(b, Date.now()) - a;
if(span <= DAY*1.01){
const h0 = new Date(lo).getHours(), h1 = new Date(hi).getHours();
for(let h=h0; h<=h1; h++) buckets.push({l:String(h).padStart(2,"0")+"h", k:h, v:0});
fech.forEach(c => { const bk = buckets.find(x => x.k===new Date(c.fechamentoTs).getHours()); if(bk) bk.v += c.total; });
} else if(span <= 62*DAY){
const start = ui.period==="tudo" ? sod(lo) : a, end = ui.period==="tudo" ? sod(hi) : sod(Math.min(b-1, Date.now()));
for(let t=start; t<=end; t=sod(t+DAY*1.5)) buckets.push({l:new Date(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}), k:t, v:0});
fech.forEach(c => { const bk = buckets.find(x => x.k===sod(c.fechamentoTs)); if(bk) bk.v += c.total; });
} else {
const map = new Map();
fech.forEach(c => { const d=new Date(c.fechamentoTs); const k=d.getFullYear()*12+d.getMonth(); map.set(k,(map.get(k)||0)+c.total); });
const ks=[...map.keys()].sort((x,y)=>x-y);
for(let k=ks[0]; k<=ks[ks.length-1]; k++) buckets.push({l:new Date(Math.floor(k/12),k%12,1).toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}), k, v:map.get(k)||0});
}
}
const maxB = Math.max(1, ...buckets.map(x=>x.v));
const chart = buckets.length ? `<div class="vchart">${buckets.map(x => `<div class="vcol"><div class="vb" style="height:${Math.max(1,x.v/maxB*100)}%" data-tip="${brl(x.v)}"></div><span class="vl">${x.l}</span></div>`).join("")}</div>` : `<div class="empty">Sem vendas neste período.</div>`;
// mais vendidos
const tops = new Map();
fech.forEach(c => (c.itens||[]).forEach(i => { const t = tops.get(i.nome)||{q:0,v:0}; t.q+=i.qtd; t.v+=i.qtd*i.preco; tops.set(i.nome,t); }));
const topList = [...tops.entries()].sort((x,y)=>y[1].q-x[1].q).slice(0,8);
const rank = topList.length ? `<div class="rank">${topList.map(([n,t],i)=>`<div class="rank-row"><span class="r">${i+1}</span><span>${esc(n)}</span><span class="q">${t.q}×</span><span class="val">${brl(t.v)}</span></div>`).join("")}</div>` : `<div class="empty">Nada vendido neste período.</div>`;
const hist = fin.length ? `<div class="table-wrap"><table><thead><tr><th>Comanda</th><th>Abertura</th><th>Fechamento</th><th>Tempo</th><th>Pagamento</th><th style="text-align:right">Total</th></tr></thead><tbody>
${fin.map(c => `<tr class="clickable" data-act="hist" data-v="${c.id}"><td><b>${esc(c.nome)}</b></td><td class="n">${fmtDate(c.aberturaTs)} ${fmtTime(c.aberturaTs)}</td><td class="n">${fmtDate(c.fechamentoTs)} ${fmtTime(c.fechamentoTs)}</td><td class="n">${dur(c.fechamentoTs-c.aberturaTs)}</td>
<td>${c.status==="cancelada" ? '<span class="pill cancelada">Cancelada</span>' : (c.pagamentos||[]).map(p=>`<span class="pill ${p.forma}">${FORMAS[p.forma]}${p.forma==="cartao"?" "+(p.tipo==="credito"?"crédito":"débito"):""}</span>`).join(" ")}</td>
<td class="n" style="text-align:right">${c.status==="cancelada" ? '<span class="muted">—</span>' : brl(c.total)}</td></tr>`).join("")}
</tbody></table></div>` : `<div class="empty">Nenhuma comanda fechada neste período.</div>`;
const despHtml = `<form id="f-desp" class="desp-form" autocomplete="off">
<label class="field f-desc"><span>Descrição</span><input type="text" id="d-desc" name="desc" placeholder="Ex.: carvão, gelo, carne" required></label>
<label class="field"><span>Valor (R$)</span><input type="text" id="d-val" name="valor" inputmode="decimal" placeholder="0,00" required></label>
<label class="field"><span>Data</span><input type="date" id="d-data" name="data" value="${toDateInput(Date.now())}" required></label>
<button class="btn btn-dark" type="submit" ${S.readOnly?"disabled":""}>Lançar saída</button>
</form>
${(()=>{ const mov = [...movCompras.map(m=>({...m,tipo:"compra"})), ...desp.map(d=>({ts:d.ts, desc:d.descricao, valor:d.valor, id:d.id, tipo:"outra"}))].sort((x,y)=>y.ts-x.ts);
return mov.length ? `<div class="table-wrap"><table><tbody>${mov.map(m=>`<tr ${m.tipo==="compra"?`class="clickable" data-act="buy-hist" data-v="${m.cid}"`:""}><td class="n">${fmtDate(m.ts)}</td><td style="white-space:normal">${esc(m.desc)}${m.tipo==="compra"?'<span class="tag">Compra</span>':""}</td><td class="n" style="text-align:right;color:var(--bad)">− ${brl(m.valor)}</td><td style="width:1%">${m.tipo==="outra"?`<button class="btn btn-ghost" style="padding:4px 8px" data-act="desp-del" data-v="${m.id}" aria-label="Apagar saída">Apagar</button>`:""}</td></tr>`).join("")}
<tr><td></td><td style="font-weight:600">Total de saídas</td><td class="n" style="text-align:right;font-weight:600;color:var(--bad)">− ${brl(saidas)}</td><td></td></tr></tbody></table></div>` : `<p class="muted" style="margin:0;font-size:14px">Nenhuma saída neste período.</p>`; })()}`;
const P = [["hoje","Hoje"],["ontem","Ontem"],["7d","7 dias"],["mes","Este mês"],["mespass","Mês passado"],["tudo","Tudo"]];
return `<div class="panel-head"><h2>Financeiro · ${label}</h2>
<div class="periods">${P.map(([k,l])=>`<button class="chip" data-act="period" data-v="${k}" aria-pressed="${ui.period===k}">${l}</button>`).join("")}</div></div>
<div class="kpis">
<div class="kpi hero"><div class="label">Faturamento</div><div class="v">${brl(fat)}</div>${taxaCartao?`<div style="font-size:12.5px;opacity:.85">líquido ${brl(liquido)}</div>`:""}</div>
<div class="kpi"><div class="label">Taxas do cartão</div><div class="v">${brl(taxaCartao)}</div><div class="muted" style="font-size:12.5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">débito ${pct(taxas().debito)} · crédito ${pct(taxas().credito)}<button class="btn btn-ghost" style="padding:1px 8px;font-size:12.5px" data-act="taxas">Alterar</button></div></div>
<div class="kpi"><div class="label">Saídas</div><div class="v">${brl(saidas)}</div><div class="muted" style="font-size:12.5px">compras ${brl(saidasCompras)} · outras ${brl(saidasOutras)}</div></div>
<div class="kpi"><div class="label">Saldo</div><div class="v" style="color:${liquido-saidas<0?"var(--bad)":"var(--ok)"}">${brl(liquido-saidas)}</div><div class="muted" style="font-size:12.5px">líquido − saídas</div></div>
<div class="kpi"><div class="label">Comandas fechadas</div><div class="v">${fech.length}</div></div>
<div class="kpi"><div class="label">Ticket médio</div><div class="v">${brl(ticket)}</div></div>
<div class="kpi"><div class="label">Em aberto agora</div><div class="v">${brl(emAberto)}</div><div class="muted" style="font-size:12.5px">${abertasNow.length} ${abertasNow.length===1?"comanda":"comandas"}</div></div>
<div class="kpi"><div class="label">Contas a pagar</div><div class="v" style="color:${pend.some(p=>diasPara(p.vencimentoTs)<0)?"var(--bad)":"var(--ink)"}">${brl(aPagar)}</div><div class="muted" style="font-size:12.5px">${pend.length} ${pend.length===1?"parcela em aberto":"parcelas em aberto"}</div></div>
</div>
<div class="fin-grid">
<div class="card"><h3>Por forma de pagamento</h3><div class="bars">${bars}</div>${descontos?`<p class="muted" style="font-size:13px;margin:12px 0 0">Descontos concedidos: ${brl(descontos)}</p>`:""}</div>
<div class="card"><h3>Vendas no período</h3>${chart}</div>
<div class="card"><h3>Mais vendidos</h3>${rank}</div>
<div class="card"><h3>Saídas</h3><p class="muted" style="margin:-6px 0 10px;font-size:13px">Compras pagas entram aqui sozinhas. Use o campo abaixo para gastos sem compra registrada, como gás ou aluguel.</p>${despHtml}</div>
<div class="card wide"><h3>Parcelas a pagar</h3>${pend.length ? `<div class="table-wrap"><table><thead><tr><th>Vencimento</th><th>Fornecedor</th><th>Parcela</th><th>Situação</th><th style="text-align:right">Valor</th><th></th></tr></thead><tbody>${pend.map(p=>{const d=dueInfo(p);return `<tr><td class="n">${fmtDate(p.vencimentoTs)}</td><td>${esc(p.fornecedor||"Sem fornecedor")}</td><td class="n">${p.n}/${p.total}</td><td><span class="due ${d[0]}">${d[1]}</span></td><td class="n" style="text-align:right">${brl(p.valor)}</td><td style="width:1%"><button class="btn" style="padding:4px 10px" data-act="parc-pay" data-v="${p.cid}:${p.idx}">Pagar</button></td></tr>`;}).join("")}</tbody></table></div>` : `<p class="muted" style="margin:0;font-size:14px">Nenhuma parcela em aberto.</p>`}</div>
<div class="card wide"><h3>Comandas encerradas</h3>${hist}</div>
</div>`;
}
