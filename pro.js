(async function(){
"use strict";
var H=HKC,e=H.esc,$=function(i){return document.getElementById(i)},A=$("app"),tab="leads",me=null,row=null,leads=[],msgs=[],charges=[],revs=[],
PS={requested:"New request",accepted:"Accepted",declined:"Declined"};
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){t.style.display="none"},3500)}
function authView(){
  A.innerHTML='<h1>Home Key Clean for pros</h1><p class="sumline">Get matched with customers on a fair rotation, so no one wins the job just by being first. You set your own prices. Accepting a request costs $20, and declining is free. Looking for a service instead? <a href="/account/">Go to the client page</a>.</p>'+H.authHtml("pro");
  H.bindAuth(A,"pro",start)}
async function load(){
  var r=await Promise.all([H.proRow(),H.leads(),H.messages(),H.charges(),H.myReviews()]);row=r[0];leads=r[1];msgs=r[2];charges=r[3];revs=r[4]}
function who(l){return(l.client_name||l.client_first||"Customer")}
function fields(p){
  return '<label for="fn">Your name</label><input id="fn" value="'+e(p.name)+'"><label for="fb">Business name</label><input id="fb" value="'+e(p.biz)+'"><fieldset><legend>Services you offer</legend>'+H.SV.map(function(s){return'<label class="ck"><input type="checkbox" name="svc" value="'+e(s)+'"'+(p.services.indexOf(s)>-1?' checked':'')+'> '+e(s)+'</label>'}).join("")+'</fieldset><label for="fz">Areas you serve</label><input id="fz" value="'+e(H.fz(p.zip_prefixes))+'" placeholder="ZIP codes or 3-digit prefixes, e.g. 900-918, 926"><label for="fp">About you</label><textarea id="fp">'+e(p.bio)+'</textarea>'}
function leadCard(l){
  var acc=l.status==="accepted";
  return '<article class="cardx"><div class="row"><h3>'+e(l.svc)+'</h3><span class="badge">'+PS[l.status]+'</span></div><p>'+e((l.details||[]).join(", "))+'</p><p class="biz">'+e(l.client_first)+' · ZIP '+e(l.zip)+' · '+e(l.timing||"")+' · '+e(l.freq||"")+' · '+e(H.dt(l.created_at))+'</p>'
  +(l.notes?'<p>“'+e(l.notes)+'”</p>':'')
  +(acc?'<p><strong>Contact:</strong> '+e(l.client_name)+' · '+e(l.client_email)+(l.client_phone?' · '+e(l.client_phone):'')+'</p>':l.status==="requested"?'<p class="biz">Customer contact details unlock when you accept.</p>':'')
  +'<div class="bar2"><button class="btn alt sm" data-a="chat" data-r="'+l.request_id+'">Open messages</button>'
  +(l.status==="requested"?'<button class="btn sm" data-a="acc" data-o="'+l.offer_id+'">Accept for $20</button><button class="btn alt sm" data-a="dec" data-o="'+l.offer_id+'">Decline (free)</button>':'')+'</div></article>'}
function render(){
  var nw=leads.filter(function(l){return l.status==="requested"}).length,acc=leads.filter(function(l){return l.status==="accepted"}).length,owed=charges.reduce(function(n,c){return n+c.amount},0),
  h='<div class="row"><div><h1>'+e(row.biz)+'</h1><div class="biz">'+e(row.name)+' · '+(row.review_count?H.stars(row.rating)+' '+Number(row.rating).toFixed(1)+' ('+row.review_count+' reviews)':'New pro')+'</div></div><button class="btn alt sm" data-a="out">Log out</button></div>'
  +'<div class="stats">'+[["Shown to customers",row.shown],["Requests received",leads.length],["Accepted",acc],["Fees so far","$"+owed]].map(function(s){return'<div class="stat"><b>'+s[1]+'</b>'+s[0]+'</div>'}).join("")+'</div>'
  +'<div class="tabs" role="group" aria-label="Sections">'+[["leads","Requests"+(nw?" ("+nw+")":"")],["msgs","Messages"],["prof","Profile"],["revs","Reviews"],["bill","Billing"]].map(function(t){return'<button type="button" class="btn alt sm" data-a="tab" data-t="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+'</button>'}).join("")+'</div>';
  if(tab==="leads")h+=leads.length?leads.map(leadCard).join(""):'<div class="cardx"><h2>No requests yet</h2><p>When a customer asks you for a quote, it shows up here. Make sure your services and areas are complete so you get matched.</p></div>';
  else if(tab==="msgs"){
    var m={};msgs.forEach(function(x){var k=x.request_id;if(!m[k]||x.created_at>m[k].last.created_at)m[k]={req:x.request_id,last:x,n:0}});msgs.forEach(function(x){m[x.request_id].n++});
    var t=Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return a.last.created_at<b.last.created_at?1:-1});
    h+=t.length?t.map(function(x){var l=leads.filter(function(y){return y.request_id===x.req})[0];return'<article class="cardx"><div class="row"><h3>'+e(l?who(l)+" · "+l.svc:"Customer")+'</h3><span class="biz">'+e(H.dt(x.last.created_at))+'</span></div><p>'+e((x.last.from_role==="pro"?"You: ":"")+x.last.body.slice(0,140))+'</p><button class="btn sm" data-a="chat" data-r="'+x.req+'">Open conversation</button></article>'}).join(""):'<div class="cardx"><h2>No messages yet</h2></div>'}
  else if(tab==="prof")h+='<form id="pf" class="cardx" novalidate><h2>Your profile</h2>'+fields(row)+'<p class="err" role="alert"></p><button class="btn">Save profile</button><p class="biz">Customers are matched on a fair rotation, so every pro gets shown. A complete profile and good reviews help you win the job.</p></form>';
  else if(tab==="revs")h+=revs.length?revs.map(function(v){return'<div class="cardx">'+H.stars(v.rating)+' <strong>'+e(v.author)+'</strong> · '+e(H.d0(v.created_at))+'<p>'+e(v.body)+'</p></div>'}).join(""):'<div class="cardx"><h2>No reviews yet</h2><p>Reviews appear after customers rate jobs you accepted.</p></div>';
  else h+='<div class="cardx"><h2>Billing</h2><p>$20 per accepted request. Total so far: <strong>$'+owed+'</strong>.</p><p class="biz">Online payment isn’t switched on yet. Accepted requests are recorded here, and Home Key Clean will invoice you for them.</p>'+(charges.length?'<table><thead><tr><th>Date</th><th>Job</th><th>Fee</th></tr></thead><tbody>'+charges.map(function(c){return'<tr><td>'+e(H.dt(c.created_at))+'</td><td>'+e(c.requests?c.requests.svc:"Request")+'</td><td>$'+c.amount+'</td></tr>'}).join("")+'</tbody></table>':'')+'</div>';
  A.innerHTML=h}
async function refresh(){if(tab==="prof")return;try{await load();render()}catch(x){}}
async function act(fn,ok){try{await fn();await load();render();toast(ok)}catch(x){toast(x.message)}}
A.addEventListener("click",async function(ev){
  var b=ev.target.closest("[data-a]");if(!b)return;var a=b.dataset.a;
  if(a==="tab"){tab=b.dataset.t;render()}
  else if(a==="out"){await H.signOut();location.reload()}
  else if(a==="chat"){var l=leads.filter(function(x){return x.request_id===b.dataset.r})[0];
    H.chat.open({req:b.dataset.r,pro:me.id,role:"pro",title:(l?who(l)+" · "+l.svc:"Customer"),canSend:!!l&&l.status==="accepted",
      note:l&&l.status==="requested"?"Accept this request to reply and see contact details.":l&&l.status==="declined"?"You declined this request.":"",onSent:refresh})}
  else if(a==="acc"){if(!confirm("Accepting adds a $20 fee to your account and shares your reply and the customer's contact details with you. Continue?"))return;act(function(){return H.respond(b.dataset.o,true)},"Accepted. $20 fee recorded.")}
  else if(a==="dec")act(function(){return H.respond(b.dataset.o,false)},"Declined")});
A.addEventListener("submit",async function(ev){
  if(ev.target.id!=="pf")return;ev.preventDefault();
  var er=ev.target.querySelector(".err"),s=[].slice.call(A.querySelectorAll("input[name=svc]:checked")).map(function(x){return x.value}),z=H.pz($("fz").value),n=$("fn").value.trim(),bz=$("fb").value.trim();
  if(!n||!bz){er.textContent="Enter your name and business name.";return}
  if(!s.length){er.textContent="Choose at least one service.";return}
  if(!z.length){er.textContent="Enter at least one ZIP code or prefix you serve.";return}
  try{await H.updatePro(me.id,{name:n,biz:bz,bio:$("fp").value.trim(),services:s,zip_prefixes:z});await H.updateProfile(me.id,{name:n,phone:me.phone});toast("Profile saved");await load();render()}catch(x){er.textContent=x.message}});
async function start(){
  try{
    var b=await H.boot();
    if(!b.user){authView();return}
    me=b.profile;
    if(me.role!=="pro"){A.innerHTML='<h1>This is a client account</h1><p class="sumline">Client accounts are managed on the client page.</p><div class="bar2"><a class="btn" href="/account/">Go to my account</a><button class="btn alt" data-a="out">Log out</button></div>';return}
    await load();tab="leads";render();H.onChange(["offers","messages"],refresh)
  }catch(x){A.innerHTML='<h1>Something went wrong</h1><p class="sumline">'+e(x.message)+'</p>'}}
if(!H.ready){A.innerHTML=H.notice();return}
start();
})();
