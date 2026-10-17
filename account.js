(async function(){
"use strict";
var H=HKC,e=H.esc,$=function(i){return document.getElementById(i)},A=$("app"),tab="jobs",me=null,reqs=[],msgs=[],
ST={offered:"Matched",requested:"Waiting for reply",accepted:"Accepted",declined:"Not available"};
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){t.style.display="none"},3500)}
function nextUrl(){var n=new URLSearchParams(location.search).get("next");return n&&/^\/(?!\/)/.test(n)?n:null}
function authView(){
  A.innerHTML='<h1>Your account</h1><p class="sumline">Log in or create a free account to request services, compare pros and message them. Looking to offer services instead? <a href="/pro/">Go to the pro portal</a>.</p>'+H.authHtml("client");
  H.bindAuth(A,"client",function(){var n=nextUrl();if(n)location.href=n;else start()})}
async function load(){
  var r=await Promise.all([H.myRequests(),H.messages()]);reqs=r[0];msgs=r[1]}
function jobCard(r){
  var os=r.offers||[],acc=os.filter(function(o){return o.status==="accepted"});
  return '<article class="cardx"><div class="row"><h3>'+e(r.svc)+'</h3><span class="biz">'+e(H.d0(r.created_at))+'</span></div>'
  +'<p class="biz">ZIP '+e(r.zip)+' · '+e(r.timing||"")+' · '+e(r.freq||"")+(r.details&&r.details.length?' · '+e(r.details.join(", ")):'')+'</p>'
  +(r.notes?'<p>“'+e(r.notes)+'”</p>':'')
  +'<p><strong>'+(acc.length?'Accepted by: '+acc.map(function(o){return e(o.pros.name)+' ('+e(o.pros.biz)+')'}).join(", "):os.length?'No pro has accepted yet':'No pros were available')+'</strong></p>'
  +(os.length?'<table><caption class="sr">Pros for this job</caption><thead><tr><th>Pro</th><th>Rating</th><th>Status</th><th></th></tr></thead><tbody>'+os.map(function(o){var p=o.pros;
    return '<tr><td>'+e(p.name)+'<br><span class="biz">'+e(p.biz)+'</span></td><td>'+(p.review_count?H.stars(p.rating)+' '+Number(p.rating).toFixed(1):'<span class="biz">New</span>')+'</td><td><span class="badge">'+ST[o.status]+'</span></td><td>'
    +(o.status!=="declined"?'<button class="btn alt sm" data-a="chat" data-r="'+r.id+'" data-p="'+p.id+'">Message</button> ':'')
    +(o.status==="accepted"&&!o.reviewed?'<a class="btn sm" href="/matches/?id='+r.id+'">Leave review</a>':'')+'</td></tr>'}).join("")+'</tbody></table>':'')
  +'<div class="bar2"><a class="btn alt sm" href="/matches/?id='+r.id+'">'+(os.length?'View matches and request quotes':'View request')+'</a></div></article>'}
function threads(){
  var m={};
  msgs.forEach(function(x){var k=x.request_id+"|"+x.pro_id;if(!m[k]||x.created_at>m[k].last.created_at)m[k]={req:x.request_id,pro:x.pro_id,last:x,n:0};});
  msgs.forEach(function(x){m[x.request_id+"|"+x.pro_id].n++});
  return Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return a.last.created_at<b.last.created_at?1:-1})}
function find(rid,pid){var r=reqs.filter(function(x){return x.id===rid})[0],o=r&&(r.offers||[]).filter(function(x){return x.pro_id===pid})[0];return{r:r,o:o}}
function openChat(rid,pid){
  var f=find(rid,pid);if(!f.o)return;
  H.chat.open({req:rid,pro:pid,role:"client",title:f.o.pros.name+" · "+f.r.svc,canSend:f.o.status!=="declined",
    note:f.o.status==="offered"?"Sending a message also requests a quote from this pro.":f.o.status==="requested"?"Waiting for this pro to accept. They’ll reply here.":"",
    onSent:async function(){await load();render()}})}
function render(){
  var acc=0,total=reqs.length;reqs.forEach(function(r){if((r.offers||[]).some(function(o){return o.status==="accepted"}))acc++});
  var h='<div class="row"><div><h1>Hi, '+e(me.name.split(" ")[0])+'</h1><div class="biz">'+e(me.email)+'</div></div><div class="bar2" style="margin:0"><a class="btn sm" href="/?start=1">Request a service</a><button class="btn alt sm" data-a="out">Log out</button></div></div>'
  +'<div class="stats"><div class="stat"><b>'+total+'</b>Jobs requested</div><div class="stat"><b>'+acc+'</b>With an accepted pro</div><div class="stat"><b>'+reqs.reduce(function(n,r){return n+(r.offers||[]).length},0)+'</b>Pros matched</div><div class="stat"><b>'+threads().length+'</b>Conversations</div></div>'
  +'<div class="tabs" role="group" aria-label="Sections">'+[["jobs","Job history"],["msgs","Messages"],["prof","Profile"]].map(function(t){return'<button type="button" class="btn alt sm" data-a="tab" data-t="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+'</button>'}).join("")+'</div>';
  if(tab==="jobs")h+=reqs.length?reqs.map(jobCard).join(""):'<div class="cardx"><h2>No jobs yet</h2><p>Request a cleaning, lawn or pool service and your history will show up here, including which pros you matched with.</p><a class="btn" href="/?start=1">Request a service</a></div>';
  else if(tab==="msgs"){var t=threads();h+=t.length?t.map(function(x){var f=find(x.req,x.pro);return'<article class="cardx"><div class="row"><h3>'+e(f.o?f.o.pros.name+" · "+f.o.pros.biz:"Pro")+'</h3><span class="biz">'+e(H.dt(x.last.created_at))+'</span></div><p class="biz">'+e(f.r?f.r.svc:"")+' · '+x.n+' message'+(x.n>1?'s':'')+'</p><p>'+e((x.last.from_role==="client"?"You: ":"")+x.last.body.slice(0,140))+'</p><button class="btn sm" data-a="chat" data-r="'+x.req+'" data-p="'+x.pro+'">Open conversation</button></article>'}).join(""):'<div class="cardx"><h2>No messages yet</h2><p>Open a job and message a matched pro, or request quotes from several at once.</p></div>'}
  else h+='<form id="pf" class="cardx" novalidate><h2>Your details</h2><label for="pn">Name</label><input id="pn" value="'+e(me.name)+'" autocomplete="name"><label for="pp">Phone (optional)</label><input id="pp" value="'+e(me.phone||"")+'" autocomplete="tel"><p class="biz">Pros see your name, email and phone only after they accept your request.</p><p class="err" role="alert"></p><button class="btn">Save</button></form>';
  A.innerHTML=h}
A.addEventListener("click",async function(ev){
  var b=ev.target.closest("[data-a]");if(!b)return;var a=b.dataset.a;
  if(a==="tab"){tab=b.dataset.t;render()}
  else if(a==="chat")openChat(b.dataset.r,b.dataset.p);
  else if(a==="out"){await H.signOut();location.href="/"}});
A.addEventListener("submit",async function(ev){
  if(ev.target.id!=="pf")return;ev.preventDefault();var er=ev.target.querySelector(".err"),n=$("pn").value.trim();
  if(!n){er.textContent="Enter your name.";return}
  try{await H.updateProfile(me.id,{name:n,phone:$("pp").value.trim()});me.name=n;me.phone=$("pp").value.trim();toast("Saved");render()}catch(x){er.textContent=x.message}});
async function start(){
  try{
    var b=await H.boot();
    if(!b.user){authView();return}
    me=b.profile;
    if(me.role!=="client"){A.innerHTML='<h1>This is a pro account</h1><p class="sumline">Pro accounts are managed in the pro portal.</p><div class="bar2"><a class="btn" href="/pro/">Go to pro portal</a><button class="btn alt" data-a="out">Log out</button></div>';return}
    var d=await H.flushDraft();if(d){location.href="/matches/?id="+d;return}
    var n=nextUrl();if(n){location.href=n;return}
    await load();render();H.onChange(["offers","messages"],async function(){if(tab==="prof")return;try{await load();render()}catch(x){}})
  }catch(x){A.innerHTML='<h1>Something went wrong</h1><p class="sumline">'+e(x.message)+'</p>'}}
if(!H.ready){A.innerHTML=H.notice();return}
start();
})();
