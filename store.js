(function(w){
"use strict";
var C=w.HKC_CONFIG||{},
SV=["Residential cleaning","Commercial cleaning","Move-in / move-out cleaning","Window cleaning","Pressure washing","Gutter cleaning","Carpet and upholstery cleaning","Air duct and dryer vent cleaning","Lawn care","Pool care"],
ready=!!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&w.supabase),
sb=ready?w.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function stars(r){return '<span class="stars" style="--r:'+(+r)+'" role="img" aria-label="'+(+r).toFixed(1)+' out of 5 stars">★★★★★</span>'}
function pz(s){var o={};String(s||"").split(/[,\s]+/).forEach(function(t){var m=t.match(/^(\d{3})-(\d{3})$/);
  if(m){var a=+m[1],b=+m[2];if(a>b){var x=a;a=b;b=x}for(var i=a;i<=b;i++)o[i]=1;return}
  m=t.match(/^(\d{3})(\d{2})?$/);if(m)o[+m[1]]=1});
  return Object.keys(o).map(Number).sort(function(a,b){return a-b})}
function fz(a){var r=[],s=null,p=null;(a||[]).forEach(function(n){if(s===null){s=p=n}else if(n===p+1){p=n}else{r.push(s===p?s:s+"-"+p);s=p=n}});if(s!==null)r.push(s===p?s:s+"-"+p);return r.join(", ")}
function dt(ts){return new Date(ts).toLocaleString([],{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}
function d0(ts){return new Date(ts).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}
function need(){if(!sb)throw new Error("The site isn't connected to its database yet. Add your Supabase keys to config.js.")}
function ok(r){if(r.error)throw new Error(r.error.message||"Something went wrong");return r.data}
function rpc(n,a){need();return sb.rpc(n,a||{}).then(ok)}
function notice(){return '<h1>Almost ready</h1><p class="sumline">The site isn’t connected to its database yet. Add your Supabase URL and anon key to <code>config.js</code>, then run <code>supabase-setup.sql</code>. Step-by-step instructions are in <code>SETUP.md</code>.</p>'}
async function ensureProfile(user){
  var r=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if(r.error)throw new Error(r.error.message);
  if(r.data)return r.data;
  var m=user.user_metadata||{},role=m.role==="pro"?"pro":"client",name=String(m.name||user.email.split("@")[0]).trim(),
  p={id:user.id,role:role,name:name,email:user.email,phone:m.phone||null};
  ok(await sb.from("profiles").insert(p));
  if(role==="pro")ok(await sb.from("pros").insert({id:user.id,name:name,biz:m.biz||name,bio:m.bio||"",services:m.services||[],zip_prefixes:m.prefixes||[]}));
  return p}
async function boot(){
  if(!sb)return{ready:false};
  var s=(await sb.auth.getSession()).data.session;
  if(!s)return{ready:true,user:null};
  return{ready:true,user:s.user,profile:await ensureProfile(s.user)}}
async function signUp(role,f){
  need();
  var r=await sb.auth.signUp({email:f.email,password:f.password,options:{data:Object.assign({role:role,name:f.name,phone:f.phone||""},f.pro||{})}});
  if(r.error)throw new Error(r.error.message);
  var u=r.data.user;
  if(u&&u.identities&&!u.identities.length)throw new Error("An account with this email already exists. Log in instead.");
  if(r.data.session)return{session:true,profile:await ensureProfile(r.data.user)};
  return{session:false}}
async function signIn(email,password){
  need();var r=await sb.auth.signInWithPassword({email:email,password:password});
  if(r.error)throw new Error(r.error.message==="Invalid login credentials"?"Email or password is incorrect.":r.error.message);
  return ensureProfile(r.data.user)}
async function signOut(){need();await sb.auth.signOut()}
// Booking draft: kept in this browser until the client has an account (e.g. while confirming their email)
function saveDraft(D){try{localStorage.setItem("hkc.draft",JSON.stringify(D))}catch(e){}}
function submitRequest(D){return rpc("submit_request",{p_svc:D.svc,p_details:[].concat(D.q||[]),p_timing:D.when||"",p_freq:D.freq||"",p_notes:D.det||"",p_zip:D.zip})}
async function flushDraft(){
  var d=null;try{d=JSON.parse(localStorage.getItem("hkc.draft"))}catch(e){}
  if(!d||!d.svc)return null;
  var id=await submitRequest(d);try{localStorage.removeItem("hkc.draft")}catch(e){}return id}
async function proRow(){var s=(await sb.auth.getSession()).data.session;return ok(await sb.from("pros").select("*").eq("id",s.user.id).maybeSingle())}
function onChange(tables,cb){
  if(!sb)return function(){};
  var ch=sb.channel("c"+Math.random().toString(36).slice(2));
  tables.forEach(function(t){ch.on("postgres_changes",{event:"*",schema:"public",table:t},function(){cb()})});
  ch.subscribe();return function(){sb.removeChannel(ch)}}
var H={SV:SV,ready:ready,esc:esc,stars:stars,pz:pz,fz:fz,dt:dt,d0:d0,rpc:rpc,notice:notice,boot:boot,signUp:signUp,signIn:signIn,signOut:signOut,saveDraft:saveDraft,submitRequest:submitRequest,flushDraft:flushDraft,onChange:onChange,
 request:async function(id){need();return ok(await sb.from("requests").select("*").eq("id",id).maybeSingle())},
 offersFor:async function(id){need();return ok(await sb.from("offers").select("id,status,reviewed,pro_id,created_at,pros(id,name,biz,bio,services,rating,review_count)").eq("request_id",id).order("created_at"))},
 reviewsFor:async function(ids){need();return ids.length?ok(await sb.from("reviews").select("*").in("pro_id",ids).order("created_at",{ascending:false})):[]},
 myRequests:async function(){need();return ok(await sb.from("requests").select("id,svc,zip,timing,freq,notes,details,created_at,offers(id,status,reviewed,pro_id,pros(id,name,biz,rating,review_count))").order("created_at",{ascending:false}))},
 messages:async function(req,pro){need();var q=sb.from("messages").select("*").order("created_at");if(req)q=q.eq("request_id",req);if(pro)q=q.eq("pro_id",pro);return ok(await q)},
 sendMessage:function(req,pro,body){return rpc("send_message",{p_request:req,p_pro:pro,p_body:body})},
 requestQuotes:function(req,pros){return rpc("request_quotes",{p_request:req,p_pros:pros})},
 respond:function(offer,yes){return rpc("respond_offer",{p_offer:offer,p_accept:yes})},
 review:function(req,pro,r,t){return rpc("post_review",{p_request:req,p_pro:pro,p_rating:r,p_body:t||""})},
 leads:function(){return rpc("pro_leads")},
 billing:async function(action,body){need();
  var r=await sb.functions.invoke("billing",{body:Object.assign({action:action},body||{})});
  if(r.error){var m=r.error.message;try{var j=await r.error.context.json();if(j&&j.error)m=j.error}catch(x){}throw new Error(m)}
  if(r.data&&r.data.error)throw new Error(r.data.error);return r.data},
 proRow:proRow,
 myReviews:async function(){var p=await proRow();return ok(await sb.from("reviews").select("*").eq("pro_id",p.id).order("created_at",{ascending:false}))},
 charges:async function(){need();return ok(await sb.from("charges").select("id,amount,created_at,requests(svc)").order("created_at",{ascending:false}))},
 updateProfile:async function(uid,f){need();ok(await sb.from("profiles").update({name:f.name,phone:f.phone||null}).eq("id",uid))},
 updatePro:async function(uid,o){need();ok(await sb.from("pros").update(o).eq("id",uid))},
 authHtml:function(role){
  var pro=role==="pro";
  return '<div class="tabs" role="group" aria-label="Account"><button type="button" class="btn alt sm" data-t="in" aria-pressed="true">Log in</button><button type="button" class="btn alt sm" data-t="up" aria-pressed="false">Create account</button></div>'
  +'<form id="fin" class="cardx" novalidate><h2>Log in</h2><label for="li-e">Email</label><input id="li-e" type="email" autocomplete="email"><label for="li-p">Password</label><input id="li-p" type="password" autocomplete="current-password"><p class="err" role="alert"></p><button class="btn">Log in</button></form>'
  +'<form id="fup" class="cardx" hidden novalidate><h2>'+(pro?"Create your pro account":"Create your account")+'</h2>'
  +'<label for="su-n">Your name</label><input id="su-n" autocomplete="name">'
  +(pro?'<label for="su-b">Business name</label><input id="su-b">':'')
  +'<label for="su-e">Email</label><input id="su-e" type="email" autocomplete="email"><label for="su-ph">Phone</label><input id="su-ph" type="tel" autocomplete="tel" required><label for="su-p">Password (8+ characters)</label><input id="su-p" type="password" autocomplete="new-password">'
  +(pro?'<fieldset><legend>Services you offer</legend>'+SV.map(function(s){return'<label class="ck"><input type="checkbox" name="svc" value="'+esc(s)+'"> '+esc(s)+'</label>'}).join("")+'</fieldset><label for="su-z">Areas you serve</label><input id="su-z" placeholder="ZIP codes or 3-digit prefixes, e.g. 90210, 900-918"><p class="sumline" style="margin:.3rem 0 1rem;font-size:.85rem">You can type full 5-digit ZIP codes (e.g. 90210, 90001). Matching uses the first 3 digits, so each one covers its whole area, and the saved list shows as 3 digits (e.g. 902, 900). Ranges work too: 900-918.</p><label for="su-bio">About you</label><textarea id="su-bio"></textarea>':'')
  +'<p class="err" role="alert"></p><button class="btn">Create account</button></form>'},
 bindAuth:function(root,role,done){
  var fin=root.querySelector("#fin"),fup=root.querySelector("#fup"),pro=role==="pro";
  root.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){
    var up=b.dataset.t==="up";fin.hidden=up;fup.hidden=!up;
    root.querySelectorAll("[data-t]").forEach(function(x){x.setAttribute("aria-pressed",x===b)})})});
  function run(form,fn){form.addEventListener("submit",function(ev){ev.preventDefault();
    var er=form.querySelector(".err"),btn=form.querySelector(".btn");er.textContent="";btn.disabled=true;
    fn(er).then(function(){btn.disabled=false}).catch(function(x){er.textContent=x.message;btn.disabled=false})})}
  run(fin,async function(er){
    var e=root.querySelector("#li-e").value.trim(),p=root.querySelector("#li-p").value;
    if(!e||!p)throw new Error("Enter your email and password.");
    var prof=await signIn(e,p);
    if(prof.role!==role){await signOut();throw new Error(pro?"This is a client account. Log in on the client page instead.":"This is a pro account. Log in on the pro page instead.")}
    done(prof)});
  run(fup,async function(er){
    var g=function(i){return root.querySelector("#"+i).value.trim()},f={name:g("su-n"),email:g("su-e"),phone:g("su-ph"),password:root.querySelector("#su-p").value};
    if(!f.name)throw new Error("Enter your name.");
    if(!/^\S+@\S+\.\S+$/.test(f.email))throw new Error("Enter a valid email address.");
    if(f.phone.replace(/\D/g,"").length<10)throw new Error("Enter a valid phone number (at least 10 digits).");
    if(f.password.length<8)throw new Error("Use a password with at least 8 characters.");
    if(pro){
      var s=[].slice.call(root.querySelectorAll("input[name=svc]:checked")).map(function(x){return x.value}),z=pz(g("su-z"));
      if(!g("su-b"))throw new Error("Enter your business name.");
      if(!s.length)throw new Error("Choose at least one service.");
      if(!z.length)throw new Error("Enter at least one ZIP code or prefix you serve.");
      f.pro={biz:g("su-b"),bio:g("su-bio"),services:s,prefixes:z}}
    var r=await signUp(role,f);
    if(r.session)done(r.profile);
    else er.textContent="Almost there. Check your email to confirm your account, then log in here."})}
};
w.HKC=H})(window);
