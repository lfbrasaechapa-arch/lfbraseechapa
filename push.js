/* ---------- avisos de parcelas no aparelho (notificação do site) ---------- */
const VAPID_PUB = "BDufehJNCPeubzGGZZRAci7Fibc09O9eIaUTKALM_fwRhaUHCsG2MOnVtcCwf0dH0WTPg96gEbiLkvpThXOR71s";
var pushState = {checado:false, ativo:false, ocupado:false};
function pushSuportado(){ return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
function ehIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
function ehApp(){ return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
function b64u(s){ const p = "=".repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(r, c => c.charCodeAt(0)); }
async function checarPush(){
if(!pushSuportado()){ pushState = {checado:true, ativo:false}; scheduleRender(); return; }
try{
const reg = await navigator.serviceWorker.register("/sw.js");
const sub = await reg.pushManager.getSubscription();
pushState = {checado:true, ativo: !!sub && Notification.permission === "granted"};
}catch(e){ pushState = {checado:true, ativo:false}; }
scheduleRender();
}
async function ativarPush(){
if(!pushSuportado()){ toast("Este navegador não recebe notificações."); return; }
pushState.ocupado = true; render();
try{
const perm = await Notification.requestPermission();
if(perm !== "granted"){ toast("Para receber os avisos, permita as notificações deste site no navegador."); return; }
const reg = await navigator.serviceWorker.register("/sw.js");
await navigator.serviceWorker.ready;
let sub = await reg.pushManager.getSubscription();
if(!sub) sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: b64u(VAPID_PUB)});
const j = sub.toJSON();
const r = await sb.from("push_inscricoes").upsert({endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth, aparelho:navigator.userAgent.slice(0,200), email: window.__email || null});
if(r.error) throw r.error;
pushState.ativo = true;
reg.showNotification("✅ Avisos ativados", {body:"Este aparelho vai receber os avisos de parcelas a vencer.", icon:"/icon-192.png", tag:"parcelas-ativado"});
toast("Avisos de parcelas ativados neste aparelho.");
}catch(e){ toast("Não foi possível ativar os avisos agora. Tente de novo."); }
finally{ pushState.ocupado = false; render(); }
}
async function desativarPush(){
pushState.ocupado = true; render();
try{
const reg = await navigator.serviceWorker.getRegistration("/sw.js");
const sub = reg && await reg.pushManager.getSubscription();
if(sub){ await sb.from("push_inscricoes").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
pushState.ativo = false; toast("Avisos desativados neste aparelho.");
}catch(e){ toast("Não foi possível desativar agora. Tente de novo."); }
finally{ pushState.ocupado = false; render(); }
}
function pushHtml(){
let txt, btn = "";
if(!pushSuportado()){
txt = ehIOS() && !ehApp() ? "No iPhone, adicione o gerenciador à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra pelo ícone para receber os avisos." : "Este navegador não recebe notificações.";
} else if(!pushState.checado){ txt = "Verificando avisos deste aparelho…"; }
else if(Notification.permission === "denied"){ txt = "As notificações deste site estão bloqueadas no navegador. Libere nas configurações do site para receber os avisos."; }
else if(pushState.ativo){ txt = "🔔 Avisos ativos neste aparelho (todo dia às 7h)."; btn = `<button class="btn btn-ghost" style="padding:3px 10px" data-act="push-off" ${pushState.ocupado?"disabled":""}>Desativar</button>`; }
else { txt = "Receba no celular ou no computador o aviso das parcelas, todo dia às 7h."; btn = `<button class="btn btn-primary" style="padding:5px 12px" data-act="push-on" ${pushState.ocupado?"disabled":""}>Ativar avisos</button>`; }
return `<div class="push-box"><span>${txt}</span>${btn}</div>`;
}
document.addEventListener("click", e => {
const t = e.target.closest("[data-act=push-on],[data-act=push-off]"); if(!t) return;
if(t.dataset.act === "push-on") ativarPush(); else desativarPush();
});
