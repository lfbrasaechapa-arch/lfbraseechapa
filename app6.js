/* ---------- toast e relógio ---------- */
let toastT = 0;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }
function tick(){
const d = new Date();
$("#clock").textContent = d.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}) + " · " + fmtTime(d);
const now = Date.now();
document.querySelectorAll("[data-since]").forEach(el => el.textContent = dur(now - Number(el.dataset.since)));
}
tick(); setInterval(tick, 30000);
function renderModeBtn(){
const claro = document.documentElement.dataset.modo === "claro";
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
const b = $("#modeBtn");
b.innerHTML = claro ? moon + "Modo escuro" : sun + "Modo claro";
b.setAttribute("aria-label", claro ? "Mudar para o modo escuro" : "Mudar para o modo claro");
}
renderModeBtn();
/* ---------- início ---------- */
function showLogin(){
document.body.classList.add("locked"); $("#login").hidden = false;
if(channel){ sb.removeChannel(channel); channel = null; }
COLS.forEach(c => S.data[c] = new Map()); S.seen.clear(); S.mode = "loading";
setTimeout(() => { const e = $("#lg-email"); if(e) e.focus(); }, 50);
}
async function startApp(session){
const {data:ok, error} = await sb.rpc("is_equipe");
if(error || ok !== true){
await sb.auth.signOut(); showLogin();
$("#lg-err").textContent = error ? "Não foi possível verificar seu acesso. Tente de novo." : "Este e-mail não tem acesso ao gerenciador.";
return;
}
document.body.classList.remove("locked"); $("#login").hidden = true;
$("#logoutBtn").title = "Sair (" + (session.user.email||"") + ")";
window.__email = session.user.email || null; checarPush();
render(); connect();
}
document.getElementById("f-login").addEventListener("submit", async e => {
e.preventDefault(); e.stopPropagation();
const email = $("#lg-email").value.trim(), password = $("#lg-senha").value;
const btn = $("#lg-btn"), err = $("#lg-err"); err.textContent = ""; btn.disabled = true; btn.textContent = "Entrando…";
const {data, error} = await sb.auth.signInWithPassword({email, password});
btn.disabled = false; btn.textContent = "Entrar";
if(error){ err.textContent = /invalid/i.test(error.message) ? "E-mail ou senha incorretos." : /confirm/i.test(error.message) ? "Este e-mail ainda não foi confirmado." : "Não foi possível entrar agora. Tente de novo."; return; }
$("#lg-senha").value = ""; startApp(data.session);
}, true);
if(sb) sb.auth.onAuthStateChange((event) => { if(event === "SIGNED_OUT") showLogin(); });
(async () => {
if(!sb){ showLogin(); $("#lg-err").textContent = "Não foi possível carregar o sistema. Verifique a internet e recarregue a página."; $("#lg-btn").disabled = true; return; }
const {data:{session}} = await sb.auth.getSession();
if(session) startApp(session); else showLogin();
})();
