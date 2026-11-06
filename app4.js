/* ---------- modais ---------- */
function openModal(m){ ui.modal = m; renderModal(); }
function closeModal(){ ui.modal = null; ui.pay = null; $("#modal").innerHTML = ""; }
function renderModal(){
const m = ui.modal; if(!m){ $("#modal").innerHTML=""; return; }
let h = "";
if(m.type === "open" || m.type === "edit-cmd"){
const c = m.type==="edit-cmd" ? S.data.comandas.get(ui.sel) : null;
const ts = c ? c.aberturaTs : Date.now();
h = `<h2>${c?"Editar comanda":"Abrir comanda"}</h2>
<p class="muted" style="margin:0">${c?"Ajuste o nome, a observação ou o horário de abertura.":"A data e o horário de abertura são registrados agora. Ajuste se a comanda começou antes."}</p>
<form id="f-open" autocomplete="off">
<label class="field"><span>Nome da comanda</span><input type="text" id="o-nome" name="nome" required maxlength="40" placeholder="Ex.: Mesa 4, João, Balcão 2" value="${esc(c?c.nome:"")}"></label>
<label class="field"><span>Observação (opcional)</span><input type="text" id="o-obs" name="obs" maxlength="120" placeholder="Ex.: carne ao ponto, sem cebola" value="${esc(c?c.obs:"")}"></label>
<label class="field"><span>Data e horário de abertura</span><input type="datetime-local" id="o-ts" name="ts" required value="${toLocalInput(ts)}"></label>
<div class="foot"><button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary">${c?"Salvar":"Abrir comanda"}</button></div>
</form>`;
}
else if(m.type === "close"){
const c = S.data.comandas.get(ui.sel); if(!c){ closeModal(); return; }
const p = ui.pay;
h = `<h2>Fechar comanda</h2><p class="muted" style="margin:0">${esc(c.nome)} · aberta em ${fmtDT(c.aberturaTs)}</p>
<form id="f-close" autocomplete="off">
<div class="stamp" style="display:flex;flex-direction:column;gap:4px">
${c.itens.map(i=>`<div class="sumline"><span>${i.qtd}× ${esc(i.nome)}</span><span>${brl(i.qtd*i.preco)}</span></div>`).join("")}
</div>
${!p.split ? `<div class="field"><span>Forma de pagamento</span>
<div class="pay-opts">${Object.keys(FORMAS).map(k=>`<button type="button" class="pay-opt" style="--sel:${FORMA_COLOR[k]}" data-act="pay-forma" data-v="0:${k}" aria-pressed="${p.partes[0].forma===k}">${ICONS[k]}${FORMAS[k]}</button>`).join("")}</div>
</div>
${p.partes[0].forma==="cartao" ? tipoChips(0, p.partes[0]) : ""}
<button type="button" class="btn btn-ghost" style="align-self:flex-start" data-act="pay-split">Dividir pagamento (ex.: parte em dinheiro, parte no cartão)</button>` :
`<div class="field"><span>Pagamento dividido</span>
<div class="split-list">${p.partes.map((pt,i)=>`<div class="split-row">
<div class="split-top"><div class="seg split-formas">${Object.keys(FORMAS).map(k=>`<button type="button" class="chip" data-act="pay-forma" data-v="${i}:${k}" aria-pressed="${pt.forma===k}">${FORMAS[k]}</button>`).join("")}</div>
<input type="text" id="c-parte-${i}" class="split-val" inputmode="decimal" placeholder="0,00" value="${esc(pt.valor)}" aria-label="Valor pago em ${FORMAS[pt.forma]}">
${p.partes.length>2?`<button type="button" class="icon-btn" data-act="pay-rm" data-v="${i}" aria-label="Remover esta forma">×</button>`:""}</div>
${pt.forma==="cartao" ? tipoChips(i, pt) : ""}
</div>`).join("")}</div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-ghost" data-act="pay-add">+ Adicionar forma</button><button type="button" class="btn btn-ghost" data-act="pay-unsplit">Pagar com uma forma só</button></div>
</div>`}
<div class="two">
<label class="field"><span>Desconto (R$)</span><input type="text" id="c-desc" inputmode="decimal" placeholder="0,00" value="${esc(p.desconto)}"></label>
${p.partes.some(pt=>pt.forma==="dinheiro") ? `<label class="field"><span>Dinheiro recebido (R$)</span><input type="text" id="c-rec" inputmode="decimal" placeholder="para calcular o troco" value="${esc(p.recebido)}"></label>` : "<div></div>"}
</div>
<div id="c-calc"></div>
<div class="foot"><button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary btn-lg" id="c-ok">Confirmar pagamento</button></div>
</form>`;
}
else if(m.type === "cancel"){
const c = S.data.comandas.get(ui.sel);
h = `<h2>Cancelar comanda?</h2><p style="margin:8px 0 0">A comanda <b>${esc(c?c.nome:"")}</b> será encerrada sem pagamento e os itens voltam para o estoque. Ela continua no histórico como cancelada.</p>
<div class="foot" style="margin-top:18px"><button class="btn btn-ghost" data-act="modal-close">Voltar</button><button class="btn btn-dark" data-act="confirm-cancel">Cancelar comanda</button></div>`;
}
else if(m.type === "promo"){
const pr = m.id ? S.data.promocoes.get(m.id) : null;
const sel = new Set(pr ? pr.produtos||[] : []);
const vendaveis = produtos().filter(p => p.venda !== false).sort((a,b) => (a.categoria||"").localeCompare(b.categoria||"","pt-BR") || a.nome.localeCompare(b.nome,"pt-BR"));
const grupos = {}; vendaveis.forEach(p => (grupos[p.categoria||"Outros"] ||= []).push(p));
h = `<h2>${pr?"Editar promoção":"Nova promoção"}</h2><p class="muted" style="margin:0">Os produtos marcados podem ser misturados. Ex.: 1 Brahma + 2 Skol contam como 3.</p>
<form id="f-promo" autocomplete="off">
<label class="field"><span>Nome</span><input type="text" id="pr-nome" name="nome" required maxlength="40" value="${esc(pr?pr.nome:"")}" placeholder="Ex.: Litrinhos"></label>
<div class="three">
<label class="field"><span>Leve (unidades)</span><input type="number" id="pr-qtd" name="qtd" min="2" max="50" step="1" required value="${pr?pr.qtd:3}"></label>
<label class="field"><span>Por (R$)</span><input type="text" id="pr-preco" name="preco" inputmode="decimal" required value="${pr?moneyIn(pr.preco):""}" placeholder="12,00"></label>
<label class="field full"><span>Válida até (opcional)</span><input type="date" id="pr-ate" name="ate" value="${esc(pr&&pr.ate||"")}"></label>
</div>
<div class="field"><span>Produtos da promoção</span><input type="search" id="pr-busca" placeholder="Filtrar produtos" autocomplete="off">
<div class="promo-pick" id="pr-lista">${Object.keys(grupos).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(g => `<div class="label" style="margin-top:6px">${esc(g)}</div>${grupos[g].map(p => `<label class="check promo-opt" data-nome="${esc(p.nome.toLowerCase())}"><input type="checkbox" name="pp" value="${p.id}" ${sel.has(p.id)?"checked":""}> <span style="flex:1">${esc(p.nome)}</span><span class="num muted">${brl(p.preco)}</span></label>`).join("")}`).join("")}</div></div>
<label class="check"><input type="checkbox" id="pr-ativa" name="ativa" ${!pr || pr.ativa ? "checked" : ""}> Promoção ativa</label>
<div class="foot">${pr?`<button type="button" class="btn btn-ghost btn-danger" data-act="promo-del" data-v="${m.id}" style="margin-right:auto">Excluir</button>`:""}<button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary">${pr?"Salvar":"Criar promoção"}</button></div>
</form>`;
}
else if(m.type === "promo-del"){
const pr = S.data.promocoes.get(m.id);
h = `<h2>Excluir promoção?</h2><p style="margin:8px 0 0"><b>${esc(pr?pr.nome:"")}</b> deixa de valer nas comandas abertas. As comandas já fechadas continuam com o desconto que tiveram.</p>
<div class="foot" style="margin-top:18px"><button class="btn btn-ghost" data-act="modal-close">Voltar</button><button class="btn btn-dark" data-act="confirm-promo-del" data-v="${m.id}">Excluir promoção</button></div>`;
}
else if(m.type === "prod"){
const p = m.id ? S.data.produtos.get(m.id) : null;
const ctl = p ? (p.estoque !== null && p.estoque !== undefined) : true;
h = `<h2>${p?"Editar produto":"Novo produto"}</h2>
<form id="f-prod" autocomplete="off">
<label class="field"><span>Nome</span><input type="text" id="p-nome" name="nome" required maxlength="50" value="${esc(p?p.nome:"")}" placeholder="Ex.: Espeto de cupim"></label>
<div class="two">
<label class="field"><span>Categoria</span><input type="text" id="p-cat" name="cat" list="cat-list" value="${esc(p?p.categoria:"")}" placeholder="Ex.: Espetos"><datalist id="cat-list">${categorias().map(c=>`<option value="${esc(c)}">`).join("")}</datalist></label>
<label class="field"><span>Preço de venda (R$)</span><input type="text" id="p-preco" name="preco" inputmode="decimal" value="${p&&(p.venda!==false)?moneyIn(p.preco):""}" placeholder="0,00"></label>
</div>
<label class="check"><input type="checkbox" id="p-venda" name="venda" ${!p || p.venda!==false?"checked":""}> Aparece no cardápio das comandas</label>
<label class="check"><input type="checkbox" id="p-ctl" name="ctl" ${ctl?"checked":""}> Controlar estoque deste produto</label>
<label class="field" id="p-est-wrap" ${ctl?"":"hidden"}><span>Quantidade disponível em estoque</span><input type="number" id="p-est" name="est" min="0" step="1" value="${ctl&&p?p.estoque:""}" placeholder="0"></label>
<div class="foot">${p?`<button type="button" class="btn btn-ghost btn-danger" data-act="prod-del" data-v="${m.id}" style="margin-right:auto">Excluir</button>`:""}<button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary">${p?"Salvar":"Cadastrar"}</button></div>
</form>`;
}
else if(m.type === "prod-del"){
const p = S.data.produtos.get(m.id);
h = `<h2>Excluir produto?</h2><p style="margin:8px 0 0"><b>${esc(p?p.nome:"")}</b> sai do cardápio. Comandas antigas continuam mostrando o item normalmente.</p>
<div class="foot" style="margin-top:18px"><button class="btn btn-ghost" data-act="modal-close">Voltar</button><button class="btn btn-dark" data-act="confirm-prod-del" data-v="${m.id}">Excluir produto</button></div>`;
}
else if(m.type === "stk-set"){
const p = S.data.produtos.get(m.id);
h = `<h2>Repor estoque</h2><p class="muted" style="margin:0">${esc(p?p.nome:"")} · hoje: ${p?p.estoque:0} un</p>
<form id="f-stk" autocomplete="off">
<label class="field"><span>Quantidade que chegou</span><input type="number" id="s-add" name="add" min="1" step="1" required placeholder="Ex.: 24"></label>
<div class="foot"><button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary">Somar ao estoque</button></div>
</form>`;
}
else if(m.type === "hist"){
const c = S.data.comandas.get(m.id); if(!c){ closeModal(); return; }
h = `<h2>${esc(c.nome)}</h2><p class="muted" style="margin:0">${c.status==="cancelada"?"Cancelada":"Fechada"}</p>
<div class="stamp" style="margin-top:14px;display:flex;flex-direction:column;gap:4px">
<div class="sumline"><span>Abertura</span><span>${fmtDT(c.aberturaTs)}</span></div>
<div class="sumline"><span>Fechamento</span><span>${fmtDT(c.fechamentoTs)}</span></div>
<div class="sumline"><span>Tempo aberta</span><span>${dur(c.fechamentoTs-c.aberturaTs)}</span></div>
</div>
<div style="display:flex;flex-direction:column;gap:4px;margin-top:12px">
${(c.itens||[]).map(i=>`<div class="sumline"><span>${i.qtd}× ${esc(i.nome)}</span><span>${brl(i.qtd*i.preco)}</span></div>`).join("")||'<span class="muted">Sem itens</span>'}
${c.status==="fechada" ? `${(c.promocoes||[]).map(r=>`<div class="sumline"><span>Promoção ${esc(r.nome)} (${r.combos}× ${esc(promoTexto(r))})</span><span>− ${brl(r.desconto)}</span></div>`).join("")}${c.desconto?`<div class="sumline"><span>Desconto</span><span>− ${brl(c.desconto)}</span></div>`:""}
<div class="sumline tot"><span>Total</span><span>${brl(c.total)}</span></div>
${(c.pagamentos||[]).map(p=>`<div class="sumline"><span>${FORMAS[p.forma]}${p.forma==="cartao"?" ("+(p.tipo==="credito"?"crédito":"débito")+")":""}</span><span>${brl(p.valor)}</span></div>`).join("")}
${taxaComanda(c)?`<div class="sumline muted"><span>Taxa da maquininha</span><span>− ${brl(taxaComanda(c))}</span></div><div class="sumline"><span>Líquido recebido</span><span>${brl(c.total-taxaComanda(c))}</span></div>`:""}
${c.recebido?`<div class="sumline muted"><span>Dinheiro recebido / troco</span><span>${brl(c.recebido)} / ${brl(c.troco||0)}</span></div>`:""}` : ""}
</div>
<div class="foot" style="margin-top:18px">${c.status==="fechada"?`<button class="btn btn-ghost" data-act="reopen" data-v="${m.id}">Reabrir comanda</button>`:""}<button class="btn btn-dark" data-act="modal-close">Fechar</button></div>`;
}
else if(m.type === "buy-hist"){
const c = S.data.compras.get(m.id); if(!c){ closeModal(); return; }
const st = compraStatus(c);
h = `<h2>${esc(c.fornecedor||"Compra sem fornecedor")}</h2><p class="muted" style="margin:0">Compra de ${fmtDate(c.ts)} · <span class="pill ${st[0]}">${st[1]}</span></p>
<div style="display:flex;flex-direction:column;gap:4px;margin-top:14px">
${c.itens.map(i=>`<div class="sumline"><span>${i.qtd}× ${esc(i.nome)} <span class="muted">(${brl(i.custo)} un.)</span></span><span>${brl(i.qtd*i.custo)}</span></div>`).join("")}
<div class="sumline tot"><span>Total</span><span>${brl(c.total)}</span></div>
${c.pagamento==="avista" ? `<div class="sumline"><span>Pago à vista</span><span>${FORMAS[c.forma]||""}</span></div>` :
`<div class="label" style="margin-top:10px">Parcelas</div>${parcelasDe(c).map((p,i,arr)=>{ const d = dueInfo(p); return `<div class="sumline" style="align-items:center;gap:8px;padding:4px 0;border-bottom:1px dotted var(--line)"><span>${p.n}/${arr.length} · ${fmtDate(p.vencimentoTs)} <span class="due ${d[0]}" style="font-family:var(--f-body)">${d[1]}</span></span><span style="display:flex;gap:8px;align-items:center">${brl(p.valor)}${p.pago?`<button class="btn btn-ghost" style="padding:2px 8px;font-size:12px" data-act="parc-unpay" data-v="${m.id}:${i}">Desfazer</button>`:`<button class="btn" style="padding:2px 10px;font-size:13px" data-act="parc-pay" data-v="${m.id}:${i}">Pagar</button>`}</span></div>`; }).join("")}`}
</div>
<div class="foot" style="margin-top:18px"><button class="btn btn-ghost btn-danger" data-act="buy-del" data-v="${m.id}" style="margin-right:auto">Excluir compra</button><button class="btn btn-dark" data-act="modal-close">Fechar</button></div>`;
}
else if(m.type === "taxas"){
const t = taxas();
h = `<h2>Taxas da maquininha</h2><p class="muted" style="margin:0">Porcentagem cobrada sobre cada venda no cartão. A mudança vale para as próximas comandas; as já fechadas mantêm a taxa da época.</p>
<form id="f-taxas" autocomplete="off">
<div class="two">
<label class="field"><span>Débito (%)</span><input type="text" id="tx-deb" name="debito" inputmode="decimal" value="${String(t.debito).replace(".",",")}" placeholder="0,57"></label>
<label class="field"><span>Crédito (%)</span><input type="text" id="tx-cred" name="credito" inputmode="decimal" value="${String(t.credito).replace(".",",")}" placeholder="0,57"></label>
</div>
<div class="foot"><button type="button" class="btn btn-ghost" data-act="taxas-back">Voltar</button><button type="submit" class="btn btn-primary">Salvar taxas</button></div>
</form>`;
}
else if(m.type === "forn"){
const f = m.id ? S.data.fornecedores.get(m.id) : null;
const v = f || {nome: m.nome || ""};
h = `<h2>${f?"Editar fornecedor":"Novo fornecedor"}</h2>
<form id="f-forn" autocomplete="off">
<label class="field"><span>Nome</span><input type="text" id="fo-nome" name="nome" required maxlength="60" value="${esc(v.nome)}" placeholder="Ex.: Atacadão, Açougue do Zé"></label>
<div class="two">
<label class="field"><span>Telefone / WhatsApp</span><input type="text" id="fo-tel" name="telefone" inputmode="tel" maxlength="20" value="${esc(v.telefone)}" placeholder="(37) 99999-9999"></label>
<label class="field"><span>Pessoa de contato</span><input type="text" id="fo-cont" name="contato" maxlength="40" value="${esc(v.contato)}" placeholder="Ex.: Marcos"></label>
</div>
<div class="two">
<label class="field"><span>CNPJ ou CPF</span><input type="text" id="fo-doc" name="doc" maxlength="20" value="${esc(v.doc)}" placeholder="opcional"></label>
<label class="field"><span>Chave Pix</span><input type="text" id="fo-pix" name="pix" maxlength="80" value="${esc(v.pix)}" placeholder="opcional"></label>
</div>
<label class="field"><span>O que fornece / observação</span><input type="text" id="fo-obs" name="obs" maxlength="120" value="${esc(v.obs)}" placeholder="Ex.: carnes e linguiça, entrega às terças"></label>
<div class="foot">${f?`<button type="button" class="btn btn-ghost btn-danger" data-act="forn-del" data-v="${m.id}" style="margin-right:auto">Excluir</button>`:""}<button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary">${f?"Salvar":"Cadastrar"}</button></div>
</form>`;
}
else if(m.type === "forn-del"){
const f = S.data.fornecedores.get(m.id);
h = `<h2>Excluir fornecedor?</h2><p style="margin:8px 0 0"><b>${esc(f?f.nome:"")}</b> sai do cadastro. As compras já feitas com ele continuam no histórico.</p>
<div class="foot" style="margin-top:18px"><button class="btn btn-ghost" data-act="modal-close">Voltar</button><button class="btn btn-dark" data-act="confirm-forn-del" data-v="${m.id}">Excluir fornecedor</button></div>`;
}
else if(m.type === "buy-del"){
h = `<h2>Excluir compra?</h2><p style="margin:8px 0 0">As quantidades desta compra serão tiradas do estoque e o valor sai do financeiro.</p>
<div class="foot" style="margin-top:18px"><button class="btn btn-ghost" data-act="modal-close">Voltar</button><button class="btn btn-dark" data-act="confirm-buy-del" data-v="${m.id}">Excluir compra</button></div>`;
}
else if(m.type === "store"){
h = `<h2>Nome do estabelecimento</h2>
<form id="f-store" autocomplete="off"><label class="field"><span>Nome</span><input type="text" id="st-nome" name="nome" maxlength="40" required value="${esc(storeName())}"></label>
<div class="foot"><button type="button" class="btn btn-ghost" data-act="modal-close">Voltar</button><button type="submit" class="btn btn-primary">Salvar</button></div></form>`;
}
$("#modal").innerHTML = `<div class="overlay" data-act="overlay"><div class="dialog" role="dialog" aria-modal="true">${h}</div></div>`;
if(m.type === "close") updatePayCalc();
const first = $("#modal input:not([type=checkbox]):not([type=datetime-local])");
if(first && m.type !== "close") first.focus();
}
