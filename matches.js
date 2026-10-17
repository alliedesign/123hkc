(async function(){
"use strict";
var H=HKC,e=H.esc,$=function(i){return document.getElementById(i)},A=$("app"),id=null,req=null,offers=[],revs={},sel={},more={},busy=false,
ST={offered:"Not contacted yet",requested:"Waiting for pro to respond",accepted:"Accepted. Chat is open",declined:"Not available for this job"};
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){t.style.display="none"},3500)}
function login(msg){A.innerHTML='<h1>'+msg+'</h1><p class="sumline">Log in or create a free client account to see your matched pros and message them.</p><a class="btn" href="/account/?next='+encodeURIComponent(location.pathname+location.search)+'">Log in or create account</a>'}
async function load(){
  req=await H.request(id);if(!req)return false;
  offers=await H.offersFor(id);
  var rs=await H.reviewsFor(offers.map(function(o){return o.pro_id}));revs={};rs.forEach(function(r){(revs[r.pro_id]=revs[r.pro_id]||[]).push(r)});
  return true}
function render(){
  var os=offers,n=os.filter(function(o){return sel[o.pro_id]&&o.status==="offered"}).length,left=os.filter(function(o){return o.status==="offered"}).length,
  h='<p><a href="/account/">← All my jobs</a></p><h1>'+(os.length?'Your '+os.length+' recommended pro'+(os.length>1?'s':''):'No pros available yet')+'</h1><p class="sumline">'+e(req.svc+" · ZIP "+req.zip+" · "+(req.timing||"")+" · "+(req.freq||""))+'</p>';
  if(!os.length){A.innerHTML=h+'<p>We don’t have a pro for this service in ZIP '+e(req.zip)+' yet. Your request is saved in your account. Try again soon, or <a href="/?start=1">start a new request</a> for a nearby ZIP code.</p>';return}
  h+='<p>Ask for quotes from one, several or all of them. Each pro sets their own price. Messaging opens once a pro accepts your request, and they only see your contact details then.</p><div class="bar2"><button class="btn" data-a="all"'+(left?'':' disabled')+'>Request quotes from all'+(left?' ('+left+')':'')+'</button><button class="btn alt" data-a="some"'+(n?'':' disabled')+'>Request from selected ('+n+')</button></div>';
  os.forEach(function(o){
    var p=o.pros,rv=revs[p.id]||[],shown=more[p.id]?rv:rv.slice(0,1);
    h+='<article class="pro"><div class="av" aria-hidden="true">'+e(p.name.charAt(0))+'</div><div><h2>'+e(p.name)+'</h2><div class="biz">'+e(p.biz)+'</div><div>'+(p.review_count?H.stars(p.rating)+' <strong>'+Number(p.rating).toFixed(1)+'</strong> ('+p.review_count+' review'+(p.review_count>1?'s':'')+')':'<span class="badge">New pro</span>')+'</div><div class="chips">'+p.services.slice(0,4).map(function(s){return'<span class="chip">'+e(s)+'</span>'}).join("")+'</div><p>'+e(p.bio)+'</p>'
    +shown.map(function(v){return'<div class="rev">'+H.stars(v.rating)+' <strong>'+e(v.author)+'</strong> · '+e(H.d0(v.created_at))+(v.body?'<br>'+e(v.body):'')+'</div>'}).join("")
    +(rv.length>1?'<button class="link" data-a="more" data-p="'+p.id+'">'+(more[p.id]?'Show fewer reviews':'See all '+rv.length+' reviews')+'</button>':'')
    +(o.status==="accepted"&&!o.reviewed?'<form data-a="rv" data-p="'+p.id+'" class="rev"><label for="r'+p.id+'">Rate '+e(p.name)+'</label><select id="r'+p.id+'" name="r"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><label for="t'+p.id+'">Review</label><textarea id="t'+p.id+'" name="t" placeholder="How did it go?"></textarea><p class="err" role="alert"></p><button class="btn sm">Post review</button></form>':'')
    +'</div><div class="act"><label class="ck"><input type="checkbox" data-a="sel" data-p="'+p.id+'"'+(sel[p.id]?' checked':'')+(o.status!=="offered"?' disabled':'')+'> Select</label><span class="badge">'+ST[o.status]+'</span>'+(o.status==="accepted"?'<button class="btn sm" data-a="msg" data-p="'+p.id+'">Message</button>':'')+(o.status==="offered"?'<button class="btn alt sm" data-a="req" data-p="'+p.id+'">Request quote</button>':'')+'</div></article>'});
  A.innerHTML=h}
async function refresh(){if(busy)return;try{await load();render()}catch(x){}}
async function act(fn,ok){if(busy)return;busy=true;try{await fn();busy=false;await load();render();if(ok)toast(ok)}catch(x){busy=false;toast(x.message)}}
A.addEventListener("click",function(ev){
  var b=ev.target.closest("[data-a]");if(!b||b.tagName==="FORM"||b.type==="checkbox")return;
  var a=b.dataset.a,p=b.dataset.p;
  if(a==="more"){more[p]=!more[p];render()}
  else if(a==="msg"){var o=offers.filter(function(x){return x.pro_id===p})[0];
    H.chat.open({req:id,pro:p,role:"client",title:o.pros.name+" · "+o.pros.biz,canSend:o.status==="accepted",note:"",onSent:refresh})}
  else if(a==="req")act(function(){return H.requestQuotes(id,[p])},"Quote requested");
  else{var ids=offers.filter(function(o){return o.status==="offered"&&(a==="all"||sel[o.pro_id])}).map(function(o){return o.pro_id});
    if(!ids.length)return;sel={};act(function(){return H.requestQuotes(id,ids)},"Quotes requested from "+ids.length+" pro"+(ids.length>1?"s":""))}});
A.addEventListener("change",function(ev){var b=ev.target;if(b.dataset.a==="sel"){sel[b.dataset.p]=b.checked;render()}});
A.addEventListener("submit",function(ev){var f=ev.target;if(f.dataset.a!=="rv")return;ev.preventDefault();
  act(function(){return H.review(id,f.dataset.p,+f.elements.r.value,f.elements.t.value.trim())},"Thanks for your review")});
document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh()});
if(!H.ready){A.innerHTML=H.notice();return}
try{
  var b=await H.boot();
  if(!b.user){login("Log in to see your matches");return}
  if(b.profile.role!=="client"){A.innerHTML='<h1>This is a pro account</h1><p class="sumline">Matches are shown to clients. Open the pro portal to manage your requests.</p><a class="btn" href="/pro/">Go to pro portal</a>';return}
  var q=new URLSearchParams(location.search);id=q.get("id");
  var d=await H.flushDraft();if(d){id=d;history.replaceState(null,"","/matches/?id="+d)}
  if(!id){A.innerHTML='<h1>No request selected</h1><p class="sumline">Pick a job from your account, or start a new request.</p><a class="btn" href="/account/">My jobs</a>';return}
  if(!(await load())){A.innerHTML='<h1>We couldn’t find that request</h1><p class="sumline">It may belong to a different account.</p><a class="btn" href="/account/">My jobs</a>';return}
  render();H.onChange(["offers"],refresh)
}catch(x){A.innerHTML='<h1>Something went wrong</h1><p class="sumline">'+e(x.message)+'</p><a class="btn" href="/account/">My jobs</a>'}
})();
