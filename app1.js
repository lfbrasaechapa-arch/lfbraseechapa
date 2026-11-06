/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl = n => (Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtDate = ts => new Date(ts).toLocaleDateString("pt-BR");
const fmtTime = ts => new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const fmtDT = ts => fmtDate(ts) + " às " + fmtTime(ts);
const round2 = n => Math.round(n*100)/100;
function dur(ms){ const m=Math.max(0,Math.round(ms/60000)); if(m<60) return m+" min"; const h=Math.floor(m/60); return h+"h"+String(m%60).padStart(2,"0"); }
function parseMoney(s){ s=String(s??"").trim().replace(/[R$\s]/g,""); if(!s) return NaN; if(s.includes(",")) s=s.replace(/\./g,"").replace(",","."); const n=parseFloat(s); return isFinite(n)?round2(n):NaN; }
const moneyIn = n => (Number(n)||0).toFixed(2).replace(".",",");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const clone = o => JSON.parse(JSON.stringify(o));
function toLocalInput(ts){ const d=new Date(ts); const p=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); }
function toDateInput(ts){ return toLocalInput(ts).slice(0,10); }
const FORMAS = {pix:"Pix", dinheiro:"Dinheiro", cartao:"Cartão"};
const FORMA_COLOR = {pix:"var(--pix)", dinheiro:"var(--cash)", cartao:"var(--card)"};
const ICONS = {
pix:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="M8 12h8"/></svg>',
dinheiro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>',
cartao:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/></svg>'
};
/* ---------- produtos de exemplo (modo local) ---------- */
const SEED = [
["p-espeto-carne","Espeto de carne","Espetos",10,40],["p-espeto-frango","Espeto de frango","Espetos",8,40],
["p-espeto-linguica","Espeto de linguiça","Espetos",8,30],["p-espeto-queijo","Espeto de queijo coalho","Espetos",9,25],
["p-espeto-medalhao","Medalhão de frango c/ bacon","Espetos",10,20],["p-pao-alho","Pão de alho","Espetos",7,20],
["p-x-burguer","X-burguer","Lanches",18,null],["p-x-tudo","X-tudo","Lanches",26,null],["p-misto","Misto quente","Lanches",10,null],
["p-mandioca","Porção de mandioca","Porções",25,null],["p-batata","Porção de batata frita","Porções",28,null],
["p-refri-lata","Refrigerante lata","Bebidas",6,48],["p-refri-2l","Refrigerante 2 L","Bebidas",14,12],
["p-agua","Água mineral","Bebidas",4,24],["p-cerveja-lata","Cerveja lata","Bebidas",7,60],
["p-long-neck","Cerveja long neck","Bebidas",10,4],["p-suco","Suco natural","Bebidas",9,null]
];
/* ---------- armazenamento ---------- */
const COLS = ["produtos","comandas","despesas","compras","fornecedores","config","promocoes"];
const S = { data:{}, mode:"loading", db:null, seen:new Set(), slow:false, readOnly:false };
COLS.forEach(c => S.data[c] = new Map());
const LS_KEY = "comandas-churrasquinho-v1";
const inflight = new Map();
function useLocal(){
S.mode = "local";
let raw = null;
try { raw = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch(e){}
if(raw){ COLS.forEach(c => Object.entries(raw[c]||{}).forEach(([id,o]) => S.data[c].set(id,o))); }
else { const t=Date.now(); SEED.forEach(([id,nome,categoria,preco,estoque],i) => S.data.produtos.set(id,{nome,categoria,preco,estoque,criadoTs:t+i})); saveLocal(); }
render();
}
let saveT = null;
function saveLocal(){
clearTimeout(saveT);
saveT = setTimeout(() => { try{ const o={}; COLS.forEach(c => o[c]=Object.fromEntries(S.data[c])); localStorage.setItem(LS_KEY, JSON.stringify(o)); }catch(e){} }, 200);
}
/* ---------- Supabase ---------- */
const SB_URL = "https://nvotxijhswdwnyyskvvc.supabase.co";
const SB_KEY = "sb_publishable_FeYvAu_cQkTKKRKz9DCQEA_LTUKzcoC";
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true}}) : null;
let channel = null, lastLoad = 0;
async function loadAll(){
const fresh = {}; COLS.forEach(c => fresh[c] = new Map());
const page = 1000;
for(let from = 0; ; from += page){
const {data, error} = await sb.from("docs").select("colecao,id,data").order("colecao").order("id").range(from, from+page-1);
if(error) throw error;
data.forEach(r => { if(fresh[r.colecao]) fresh[r.colecao].set(r.id, r.data); });
if(data.length < page) break;
}
COLS.forEach(c => { for(const [id] of S.data[c]) if(inflight.has(c+"/"+id)) fresh[c].set(id, S.data[c].get(id)); S.data[c] = fresh[c]; });
lastLoad = Date.now();
}
async function connect(){
S.mode = "db";
try { await loadAll(); S.slow = false; }
catch(e){ S.slow = true; toast("Não foi possível carregar os dados. Verifique a internet."); }
COLS.forEach(c => S.seen.add(c));
render();
if(channel) sb.removeChannel(channel);
channel = sb.channel("docs-live").on("postgres_changes", {event:"*", schema:"public", table:"docs"}, payload => {
const del = payload.eventType === "DELETE";
const r = del ? payload.old : payload.new;
if(!r || !S.data[r.colecao]) return;
if(inflight.has(r.colecao+"/"+r.id)) return;
if(del) S.data[r.colecao].delete(r.id); else S.data[r.colecao].set(r.id, r.data);
scheduleRender();
}).subscribe();
}
/* ao voltar para o app depois de um tempo, recarrega tudo para não perder nada */
document.addEventListener("visibilitychange", async () => {
if(document.visibilityState === "visible" && S.mode === "db" && Date.now() - lastLoad > 20000){
try { await loadAll(); S.slow = false; render(); } catch(e){ S.slow = true; render(); }
}
});
/* grava o estado atual do documento; uma escrita por vez por documento */
function persist(col, id){
if(S.mode === "local"){ saveLocal(); return; }
if(S.mode !== "db") return;
const key = col+"/"+id;
let st = inflight.get(key);
if(st){ st.again = true; return; }
st = {again:false}; inflight.set(key, st);
(async () => {
do {
st.again = false;
const obj = S.data[col].get(id);
try {
const r = obj ? await sb.from("docs").upsert({colecao:col, id, data:obj})
: await sb.from("docs").delete().eq("colecao", col).eq("id", id);
if(r.error) throw r.error;
}
catch(e){ writeError(e); }
} while(st.again);
inflight.delete(key);
})();
}
function writeError(e){
const code = e && e.code;
if(code === "42501" || code === "PGRST301" || /JWT/i.test(e && e.message || "")) toast("Sua sessão expirou. Entre de novo para continuar salvando.");
else toast("Não foi possível salvar agora. Verifique a internet e tente de novo.");
}
function put(col, id, obj){ S.data[col].set(id, obj); persist(col, id); }
function del(col, id){ S.data[col].delete(id); persist(col, id); }
/* ---------- estado da interface ---------- */
const ui = { tab:"comandas", sel:null, q:"", cat:"Todas", listQ:"", prodQ:"", prodFilter:"todos", period:"hoje", modal:null, pay:null, compra:null, buyView:"compras", fornQ:"" };
try { const t = localStorage.getItem(LS_KEY+"-tab"); if(t) ui.tab = t; } catch(e){}
try { const a = new URLSearchParams(location.search).get("aba"); if(a){ ui.tab = a; history.replaceState(null, "", location.pathname); } } catch(e){}
/* ---------- consultas ---------- */
const produtos = () => [...S.data.produtos.entries()].map(([id,p]) => ({id,...p}));
const comandas = () => [...S.data.comandas.entries()].map(([id,c]) => ({id,...c}));
const abertas = () => comandas().filter(c => c.status === "aberta").sort((a,b) => a.aberturaTs - b.aberturaTs);
const subtotal = c => round2((c.itens||[]).reduce((s,i) => s + i.preco*i.qtd, 0));
/* ---------- promoções ("leve N por R$ X", misturando os produtos do grupo) ---------- */
const promocoes = () => [...S.data.promocoes.entries()].map(([id,p]) => ({id,...p}));
function promoAtiva(pr){ if(!pr.ativa) return false; if(pr.ate && Date.now() > new Date(pr.ate+"T23:59:59").getTime()) return false; return true; }
const promoTexto = pr => pr.qtd+" por "+brl(pr.preco);
function promoDoProduto(pid){ return promocoes().find(pr => promoAtiva(pr) && (pr.produtos||[]).includes(pid)) || null; }
/* calcula as promoções de uma comanda: forma combos com as unidades mais caras primeiro (melhor para o cliente) */
function calcPromos(c){
const out = [];
promocoes().filter(pr => promoAtiva(pr) && pr.qtd >= 2 && pr.preco > 0).forEach(pr => {
const set = new Set(pr.produtos||[]); const units = [];
(c.itens||[]).forEach(i => { if(set.has(i.pid)) for(let k=0;k<i.qtd;k++) units.push(i.preco); });
if(!units.length) return;
units.sort((a,b) => b-a);
const combos = Math.floor(units.length / pr.qtd); let desc = 0;
for(let k=0;k<combos;k++){ const soma = units.slice(k*pr.qtd,(k+1)*pr.qtd).reduce((a,b)=>a+b,0); desc += Math.max(0, soma - pr.preco); }
const sobra = units.length % pr.qtd;
out.push({id:pr.id, nome:pr.nome, qtd:pr.qtd, preco:pr.preco, combos, unidades:units.length, faltam: sobra ? pr.qtd - sobra : 0, desconto: round2(desc)});
});
return out;
}
const descPromo = c => c.status === "aberta" ? round2(calcPromos(c).reduce((s,r)=>s+r.desconto,0)) : (c.descontoPromo||0);
const totalAberta = c => round2(subtotal(c) - descPromo(c));
const qtdItens = c => (c.itens||[]).reduce((s,i) => s + i.qtd, 0);
const categorias = () => { const s = new Set(produtos().map(p => p.categoria||"Outros")); return [...s].sort((a,b)=>a.localeCompare(b,"pt-BR")); };
const compras = () => [...S.data.compras.entries()].map(([id,c]) => ({id,...c}));
const fornecedores = () => [...S.data.fornecedores.entries()].map(([id,f]) => ({id,...f})).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
const findForn = nome => { const n = String(nome||"").trim().toLowerCase(); if(!n) return null; for(const [id,f] of S.data.fornecedores) if(f.nome.trim().toLowerCase()===n) return {id,...f}; return null; };
const soDigitos = s => String(s||"").replace(/\D/g,"");
function waLink(tel){ let d = soDigitos(tel); if(d.length < 10) return ""; if(!d.startsWith("55")) d = "55"+d; return "https://wa.me/"+d; }
const findProd = nome => { const n = String(nome||"").trim().toLowerCase(); if(!n) return null; for(const [id,p] of S.data.produtos) if(p.nome.trim().toLowerCase()===n) return {id,...p}; return null; };
function novaCompra(){ return {fornecedor:"", data:toDateInput(Date.now()), linhas:[{nome:"",qtd:"",custo:"",venda:""}], pagamento:"avista", forma:"pix", nparc:"1", venc:toDateInput(Date.now()+30*86400000), intervalo:"30", parcelas:null, manual:false}; }
/* parcelas de uma compra a prazo (compras antigas com um só vencimento viram 1 parcela) */
function parcelasDe(c){
if(c.pagamento !== "prazo") return [];
if(Array.isArray(c.parcelas) && c.parcelas.length) return c.parcelas;
return [{n:1, valor:c.total, vencimentoTs:c.vencimentoTs, pago:!!c.pago, pagoTs:c.pagoTs}];
}
function ensureParcelas(c){ if(c.pagamento==="prazo" && !(Array.isArray(c.parcelas) && c.parcelas.length)){ c.parcelas = parcelasDe(c).map(p=>({...p})); delete c.vencimentoTs; } return c.parcelas; }
const taxas = () => { const t = S.data.config.get("taxas")||{}; const f = v => (isFinite(Number(v)) && Number(v) >= 0) ? Number(v) : 0.57; return {debito:f(t.debito), credito:f(t.credito)}; };
const pct = n => n.toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
/* taxa da maquininha de uma comanda fechada (guardada no fechamento; comandas antigas usam a taxa atual) */
function taxaComanda(c){ let t = 0; (c.pagamentos||[]).forEach(p => { if(p.forma==="cartao") t += (typeof p.taxa === "number") ? p.taxa : round2(p.valor * taxas()[p.tipo==="credito"?"credito":"debito"] / 100); }); return round2(t); }
const alertaDias = () => { const d = Number((S.data.config.get("alertas")||{}).dias); return isFinite(d) && d >= 0 ? d : 3; };
function diasPara(ts){ return Math.round((sod(ts) - sod(Date.now()))/86400000); }
function dueInfo(p){
if(p.pago) return ["ok","Paga em "+fmtDate(p.pagoTs)];
const d = diasPara(p.vencimentoTs);
if(d < 0) return ["vencida", "Vencida há "+(-d)+(d===-1?" dia":" dias")];
if(d === 0) return ["logo","Vence hoje"];
if(d <= alertaDias()) return ["logo","Vence em "+d+(d===1?" dia":" dias")];
return ["ok","Vence em "+d+" dias"];
}
/* todas as parcelas em aberto, da mais antiga para a mais nova */
function parcelasAbertas(){
const out = [];
compras().forEach(c => parcelasDe(c).forEach((p,i,arr) => { if(!p.pago) out.push({cid:c.id, idx:i, total:arr.length, fornecedor:c.fornecedor, ...p}); }));
return out.sort((x,y)=>x.vencimentoTs-y.vencimentoTs);
}
function compraStatus(c){
if(c.pagamento==="avista") return ["avista","À vista"];
const ps = parcelasDe(c); const pagas = ps.filter(p=>p.pago).length;
const tag = ps.length > 1 ? " · "+pagas+"/"+ps.length+" pagas" : "";
if(pagas === ps.length) return ["paga","A prazo · quitada"];
if(ps.some(p => !p.pago && diasPara(p.vencimentoTs) < 0)) return ["vencida","A prazo · vencida"+tag];
return ["pendente","A prazo"+tag];
}
function gerarParcelas(total, n, primeiroISO, intervalo){
n = Math.max(1, Math.min(48, parseInt(n,10)||1));
const t0 = new Date(primeiroISO+"T12:00").getTime(); if(!isFinite(t0)) return [];
const cents = Math.round(total*100), base = Math.floor(cents/n), resto = cents - base*n;
const iv = parseInt(intervalo,10);
const out = [];
for(let i=0;i<n;i++){
let ts;
if(iv === 0){ const d = new Date(t0), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+i); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth()+1, 0).getDate())); ts = d.getTime(); }   // mensal, mesmo dia
else ts = t0 + i*(isFinite(iv)&&iv>0?iv:30)*86400000;
out.push({n:i+1, valor:(base + (i < resto ? 1 : 0))/100, vencimentoTs:ts, pago:false});
}
return out;
}
const storeName = () => (S.data.config.get("loja")||{}).nome || "L&F Brasa e Chapa";
function stockClass(e){ if(e===null||e===undefined) return ""; return e<=0 ? "out" : e<=5 ? "low" : ""; }
/* ---------- ações ---------- */
function guard(){ if(S.readOnly){ toast("Somente leitura: você não pode alterar os dados."); return false; } return true; }
function abrirComanda(nome, obs, ts){
const id = uid();
put("comandas", id, {nome, obs, status:"aberta", aberturaTs:ts, itens:[], criadoTs:Date.now()});
ui.sel = id; ui.q=""; ui.cat="Todas";
toast("Comanda “"+nome+"” aberta às "+fmtTime(ts));
}
function addItem(cid, pid){
if(!guard()) return;
const c = S.data.comandas.get(cid), p = S.data.produtos.get(pid);
if(!c || !p || c.status!=="aberta") return;
if(p.estoque !== null && p.estoque !== undefined && p.estoque <= 0){ toast(p.nome+" está sem estoque."); return; }
const it = c.itens.find(i => i.pid === pid);
if(it) it.qtd++; else c.itens.push({pid, nome:p.nome, preco:p.preco, qtd:1});
if(p.estoque !== null && p.estoque !== undefined){ p.estoque--; persist("produtos", pid); }
persist("comandas", cid); render();
}
