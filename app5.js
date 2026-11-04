function payNumbers(){
const c = S.data.comandas.get(ui.sel); const p = ui.pay;
const sub = subtotal(c);
let desc = parseMoney(p.desconto); if(!isFinite(desc) || desc<0) desc = 0; desc = Math.min(desc, sub);
const total = round2(sub - desc);
const rec = parseMoney(p.recebido);
return {sub, desc, total, rec};
}
function updatePayCalc(){
const box = $("#c-calc"); if(!box) return;
const {sub, desc, total, rec} = payNumbers();
let extra = "", ok = true;
if(ui.pay.forma === "dinheiro" && isFinite(rec)){
if(rec < total){ extra = `<div class="change bad">Faltam ${brl(total-rec)}</div>`; ok = false; }
else extra = `<div class="change ok">Troco: ${brl(rec-total)}</div>`;
}
box.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px">
${desc?`<div class="sumline"><span>Subtotal</span><span>${brl(sub)}</span></div><div class="sumline"><span>Desconto</span><span>− ${brl(desc)}</span></div>`:""}
<div class="sumline tot"><span>Total a pagar</span><span>${brl(total)}</span></div>${extra}
${ui.pay.forma === "cartao" ? (() => { const tp = taxas()[ui.pay.tipo==="credito"?"credito":"debito"], tx = round2(total*tp/100);
return `<div class="sumline muted"><span>Taxa da maquininha (${pct(tp)}) <button type="button" class="btn btn-ghost" style="padding:0 6px;font-size:12px" data-act="taxas">alterar</button></span><span>− ${brl(tx)}</span></div><div class="sumline"><span>Você recebe</span><span>${brl(total-tx)}</span></div>`; })() : ""}</div>`;
const b = $("#c-ok"); if(b) b.disabled = !ok;
}
/* ---------- eventos ---------- */
document.addEventListener("click", e => {
const t = e.target.closest("[data-act]"); if(!t) return;
const a = t.dataset.act, v = t.dataset.v;
if(a === "overlay"){ if(e.target === t) closeModal(); return; }
switch(a){
case "tab": ui.tab = v; try{ localStorage.setItem(LS_KEY+"-tab", v); }catch(err){} render(); window.scrollTo(0,0); break;
case "sel": ui.sel = v; render(); if(innerWidth<=820) window.scrollTo(0,0); break;
case "back": ui.sel = null; render(); break;
case "open-new": if(guard()) openModal({type:"open"}); break;
case "edit-cmd": if(guard()) openModal({type:"edit-cmd"}); break;
case "add": addItem(ui.sel, v); break;
case "inc": changeQty(ui.sel, v, 1); break;
case "dec": changeQty(ui.sel, v, -1); break;
case "cat": ui.cat = v; render(); break;
case "close-cmd": if(guard()){ ui.pay = {forma:"pix", tipo:"debito", desconto:"", recebido:""}; openModal({type:"close"}); } break;
case "pay-forma": ui.pay.forma = v; renderModal(); break;
case "pay-tipo": ui.pay.tipo = v; renderModal(); break;
case "cancel-cmd": if(guard()) openModal({type:"cancel"}); break;
case "confirm-cancel": {
const c = S.data.comandas.get(ui.sel);
if(c){ devolverEstoque(c); c.status = "cancelada"; c.fechamentoTs = Date.now(); c.total = 0; persist("comandas", ui.sel); toast("Comanda “"+c.nome+"” cancelada."); }
ui.sel = null; closeModal(); render(); break; }
case "modal-close": closeModal(); break;
case "prod-new": if(guard()) openModal({type:"prod"}); break;
case "prod-edit": if(guard()) openModal({type:"prod", id:v}); break;
case "prod-del": openModal({type:"prod-del", id:v}); break;
case "confirm-prod-del": { const p = S.data.produtos.get(v); del("produtos", v); closeModal(); toast((p?p.nome:"Produto")+" excluído."); render(); break; }
case "stk": { if(!guard()) break; const p = S.data.produtos.get(v); if(!p) break; p.estoque = Math.max(0, p.estoque + Number(t.dataset.d)); persist("produtos", v); render(); break; }
case "stk-set": if(guard()) openModal({type:"stk-set", id:v}); break;
case "pfilter": ui.prodFilter = v; render(); break;
case "period": ui.period = v; render(); break;
case "hist": openModal({type:"hist", id:v}); break;
case "reopen": {
if(!guard()) break;
const c = S.data.comandas.get(v); if(!c) break;
c.status = "aberta"; delete c.fechamentoTs; delete c.pagamentos; delete c.total; delete c.desconto; delete c.recebido; delete c.troco;
persist("comandas", v); closeModal(); ui.tab = "comandas"; ui.sel = v; toast("Comanda “"+c.nome+"” reaberta."); render(); break; }
case "desp-del": if(guard()){ del("despesas", v); render(); } break;
case "mode": { const claro = document.documentElement.dataset.modo !== "claro"; if(claro) document.documentElement.dataset.modo = "claro"; else delete document.documentElement.dataset.modo; try{ localStorage.setItem("lf-modo", claro?"claro":"escuro"); }catch(err){} renderModeBtn(); break; }
case "buy-add": ui.compra.linhas.push({nome:"",qtd:"",custo:"",venda:""}); render(); { const el = $("#bl-nome-"+(ui.compra.linhas.length-1)); if(el) el.focus(); } break;
case "buy-rm": if(ui.compra.linhas.length > 1){ ui.compra.linhas.splice(Number(v),1); render(); } break;
case "buy-pag": ui.compra.pagamento = v; ui.compra.manual = false; render(); break;
case "buy-forma": ui.compra.forma = v; render(); break;
case "buy-clear": ui.compra = novaCompra(); render(); break;
case "taxas": if(guard()) openModal({type:"taxas", back: ui.modal}); break;
case "taxas-back": if(ui.modal && ui.modal.back){ ui.modal = ui.modal.back; renderModal(); } else closeModal(); break;
case "buy-view": ui.buyView = v; render(); break;
case "forn-new": if(guard()) openModal({type:"forn", back: ui.buyView}); break;
case "forn-new-from": if(guard()) openModal({type:"forn", nome: ui.compra ? ui.compra.fornecedor.trim() : "", fromBuy:true}); break;
case "forn-edit": if(guard()) openModal({type:"forn", id:v}); break;
case "forn-del": openModal({type:"forn-del", id:v}); break;
case "confirm-forn-del": { const f = S.data.fornecedores.get(v); del("fornecedores", v); closeModal(); toast((f?f.nome:"Fornecedor")+" excluído."); render(); break; }
case "forn-buy": { const f = S.data.fornecedores.get(v); if(!ui.compra) ui.compra = novaCompra(); if(f) ui.compra.fornecedor = f.nome; ui.buyView = "compras"; render(); window.scrollTo(0,0); break; }
case "buy-hist": openModal({type:"buy-hist", id:v}); break;
case "parc-pay": case "parc-unpay": {
if(!guard()) break;
const [cid, idx] = v.split(":"); const c = S.data.compras.get(cid); if(!c) break;
const ps = ensureParcelas(c); const p = ps[Number(idx)]; if(!p) break;
if(a === "parc-pay"){ p.pago = true; p.pagoTs = Date.now(); toast("Parcela "+p.n+"/"+ps.length+" de "+brl(p.valor)+" paga."); }
else { p.pago = false; delete p.pagoTs; toast("Pagamento da parcela "+p.n+" desfeito."); }
c.pago = ps.every(x => x.pago);
persist("compras", cid);
if(ui.modal && ui.modal.type === "buy-hist") renderModal();
render(); break; }
case "buy-del": openModal({type:"buy-del", id:v}); break;
case "confirm-buy-del": {
if(!guard()) break;
const c = S.data.compras.get(v);
if(c){ c.itens.forEach(i => { const p = S.data.produtos.get(i.pid); if(p && p.estoque !== null && p.estoque !== undefined){ p.estoque = Math.max(0, p.estoque - i.qtd); persist("produtos", i.pid); } }); del("compras", v); toast("Compra excluída e estoque ajustado."); }
closeModal(); render(); break; }
case "logout": sb.auth.signOut(); break;
case "store-name": if(guard()) openModal({type:"store"}); break;
}
});
document.addEventListener("input", e => {
const id = e.target.id;
if(id === "pickQ"){ ui.q = e.target.value; render(); }
else if(id === "listQ"){ ui.listQ = e.target.value; render(); }
else if(id === "prodQ"){ ui.prodQ = e.target.value; render(); }
else if(id === "c-desc"){ ui.pay.desconto = e.target.value; updatePayCalc(); }
else if(id === "c-rec"){ ui.pay.recebido = e.target.value; updatePayCalc(); }
else if(id === "b-forn"){ ui.compra.fornecedor = e.target.value; updateFornNote(); }
else if(id === "fornQ"){ ui.fornQ = e.target.value; render(); }
else if(id === "b-data"){ ui.compra.data = e.target.value; }
else if(id === "b-venc" || id === "b-nparc"){ ui.compra[id==="b-venc"?"venc":"nparc"] = e.target.value; ui.compra.manual = false; updateBuyCalc(); }
else if(id.startsWith("pc-")){
const m = id.match(/^pc-(val|venc)-(\d+)$/); if(!m || !ui.compra.parcelas) return;
const p = ui.compra.parcelas[Number(m[2])]; if(!p) return;
ui.compra.manual = true;
if(m[1] === "val") p.valor = parseMoney(e.target.value); else p.vencimentoTs = new Date(e.target.value+"T12:00").getTime();
updateBuyCalc();
}
else if(id.startsWith("bl-")){
const m = id.match(/^bl-(nome|qtd|custo|venda)-(\d+)$/); if(!m) return;
const l = ui.compra.linhas[Number(m[2])]; if(!l) return;
l[m[1]] = e.target.value; updateBuyCalc();
}
});
document.addEventListener("change", e => {
if(e.target.id === "b-int"){ ui.compra.intervalo = e.target.value; ui.compra.manual = false; updateBuyCalc(); return; }
if(e.target.id === "alert-dias"){ if(!guard()) return; put("config", "alertas", {dias:Number(e.target.value)}); render(); return; }
if(e.target.id === "p-ctl"){ const w = $("#p-est-wrap"); w.hidden = !e.target.checked; if(e.target.checked) $("#p-est").focus(); }
});
document.addEventListener("keydown", e => {
if(e.key === "Escape" && ui.modal) closeModal();
if(e.key === "Enter" && e.target.id === "pickQ"){ const f = document.querySelector(".pgrid .ptile:not([disabled])"); if(f){ e.preventDefault(); addItem(ui.sel, f.dataset.v); } }
});
document.addEventListener("submit", e => {
e.preventDefault();
const f = e.target, fd = new FormData(f);
if(f.id === "f-login") return;
if(!guard()) return;
if(f.id === "f-open"){
const nome = String(fd.get("nome")).trim(), obs = String(fd.get("obs")||"").trim();
const ts = new Date(String(fd.get("ts"))).getTime();
if(!nome || !isFinite(ts)) return;
if(ui.modal.type === "edit-cmd"){ const c = S.data.comandas.get(ui.sel); if(c){ c.nome = nome; c.obs = obs; c.aberturaTs = ts; persist("comandas", ui.sel); } }
else abrirComanda(nome, obs, ts);
closeModal(); render();
}
else if(f.id === "f-close"){
const c = S.data.comandas.get(ui.sel); if(!c) return;
const {sub, desc, total, rec} = payNumbers(); const p = ui.pay;
const pag = {forma:p.forma, valor:total};
if(p.forma==="cartao"){ pag.tipo = p.tipo; pag.taxaPct = taxas()[p.tipo==="credito"?"credito":"debito"]; pag.taxa = round2(total*pag.taxaPct/100); }
Object.assign(c, {status:"fechada", fechamentoTs:Date.now(), subtotal:sub, desconto:desc, total, pagamentos:[pag]});
if(p.forma==="dinheiro" && isFinite(rec)){ c.recebido = rec; c.troco = round2(rec-total); }
persist("comandas", ui.sel);
const extra = (p.forma==="dinheiro" && isFinite(rec) && rec>total) ? " Troco: "+brl(rec-total)+"." : "";
toast("“"+c.nome+"” fechada: "+brl(total)+" no "+FORMAS[p.forma]+"."+extra);
ui.sel = null; closeModal(); render();
}
else if(f.id === "f-prod"){
const nome = String(fd.get("nome")).trim(), categoria = String(fd.get("cat")||"").trim() || "Outros";
const preco = parseMoney(fd.get("preco"));
if(!nome){ return; }
if(!fd.get("venda") && !isFinite(preco)){ /* insumo sem preço de venda */ }
else if(!isFinite(preco) || preco < 0){ toast("Informe um preço válido, por exemplo 12,50."); $("#p-preco").focus(); return; }
const ctl = !!fd.get("ctl"); let estoque = null;
const precoOk = isFinite(preco) ? preco : 0;
if(ctl){ estoque = parseInt(fd.get("est"),10); if(!isFinite(estoque) || estoque < 0) estoque = 0; }
const id = ui.modal.id || ("p-"+uid());
const prev = S.data.produtos.get(id) || {criadoTs:Date.now()};
put("produtos", id, {...prev, nome, categoria, preco:precoOk, estoque, venda: !!fd.get("venda")});
toast(ui.modal.id ? nome+" atualizado." : nome+" cadastrado.");
closeModal(); render();
}
else if(f.id === "f-stk"){
const n = parseInt(fd.get("add"),10); const p = S.data.produtos.get(ui.modal.id);
if(p && n > 0){ p.estoque = (p.estoque||0) + n; persist("produtos", ui.modal.id); toast("+"+n+" un em "+p.nome+". Agora: "+p.estoque+" un."); }
closeModal(); render();
}
else if(f.id === "f-desp"){
const descricao = String(fd.get("desc")).trim(), valor = parseMoney(fd.get("valor"));
const d = String(fd.get("data")); const ts = new Date(d+"T12:00").getTime();
if(!descricao){ return; }
if(!isFinite(valor) || valor <= 0){ toast("Informe o valor da saída, por exemplo 45,00."); return; }
put("despesas", uid(), {descricao, valor, ts});
toast("Saída lançada: "+brl(valor)); render();
}
else if(f.id === "f-buy"){ finalizarCompra(); }
else if(f.id === "f-taxas"){
const d = parseMoney(fd.get("debito")), c = parseMoney(fd.get("credito"));
if(!isFinite(d) || !isFinite(c) || d < 0 || c < 0 || d > 30 || c > 30){ toast("Informe as taxas em porcentagem, por exemplo 0,57."); return; }
put("config", "taxas", {debito:d, credito:c});
toast("Taxas salvas: débito "+pct(d)+", crédito "+pct(c)+".");
if(ui.modal && ui.modal.back){ ui.modal = ui.modal.back; renderModal(); } else closeModal();
render();
}
else if(f.id === "f-forn"){
const nome = String(fd.get("nome")).trim(); if(!nome) return;
const m = ui.modal, dup = findForn(nome);
if(dup && dup.id !== m.id){ toast("Já existe um fornecedor chamado "+dup.nome+"."); return; }
const id = m.id || ("f-"+uid());
const prev = S.data.fornecedores.get(id) || {criadoTs:Date.now()};
const oldNome = prev.nome;
const get = k => String(fd.get(k)||"").trim();
put("fornecedores", id, {...prev, nome, telefone:get("telefone"), contato:get("contato"), doc:get("doc"), pix:get("pix"), obs:get("obs")});
if(oldNome && oldNome !== nome){ for(const [cid,c] of S.data.compras){ if(c.fornecedorId === id){ c.fornecedor = nome; persist("compras", cid); } } }
if(m.fromBuy && ui.compra) ui.compra.fornecedor = nome;
toast(m.id ? nome+" atualizado." : nome+" cadastrado.");
closeModal(); render();
}
else if(f.id === "f-store"){
const nome = String(fd.get("nome")).trim(); if(!nome) return;
put("config", "loja", {nome}); closeModal(); render();
}
});
