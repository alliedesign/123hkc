(function(){
var H=HKC,e=H.esc,$=function(i){return document.getElementById(i)},A=$("app"),dlg=$("dlg"),
id=new URLSearchParams(location.search).get("id")||localStorage.getItem("hkc.last"),cur=null,sel={},more={},
ST={offered:"Not contacted yet",requested:"Quote requested",accepted:"Accepted. Chat is open",declined:"Not available"};
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){t.style.display="none"},3000)}
function ctx(){var d=H.load();return{d:d,r:d.requests.filter(function(x){return x.id===id})[0]}}
function render(){
  var c=ctx(),d=c.d,r=c.r;
  if(!r){A.innerHTML='<h1>We couldn’t find that request</h1><p class="sumline">Start a new request to see your matched pros.</p><a class="btn" href="/?start=1">Get started</a>';return}
  var os=d.offers.filter(function(o){return o.reqId===r.id}),n=os.filter(function(o){return sel[o.proId]}).length;
  var h='<h1>Your '+os.length+' recommended pros</h1><p class="sumline">'+e(r.svc+" · ZIP "+r.zip+" · "+r.when+" · "+r.freq)+'</p><p>Message a pro, or ask for quotes from one, several or all of them. Each pro sets their own price.</p><div class="bar2"><button class="btn" data-a="all">Request quotes from all '+os.length+'</button><button class="btn alt" data-a="some"'+(n?'':' disabled')+'>Request from selected ('+n+')</button></div>';
  os.forEach(function(o){
    var p=d.pros.filter(function(x){return x.id===o.proId})[0],rv=more[p.id]?p.reviews:p.reviews.slice(0,1);
    h+='<article class="pro"><div class="av" aria-hidden="true">'+e(p.name.charAt(0))+'</div><div><h2>'+e(p.name)+'</h2><div class="biz">'+e(p.biz)+'</div><div>'+(p.count?H.stars(p.rating)+' <strong>'+p.rating.toFixed(1)+'</strong> ('+p.count+' reviews)':'<span class="badge">New pro</span>')+(o.near?'':' <span class="badge">Also serves nearby</span>')+'</div><div class="chips">'+p.svc.slice(0,4).map(function(s){return'<span class="chip">'+e(s)+'</span>'}).join("")+'</div><p>'+e(p.bio)+'</p>'
    +rv.map(function(v){return'<div class="rev">'+H.stars(v.r)+' <strong>'+e(v.name)+'</strong> · '+e(v.d)+'<br>'+e(v.t)+'</div>'}).join("")
    +(p.reviews.length>1?'<button class="link" data-a="more" data-p="'+p.id+'">'+(more[p.id]?'Show fewer reviews':'See more reviews')+'</button>':'')
    +(o.status==="accepted"&&!o.reviewed?'<form data-a="rv" data-p="'+p.id+'" class="rev"><label for="r'+p.id+'">Rate '+e(p.name)+' (stars)</label><select id="r'+p.id+'" name="r"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select><label for="t'+p.id+'">Review</label><textarea id="t'+p.id+'" name="t" placeholder="How did it go?"></textarea><button class="btn sm">Post review</button></form>':'')
    +'</div><div class="act"><label class="ck"><input type="checkbox" data-a="sel" data-p="'+p.id+'"'+(sel[p.id]?' checked':'')+(o.status!=="offered"?' disabled':'')+'> Select</label><span class="badge">'+ST[o.status]+'</span><button class="btn sm" data-a="msg" data-p="'+p.id+'">Message</button>'+(o.status==="offered"?'<button class="btn alt sm" data-a="req" data-p="'+p.id+'">Request quote</button>':'')+'</div></article>'});
  A.innerHTML=h+'<p class="biz" style="margin-top:2rem">Demo: pros and reviews are sample data stored in this browser. <button class="link" data-a="reset">Reset demo data</button></p>'}
function paint(){
  var c=ctx(),d=c.d,pr=d.pros.filter(function(x){return x.id===cur})[0],o=d.offers.filter(function(x){return x.reqId===c.r.id&&x.proId===cur})[0],
  ms=d.msgs.filter(function(m){return m.reqId===c.r.id&&m.proId===cur});
  $("dt").textContent=pr.name+" · "+pr.biz;$("ct").disabled=o.status==="declined";
  $("chat").innerHTML=(ms.length?ms.map(function(m){return'<div class="m '+(m.from==="client"?"me":"th")+'">'+e(m.text)+'</div>'}).join(""):'<p class="biz">No messages yet. Say hello and describe your job.</p>')
   +'<p class="biz">'+({offered:"Sending a message also sends your request to this pro.",requested:"This pro can reply once they accept your request.",declined:"This pro isn’t available for this job.",accepted:""})[o.status]+'</p>';
  $("chat").scrollTop=1e6}
A.addEventListener("click",function(ev){
  var b=ev.target.closest("[data-a]");if(!b||b.tagName==="FORM"||b.type==="checkbox")return;
  var a=b.dataset.a,p=b.dataset.p,c=ctx(),r=c.r;
  if(a==="reset"){H.reset();location.href="/";return}
  if(a==="more"){more[p]=!more[p]}
  else if(a==="msg"){cur=p;paint();dlg.showModal();$("ct").focus();return}
  else if(a==="req"){H.contact(r.id,[p]);toast("Quote requested")}
  else if(a==="all"||a==="some"){
    var ids=c.d.offers.filter(function(o){return o.reqId===r.id&&o.status==="offered"&&(a==="all"||sel[o.proId])}).map(function(o){return o.proId});
    if(!ids.length){toast("You’ve already contacted these pros");return}
    H.contact(r.id,ids);sel={};toast("Quotes requested from "+ids.length+" pro"+(ids.length>1?"s":""))}
  render()});
A.addEventListener("change",function(ev){var b=ev.target;if(b.dataset.a==="sel"){sel[b.dataset.p]=b.checked;render()}});
A.addEventListener("submit",function(ev){var f=ev.target;if(f.dataset.a!=="rv")return;ev.preventDefault();
  H.review(f.dataset.p,ctx().r.id,+f.elements.r.value,f.elements.t.value.trim(),ctx().r.name.split(" ")[0]);toast("Thanks for your review");render()});
$("cf").addEventListener("submit",function(ev){ev.preventDefault();var v=$("ct").value.trim();if(!v||!cur)return;H.msg(ctx().r.id,cur,"client",v);$("ct").value="";paint();render()});
$("dx").addEventListener("click",function(){dlg.close()});
window.addEventListener("storage",function(){render();if(dlg.open)paint()});
render()})();
