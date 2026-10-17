(function(){
var H=HKC,e=H.esc,$=function(i){return document.getElementById(i)},A=$("app"),tab="leads",selO=null,PS={requested:"New request",accepted:"Accepted",declined:"Declined"};
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){t.style.display="none"},3000)}
function tm(ts){return new Date(ts).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function me(d){var i=localStorage.getItem("hkc.pro");return d.pros.filter(function(p){return p.id===i})[0]}
function fields(p){p=p||{};return'<label for="fn">Your name</label><input id="fn" value="'+e(p.name)+'"><label for="fb">Business name</label><input id="fb" value="'+e(p.biz)+'"><label for="fe">Email</label><input id="fe" type="email" value="'+e(p.email)+'"><fieldset><legend>Services you offer</legend>'+H.SV.map(function(s){return'<label class="ck"><input type="checkbox" name="svc" value="'+e(s)+'"'+(p.svc&&p.svc.indexOf(s)>-1?' checked':'')+'> '+e(s)+'</label>'}).join("")+'</fieldset><label for="fz">Areas you serve</label><input id="fz" value="'+e(p.zips?H.fz(p.zips):"")+'" placeholder="ZIP codes or 3-digit prefixes, e.g. 900-918, 926"><label for="fp">About you</label><textarea id="fp">'+e(p.bio)+'</textarea><p class="err" role="alert"></p>'}
function read(){
  var s=[].slice.call(document.querySelectorAll("input[name=svc]:checked")).map(function(x){return x.value}),z=H.pz($("fz").value),er=document.querySelector(".err"),
  o={name:$("fn").value.trim(),biz:$("fb").value.trim(),email:$("fe").value.trim(),svc:s,zips:z,bio:$("fp").value.trim()};
  if(!o.name||!o.biz||!/^\S+@\S+\.\S+$/.test(o.email)){er.textContent="Enter your name, business and a valid email.";return null}
  if(!s.length){er.textContent="Choose at least one service.";return null}
  if(!z.length){er.textContent="Enter at least one ZIP code or prefix you serve.";return null}
  return o}
function auth(d){return'<h1>Home Key Clean for pros</h1><p class="sumline">Get matched with customers on a fair rotation. You set your own prices and pay $20 only when you accept a request. Declining is free.</p><div class="two2"><form id="su" class="cardx"><h2>Create your pro account</h2>'+fields()+'<button class="btn">Create account</button></form><div class="cardx"><h2>Try a demo pro</h2><p>Explore the pro side with sample accounts. Customer requests made in this browser will show up here.</p><label for="dp">Demo pro</label><select id="dp">'+d.pros.map(function(p){return'<option value="'+p.id+'">'+e(p.name+" · "+p.biz)+'</option>'}).join("")+'</select><div class="bar2"><button class="btn" type="button" data-a="demo">Open demo account</button></div></div></div>'}
function dash(d,p){
  var os=d.offers.filter(function(o){return o.proId===p.id&&o.status!=="offered"}).sort(function(a,b){return b.ts-a.ts}),
  rq=function(o){return d.requests.filter(function(r){return r.id===o.reqId})[0]},
  spent=d.ledger.filter(function(l){return l.proId===p.id}).length*20,nw=os.filter(function(o){return o.status==="requested"}).length,
  cur=os.filter(function(o){return o.id===selO})[0]||os[0];
  var h='<div class="row"><div><h1>'+e(p.biz)+'</h1><div class="biz">'+e(p.name)+' · '+(p.count?H.stars(p.rating)+' '+p.rating.toFixed(1)+' ('+p.count+' reviews)':'New pro')+'</div></div><button class="btn alt sm" data-a="out">Log out</button></div>'
  +'<div class="stats">'+[["Shown to customers",p.shown],["Requests received",os.length],["Accepted",os.filter(function(o){return o.status==="accepted"}).length],["Spent on requests","$"+spent]].map(function(s){return'<div class="stat"><b>'+s[1]+'</b>'+s[0]+'</div>'}).join("")+'</div>'
  +'<div class="tabs" role="group" aria-label="Sections">'+[["leads","Requests"+(nw?" ("+nw+")":"")],["msgs","Messages"],["prof","Profile"],["revs","Reviews"],["bill","Billing"]].map(function(t){return'<button class="btn alt sm" data-a="tab" data-t="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+'</button>'}).join("")+'</div>';
  if(tab==="leads")h+=os.length?os.map(function(o){var r=rq(o);return'<article class="cardx"><div class="row"><h3>'+e(r.svc)+'</h3><span class="badge">'+PS[o.status]+'</span></div><p>'+e([].concat(r.q||[]).join(", "))+'</p><p class="biz">'+e(r.name.split(" ")[0])+' · ZIP '+e(r.zip)+' · '+e(r.when)+' · '+e(r.freq)+' · '+tm(o.ts)+'</p>'+(r.det?'<p>“'+e(r.det)+'”</p>':'')
    +(o.status==="accepted"?'<p><strong>Contact:</strong> '+e(r.name)+' · '+e(r.email)+(r.phone?' · '+e(r.phone):'')+'</p>':'<p class="biz">Customer contact details unlock when you accept.</p>')
    +'<div class="bar2"><button class="btn alt sm" data-a="open" data-o="'+o.id+'">Open messages</button>'+(o.status==="requested"?'<button class="btn sm" data-a="acc" data-o="'+o.id+'">Accept for $20</button><button class="btn alt sm" data-a="dec" data-o="'+o.id+'">Decline (free)</button>':'')+'</div></article>'}).join(""):'<p class="cardx">No requests yet. When a customer contacts you, it will show up here.</p>';
  else if(tab==="msgs"){
    if(!cur)h+='<p class="cardx">No messages yet.</p>';
    else{var ms=d.msgs.filter(function(m){return m.reqId===cur.reqId&&m.proId===p.id});
      h+='<div class="msgs"><div>'+os.map(function(o){return'<button class="btn alt sm" style="width:100%;margin-bottom:.5rem;text-align:left" data-a="open" data-o="'+o.id+'" aria-pressed="'+(o===cur)+'">'+e(rq(o).name.split(" ")[0]+" · "+rq(o).svc)+'</button>'}).join("")+'</div><div class="cardx" style="margin-top:0"><div class="chat">'+ms.map(function(m){return'<div class="m '+(m.from==="pro"?"me":"th")+'">'+e(m.text)+'</div>'}).join("")+'</div>'
      +(cur.status==="accepted"?'<form id="rf" data-o="'+cur.id+'"><label class="sr" for="rt">Reply</label><input id="rt" autocomplete="off" placeholder="Reply to '+e(rq(cur).name.split(" ")[0])+'"><button class="btn sm">Send</button></form>':cur.status==="declined"?'<p class="biz">You declined this request.</p>':'<p class="biz">Accept this request to reply and see contact details.</p><button class="btn sm" data-a="acc" data-o="'+cur.id+'">Accept for $20</button>')+'</div></div>'}}
  else if(tab==="prof")h+='<form id="pf" class="cardx">'+fields(p)+'<button class="btn">Save profile</button><p class="biz">Customers are matched on a fair rotation, so every pro gets shown. A complete profile and good reviews help you win the job.</p></form>';
  else if(tab==="revs")h+=(p.reviews.length?p.reviews.map(function(v){return'<div class="cardx">'+H.stars(v.r)+' <strong>'+e(v.name)+'</strong> · '+e(v.d)+'<p>'+e(v.t)+'</p></div>'}).join(""):'<p class="cardx">No reviews yet. Reviews appear after customers rate completed jobs.</p>');
  else h+='<div class="cardx"><h2>Billing</h2><p>$20 per accepted request. Total: <strong>$'+spent+'</strong>. Demo: no real payment is taken.</p>'+(spent?'<table><tr><th>Date</th><th>Job</th><th>Charge</th></tr>'+d.ledger.filter(function(l){return l.proId===p.id}).map(function(l){var r=d.requests.filter(function(x){return x.id===l.reqId})[0];return'<tr><td>'+tm(l.ts)+'</td><td>'+e(r?r.svc:"Request")+'</td><td>$'+l.amount+'</td></tr>'}).join("")+'</table>':'')+'</div>';
  return h+'<p class="biz" style="margin-top:2rem">Demo data is stored in this browser. <button class="link" data-a="reset">Reset demo data</button></p>'}
function render(){var d=H.load(),p=me(d);A.innerHTML=p?dash(d,p):auth(d);var i=$("rt");if(i)document.querySelector(".chat").scrollTop=1e6}
A.addEventListener("click",function(ev){
  var b=ev.target.closest("[data-a]");if(!b||b.tagName==="FORM")return;var a=b.dataset.a,o=b.dataset.o;
  if(a==="tab")tab=b.dataset.t;
  else if(a==="open"){tab="msgs";selO=o}
  else if(a==="acc"){if(!confirm("Accepting charges $20 to your payment method. Continue?"))return;H.accept(o);toast("Accepted. $20 charged.")}
  else if(a==="dec"){H.decline(o);toast("Declined")}
  else if(a==="out")localStorage.removeItem("hkc.pro");
  else if(a==="demo")localStorage.setItem("hkc.pro",$("dp").value);
  else if(a==="reset"){H.reset();location.reload();return}
  render()});
A.addEventListener("submit",function(ev){var f=ev.target;ev.preventDefault();
  if(f.id==="su"){var o=read();if(!o)return;localStorage.setItem("hkc.pro",H.addPro(o));tab="prof"}
  else if(f.id==="pf"){var o2=read();if(!o2)return;var d=H.load(),p=me(d);Object.assign(p,o2);H.save(d);toast("Profile saved")}
  else if(f.id==="rf"){var v=$("rt").value.trim();if(!v)return;var d2=H.load(),of=d2.offers.filter(function(x){return x.id===f.dataset.o})[0];H.msg(of.reqId,of.proId,"pro",v)}
  render();if($("rt"))$("rt").focus()});
window.addEventListener("storage",render);
render()})();
