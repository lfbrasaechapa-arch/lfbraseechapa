function changeQty(cid, pid, delta){
if(!guard()) return;
const c = S.data.comandas.get(cid); if(!c || c.status!=="aberta") return;
const it = c.itens.find(i => i.pid === pid); if(!it) return;
const p = S.data.produtos.get(pid);
if(delta > 0){ if(p) return addItem(cid, pid); it.qtd++; }
else {
const n = delta === "all" ? it.qtd : 1;
it.qtd -= n; if(it.qtd <= 0) c.itens = c.itens.filter(i => i !== it);
if(p && p.estoque !== null && p.estoque !== undefined){ p.estoque += n; persist("produtos", pid); }
}
persist("comandas", cid); render();
}
function devolverEstoque(c){
(c.itens||[]).forEach(i => { const p = S.data.produtos.get(i.pid); if(p && p.estoque !== null && p.estoque !== undefined){ p.estoque += i.qtd; persist("produtos", i.pid); } });
}
/* ---------- render ---------- */
let rq = 0;
function scheduleRender(){ if(rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }
function render(){
const ae = document.activeElement, fid = ae && ae.id && ae.closest("#app") ? ae.id : null;
const selS = fid && "selectionStart" in ae ? ae.selectionStart : null;
$("#storeName").textContent = storeName();
renderTabs();
const app = $("#app");
let banner = "";
if(S.mode === "local") banner = '<div class="banner">Modo local: os dados ficam salvos só neste navegador.</div>';
else if(S.slow) banner = '<div class="banner">Os dados ainda não carregaram por completo. O que aparece pode estar desatualizado.</div>';
if(S.mode !== "loading"){
const ab = parcelasAbertas(), venc = ab.filter(p => diasPara(p.vencimentoTs) < 0), prox = ab.filter(p => { const d = diasPara(p.vencimentoTs); return d >= 0 && d <= alertaDias(); });
if(venc.length || prox.length){
const parts = [];
if(venc.length) parts.push(`<b>${venc.length}</b> ${venc.length===1?"parcela vencida":"parcelas vencidas"} (${brl(venc.reduce((s,p)=>s+p.valor,0))})`);
if(prox.length) parts.push(`<b>${prox.length}</b> ${prox.length===1?"parcela vence":"parcelas vencem"} ${alertaDias()===0?"hoje":"nos próximos "+alertaDias()+" dias"} (${brl(prox.reduce((s,p)=>s+p.valor,0))})`);
const prim = (venc[0]||prox[0]);
banner += `<div class="alert ${venc.length?"bad":""}" role="status"><span class="grow">Contas a pagar: ${parts.join(" e ")}. Próxima: ${esc(prim.fornecedor||"compra sem fornecedor")}, parcela ${prim.n}/${prim.total}, ${brl(prim.valor)} em ${fmtDate(prim.vencimentoTs)}.</span>${ui.tab!=="compras"?'<button class="btn" data-act="tab" data-v="compras">Ver parcelas</button>':""}</div>`;
}
}
if(S.readOnly) banner += '<div class="banner">Você tem acesso só de leitura. Peça acesso de edição para lançar comandas.</div>';
if(S.mode === "loading" || (S.mode==="db" && S.seen.size < COLS.length && !S.slow)){
app.innerHTML = banner + '<div class="empty" style="margin-top:20px">Carregando comandas e produtos…</div>';
} else {
app.innerHTML = banner + (ui.tab==="comandas" ? viewComandas() : ui.tab==="produtos" ? viewProdutos() : ui.tab==="compras" ? viewCompras() : viewFinanceiro());
}
if(ui.tab === "compras") updateBuyCalc();
if(fid){ const el = document.getElementById(fid); if(el){ el.focus(); try{ if(selS!==null) el.setSelectionRange(selS, selS); }catch(e){} } }
}
function renderTabs(){
const n = abertas().length;
const low = produtos().filter(p => stockClass(p.estoque)).length;
const venc = parcelasAbertas().filter(p => diasPara(p.vencimentoTs) <= alertaDias()).length;
const tabs = [["comandas","Comandas",n],["produtos","Produtos",low],["compras","Compras",venc],["financeiro","Financeiro",0]];
$("#tabs").innerHTML = tabs.map(([k,l,c]) => `<button role="tab" aria-selected="${ui.tab===k}" data-act="tab" data-v="${k}">${l}${c?`<span class="count" title="${k==="produtos"?"com estoque baixo":k==="compras"?"parcelas vencidas ou perto de vencer":"abertas"}">${c}</span>`:""}</button>`).join("");
}
/* ----- aba comandas ----- */
function viewComandas(){
let list = abertas();
if(ui.sel && !S.data.comandas.get(ui.sel)) ui.sel = null;
const sel = ui.sel ? {id:ui.sel, ...S.data.comandas.get(ui.sel)} : null;
const q = ui.listQ.trim().toLowerCase();
const shown = q ? list.filter(c => c.nome.toLowerCase().includes(q)) : list;
const now = Date.now();
const slips = shown.length ? shown.map(c => `
<button class="slip" data-act="sel" data-v="${c.id}" aria-current="${ui.sel===c.id}">
<span class="s-name">${esc(c.nome)}</span><span class="s-total">${brl(totalAberta(c))}</span>
<span class="s-meta">${fmtDate(c.aberturaTs)} · ${fmtTime(c.aberturaTs)} · <span class="age" data-since="${c.aberturaTs}">${dur(now-c.aberturaTs)}</span> · ${qtdItens(c)} ${qtdItens(c)===1?"item":"itens"}</span>
</button>`).join("") : `<div class="empty">${list.length ? "Nenhuma comanda com esse nome." : "Nenhuma comanda aberta.<br>Toque em <b>Abrir comanda</b> para começar."}</div>`;
const listHtml = `<section class="cmd-list">
<div class="panel-head"><h2>Abertas <span class="muted num" style="font-size:16px">${list.length}</span></h2>
<button class="btn btn-primary" data-act="open-new">+ Abrir comanda</button></div>
${list.length > 4 ? `<input type="search" id="listQ" placeholder="Buscar comanda" value="${esc(ui.listQ)}">` : ""}
<div class="slips">${slips}</div></section>`;
if(!sel){
return `<div class="cmd-layout">${listHtml}
<section class="cmd-ticket"><div class="empty" style="padding:48px 22px">Selecione uma comanda na lista ou abra uma nova.</div></section>
<section class="cmd-picker"></section></div>`;
}
const items = sel.itens.length ? `<div class="items">${sel.itens.map(i => `
<div class="item">
<div class="qty"><button class="icon-btn" data-act="dec" data-v="${esc(i.pid)}" aria-label="Diminuir ${esc(i.nome)}">−</button><span class="q">${i.qtd}</span><button class="icon-btn" data-act="inc" data-v="${esc(i.pid)}" aria-label="Aumentar ${esc(i.nome)}">+</button></div>
<div><div class="i-name">${esc(i.nome)}</div><div class="i-unit">${brl(i.preco)} un.</div></div>
<div class="i-sub">${brl(i.preco*i.qtd)}</div>
</div>`).join("")}</div>` : `<div class="empty">Nenhum item ainda. Toque nos produtos para lançar.</div>`;
const ticket = `<section class="cmd-ticket"><div class="slip ticket">
<div class="t-head">
<button class="icon-btn back" data-act="back" aria-label="Voltar para a lista">←</button>
<div style="flex:1;min-width:0">
<div class="label">Comanda</div>
<h2>${esc(sel.nome)}</h2>
<div class="t-opened"><span>Aberta em <b>${fmtDate(sel.aberturaTs)}</b> às <b>${fmtTime(sel.aberturaTs)}</b></span><span>há <b data-since="${sel.aberturaTs}">${dur(now-sel.aberturaTs)}</b></span></div>
${sel.obs ? `<div class="t-obs">${esc(sel.obs)}</div>` : ""}
</div>
<button class="icon-btn" data-act="edit-cmd" aria-label="Editar comanda" title="Editar nome, observação e horário">✎</button>
</div>
<hr class="rule">${items}<hr class="rule">
${(() => { const pr = calcPromos(sel); if(!pr.length) return "";
return `<div class="promo-box">${pr.map(r => `<div class="promo-line"><span><span class="promo-tag">${esc(promoTexto(r))}</span> ${esc(r.nome)}${r.combos?` · ${r.combos}×`:""}</span><span class="num">${r.desconto?"− "+brl(r.desconto):""}</span></div>${r.faltam?`<div class="promo-hint">Mais ${r.faltam} ${r.faltam===1?"unidade":"unidades"} para fechar ${r.combos?"outra":"a"} promoção</div>`:""}`).join("")}
${descPromo(sel)?`<div class="promo-line muted"><span>Subtotal sem promoção</span><span class="num">${brl(subtotal(sel))}</span></div>`:""}</div>`; })()}
<div class="t-total"><span class="label">Total</span><span class="big">${brl(totalAberta(sel))}</span></div>
<div class="t-actions">
<button class="btn btn-primary btn-lg" data-act="close-cmd" ${sel.itens.length?"":"disabled"}>Fechar comanda</button>
<button class="btn btn-ghost btn-danger" data-act="cancel-cmd">Cancelar</button>
</div>
</div></section>`;
return `<div class="cmd-layout has-sel">${listHtml}${ticket}<section class="cmd-picker">${viewPicker()}</section></div>`;
}
function viewPicker(){
const cats = ["Todas", ...[...new Set(produtos().filter(p=>p.venda!==false).map(p=>p.categoria||"Outros"))].sort((a,b)=>a.localeCompare(b,"pt-BR"))];
const q = ui.q.trim().toLowerCase();
const ps = produtos().filter(p => p.venda !== false && (ui.cat==="Todas" || (p.categoria||"Outros")===ui.cat) && (!q || p.nome.toLowerCase().includes(q)))
.sort((a,b) => (a.categoria||"").localeCompare(b.categoria||"","pt-BR") || a.nome.localeCompare(b.nome,"pt-BR"));
const tiles = ps.length ? ps.map(p => {
const ctl = p.estoque !== null && p.estoque !== undefined;
const out = ctl && p.estoque <= 0;
return `<button class="ptile" data-act="add" data-v="${p.id}" ${out?"disabled":""}>
<span class="p-n">${esc(p.nome)}</span>
${(() => { const pr = promoDoProduto(p.id); return pr ? `<span class="promo-tag">${esc(promoTexto(pr))}</span>` : ""; })()}
<span class="p-row"><span class="p-price">${brl(p.preco)}</span>${ctl?`<span class="stock ${stockClass(p.estoque)}">${out?"esgotado":p.estoque+" un"}</span>`:""}</span>
</button>`;}).join("") : `<div class="empty" style="grid-column:1/-1">Nenhum produto encontrado. Cadastre na aba Produtos.</div>`;
return `<div class="picker">
<div class="panel-head" style="margin-bottom:8px"><h2 style="font-size:20px">Lançar itens</h2></div>
<input type="search" id="pickQ" placeholder="Buscar produto" value="${esc(ui.q)}" autocomplete="off">
<div class="chips">${cats.map(c => `<button class="chip" data-act="cat" data-v="${esc(c)}" aria-pressed="${ui.cat===c}">${esc(c)}</button>`).join("")}</div>
<div class="pgrid">${tiles}</div></div>`;
}
/* ----- aba produtos ----- */
function viewPromocoes(){
const ps = promocoes().sort((a,b) => (promoAtiva(b)-promoAtiva(a)) || (b.criadoTs||0)-(a.criadoTs||0));
const nomeProd = id => { const p = S.data.produtos.get(id); return p ? p.nome : "produto excluído"; };
const status = pr => { if(promoAtiva(pr)) return ['ativa', pr.ate ? "Ativa até "+fmtDate(new Date(pr.ate+"T12:00").getTime()) : "Ativa"]; if(pr.ativa && pr.ate) return ['encerrada',"Encerrada"]; return ['pausada',"Pausada"]; };
return `<section class="promo-sec"><div class="panel-head"><h2>Promoções</h2><button class="btn btn-primary" data-act="promo-new">+ Nova promoção</button></div>
${ps.length ? `<div class="promo-grid">${ps.map(pr => { const st = status(pr);
return `<div class="card promo-card ${st[0]}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div class="promo-big">${esc(promoTexto(pr))}</div><div style="font-weight:600">${esc(pr.nome)}</div></div><span class="pill ${st[0]==="ativa"?"paga":st[0]==="encerrada"?"cancelada":"pendente"}">${st[1]}</span></div>
<div class="muted" style="font-size:13px">${(pr.produtos||[]).map(id=>esc(nomeProd(id))).join(" · ")}</div>
<div class="acts" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" style="padding:5px 12px" data-act="promo-toggle" data-v="${pr.id}">${promoAtiva(pr)?"Pausar":"Ativar"}</button><button class="btn btn-ghost" style="padding:5px 12px" data-act="promo-edit" data-v="${pr.id}">Editar</button></div></div>`; }).join("")}</div>`
: `<div class="empty">Nenhuma promoção. Ex.: <b>3 por R$ 12,00</b> nos litrinhos — o desconto entra sozinho na comanda.</div>`}</section>`;
}
function viewProdutos(){
const q = ui.prodQ.trim().toLowerCase();
let ps = produtos().filter(p => !q || p.nome.toLowerCase().includes(q) || (p.categoria||"").toLowerCase().includes(q));
if(ui.prodFilter === "baixo") ps = ps.filter(p => stockClass(p.estoque));
const all = produtos();
const nLow = all.filter(p => stockClass(p.estoque)==="low").length, nOut = all.filter(p => stockClass(p.estoque)==="out").length;
const groups = {};
ps.forEach(p => (groups[p.categoria||"Outros"] ||= []).push(p));
const blocks = Object.keys(groups).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(cat => `
<div class="cat-block"><h3>${esc(cat)} <span class="num" style="font-size:13px">${groups[cat].length}</span></h3><div class="plist">
${groups[cat].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")).map(p => {
const ctl = p.estoque !== null && p.estoque !== undefined;
return `<div class="prow">
<div class="pn">${esc(p.nome)}${promoDoProduto(p.id)?`<span class="promo-tag" style="margin-left:6px">${esc(promoTexto(promoDoProduto(p.id)))}</span>`:""}${p.venda===false?'<span class="tag" title="Não aparece no cardápio das comandas">Insumo</span>':""}${p.custo?`<div class="muted num" style="font-size:12px;font-weight:400">custo ${brl(p.custo)}</div>`:""}</div>
<div class="pp">${p.venda===false?'<span class="muted">—</span>':brl(p.preco)}</div>
<div class="stock-ctl">${ctl ? `<button class="icon-btn" data-act="stk" data-v="${p.id}" data-d="-1" aria-label="Tirar 1 do estoque">−</button><span class="sv ${stockClass(p.estoque)}" title="Em estoque">${p.estoque}</span><button class="icon-btn" data-act="stk" data-v="${p.id}" data-d="1" aria-label="Somar 1 ao estoque">+</button><button class="btn btn-ghost" style="padding:5px 8px;font-size:13px" data-act="stk-set" data-v="${p.id}">Repor</button>` : `<span class="muted" style="font-size:13px">Sem controle de estoque</span>`}</div>
<div class="row-actions"><button class="btn btn-ghost" data-act="prod-edit" data-v="${p.id}">Editar</button></div>
</div>`;}).join("")}
</div></div>`).join("");
return `${viewPromocoes()}<div class="panel-head"><h2>Produtos e estoque</h2><button class="btn btn-primary" data-act="prod-new">+ Novo produto</button></div>
<div class="toolbar">
<input class="grow" type="search" id="prodQ" placeholder="Buscar por nome ou categoria" value="${esc(ui.prodQ)}" style="flex:1 1 220px;width:auto">
<div class="periods">
<button class="chip" data-act="pfilter" data-v="todos" aria-pressed="${ui.prodFilter==="todos"}">Todos (${all.length})</button>
<button class="chip" data-act="pfilter" data-v="baixo" aria-pressed="${ui.prodFilter==="baixo"}">Estoque baixo ou esgotado (${nLow+nOut})</button>
</div>
</div>
${blocks || `<div class="empty">${all.length ? "Nenhum produto neste filtro." : "Nenhum produto cadastrado. Toque em <b>Novo produto</b>."}</div>`}`;
}
/* ----- aba compras ----- */
function viewCompras(){
if(ui.buyView === "fornecedores") return viewFornecedores();
if(!ui.compra) ui.compra = novaCompra();
const k = ui.compra;
const names = produtos().map(p => `<option value="${esc(p.nome)}">`).join("");
const lines = k.linhas.map((l,i) => `
<div class="bl-line">
<div class="bl-row">
<input class="bl-name" type="text" id="bl-nome-${i}" list="buy-names" placeholder="Produto (ex.: Cerveja lata)" value="${esc(l.nome)}" autocomplete="off">
<input type="number" id="bl-qtd-${i}" min="0" step="1" placeholder="Qtd" value="${esc(l.qtd)}" aria-label="Quantidade">
<input type="text" id="bl-custo-${i}" inputmode="decimal" placeholder="Valor un." value="${esc(l.custo)}" aria-label="Valor unitário (R$)">
<span class="bl-tot" id="bl-tot-${i}"></span>
<button type="button" class="icon-btn bl-rm" data-act="buy-rm" data-v="${i}" aria-label="Remover linha" ${k.linhas.length===1?"disabled":""}>×</button>
</div>
<div class="bl-note" id="bl-note-${i}"></div>
</div>`).join("");
const formas = Object.keys(FORMAS).map(f => `<button type="button" class="chip" data-act="buy-forma" data-v="${f}" aria-pressed="${k.forma===f}">${FORMAS[f]}</button>`).join("");
const form = `<div class="card"><h3>Nova compra</h3>
<form id="f-buy" autocomplete="off" style="display:flex;flex-direction:column;gap:14px">
<div class="two">
<div class="field"><label for="b-forn" style="font-size:13px;font-weight:600">Fornecedor (opcional)</label><input type="text" id="b-forn" list="forn-names" value="${esc(k.fornecedor)}" placeholder="Escolha ou digite" autocomplete="off">
<datalist id="forn-names">${fornecedores().map(f=>`<option value="${esc(f.nome)}">`).join("")}</datalist>
<div class="forn-note" id="b-forn-note"></div></div>
<label class="field"><span>Data da compra</span><input type="date" id="b-data" value="${esc(k.data)}" required></label>
</div>
<div>
<div class="bl-head"><span>Produto</span><span>Qtd</span><span>Valor un.</span><span style="text-align:right">Total</span><span></span></div>
${lines}
<datalist id="buy-names">${names}</datalist>
<button type="button" class="btn btn-ghost" style="margin-top:8px" data-act="buy-add">+ Adicionar produto</button>
</div>
<div class="buy-total"><span class="label">Total da compra</span><span class="big" id="b-total"></span></div>
<div class="field"><span>Pagamento</span>
<div class="pay-opts two-opts">
<button type="button" class="pay-opt" style="--sel:var(--ok)" data-act="buy-pag" data-v="avista" aria-pressed="${k.pagamento==="avista"}">À vista</button>
<button type="button" class="pay-opt" style="--sel:var(--warn)" data-act="buy-pag" data-v="prazo" aria-pressed="${k.pagamento==="prazo"}">A prazo</button>
</div>
</div>
${k.pagamento==="avista" ? `<div class="field"><span>Pago com</span><div class="seg">${formas}</div></div>` :
`<div class="three">
<label class="field"><span>Nº de parcelas</span><input type="number" id="b-nparc" min="1" max="48" step="1" value="${esc(k.nparc)}"></label>
<label class="field"><span>1º vencimento</span><input type="date" id="b-venc" value="${esc(k.venc)}" required></label>
<label class="field full"><span>Intervalo</span><select id="b-int">
${[["0","Todo mês, mesmo dia"],["30","A cada 30 dias"],["28","A cada 28 dias"],["15","A cada 15 dias"],["7","Toda semana"]].map(([v,l])=>`<option value="${v}" ${k.intervalo===v?"selected":""}>${l}</option>`).join("")}
</select></label>
</div>
<div><div class="label" style="margin-bottom:4px">Parcelas <span style="text-transform:none;letter-spacing:0;font-weight:400">· dá para ajustar valor e data de cada uma</span></div><div class="parc-table" id="b-parc"></div><div id="b-parc-warn" class="due vencida" style="margin-top:6px"></div></div>`}
<div class="foot" style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
<button type="button" class="btn btn-ghost" data-act="buy-clear">Limpar</button>
<button type="submit" class="btn btn-primary btn-lg" ${S.readOnly?"disabled":""}>Finalizar compra</button>
</div>
</form></div>`;
const list = compras().sort((x,y)=>y.ts-x.ts).slice(0,60);
const hist = list.length ? `<div class="buy-list">${list.map(c => { const st = compraStatus(c); const n = c.itens.reduce((s,i)=>s+i.qtd,0);
return `<button class="buy-item" data-act="buy-hist" data-v="${c.id}"><span class="bi-t">${esc(c.fornecedor||"Compra sem fornecedor")}</span><span class="bi-v">${brl(c.total)}</span>
<span class="bi-m"><span class="num">${fmtDate(c.ts)}</span>· ${c.itens.length} ${c.itens.length===1?"produto":"produtos"} (${n} un) <span class="pill ${st[0]}">${st[1]}</span>${(()=>{ const nx = parcelasDe(c).find(p=>!p.pago); return nx ? `<span class="num">próx. ${fmtDate(nx.vencimentoTs)}</span>` : ""; })()}</span></button>`; }).join("")}</div>`
: `<div class="empty">Nenhuma compra registrada ainda.</div>`;
const subnav = `<div class="subnav"><button class="chip" data-act="buy-view" data-v="compras" aria-pressed="true">Compras</button><button class="chip" data-act="buy-view" data-v="fornecedores" aria-pressed="false">Fornecedores (${S.data.fornecedores.size})</button></div>`;
return `<div class="panel-head"><h2>Compras</h2>${subnav}</div>
<div class="buy-layout">${form}<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${viewParcelas()}<div class="card"><h3>Compras registradas</h3>${hist}</div></div></div>`;
}
