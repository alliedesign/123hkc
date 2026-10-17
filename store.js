(function(w){
var K="hkc.v1",SV=["Residential cleaning","Commercial cleaning","Move-in / move-out cleaning","Window cleaning","Pressure washing","Gutter cleaning","Carpet and upholstery cleaning","Air duct and dryer vent cleaning","Lawn care","Pool care"],
NM=["Jen M.","Alex P.","Sam R.","Chris D.","Taylor B.","Jordan L.","Morgan S.","Casey W."],
TX=["Showed up on time and did a great job.","Very thorough and friendly. Would hire again.","Communicated clearly and the price matched the quote.","Our place looks fantastic. Highly recommend.","Careful, professional and quick to reply.","Went above and beyond on the details.","Easy to schedule and great results.","Reliable and fair. We booked again."],
P=[["Maria G.","Sparkle Home Co.",[0,2,6,1,7],"900-918",4.9,212,"Family-run team with 9 years cleaning homes and rentals."],
["James T.","ClearView Window Pros",[3,4,5,0],"900-935",4.8,164,"Streak-free windows and spotless exteriors since 2014."],
["Priya S.","Fresh Start Cleaning",[0,2,1,7],"900-935",4.9,98,"Eco-friendly products and detail-focused deep cleans."],
["Carlos R.","Pacific Pressure & Gutter",[4,5,3,8,9],"900-928",4.7,301,"Driveways, gutters and yards, all done right."],
["Dana W.","Bright Day Cleaners",[0,1,2,3,6,5],"900-935",4.8,76,"Reliable weekly and biweekly service for busy households."],
["Tom H.","Green Lawn & Pool",[8,9,4],"900-935",4.6,143,"Lawn and pool care packages with flexible schedules."],
["Aisha K.","Spotless Spaces",[1,0,2,6,7],"900-935",5.0,41,"Office and home cleaning with after-hours availability."],
["Luis M.","Blue Water Pool Care",[9,8],"919-935",4.9,188,"Weekly pool service, repairs and water balancing."],
["Evelyn C.","PureAir Duct & Vent",[7,0,6,5],"900-935",4.8,127,"Duct, dryer vent and carpet cleaning for healthier homes."],
["Marcus B.","Crown Commercial Cleaning",[1,0,3,4],"900-935",4.7,215,"Commercial crews for offices, retail and restaurants."],
["Hannah L.","Coastal Clean",[0,3,2,9,8],"900-935",4.9,59,"Beach-area homes, windows and pool care."],
["Omar F.","Handy Hands Home Care",[0,5,4,6,8,2,7,9],"900-935",4.8,172,"One crew for the whole list: house, gutters, yard and more."]];
function pz(s){return String(s).split(",").map(function(t){t=t.trim();var m=t.match(/^(\d{3})-(\d{3})$/);if(m)return[+m[1],+m[2]];m=t.match(/^(\d{3})(\d{2})?$/);return m?[+m[1],+m[1]]:null}).filter(Boolean)}
function fz(a){return a.map(function(r){return r[0]==r[1]?r[0]:r[0]+"-"+r[1]}).join(", ")}
function uid(p){return p+Math.random().toString(36).slice(2,9)}
function seed(){var n=Date.now();return{pros:P.map(function(p,i){return{id:"p"+i,name:p[0],biz:p[1],email:"",svc:p[2].map(function(x){return SV[x]}),zips:pz(p[3]),bio:p[6],rating:p[4],count:p[5],shown:0,last:0,reviews:[0,1,2].map(function(k){return{id:"v"+i+k,name:NM[(i*3+k)%8],r:k==2&&i%3==0?4:5,t:TX[(i+k*3)%8],d:new Date(n-(k+1)*864e5*(6+i)).toISOString().slice(0,10)}})}}),requests:[],offers:[],msgs:[],ledger:[]}}
function load(){var d=null;try{d=JSON.parse(localStorage.getItem(K))}catch(e){}if(!d||!d.pros){d=seed();save(d)}return d}
function save(d){try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function stars(r){return '<span class="stars" style="--r:'+(+r)+'" role="img" aria-label="'+(+r).toFixed(1)+' out of 5 stars">★★★★★</span>'}
// Fair rotation: pros who have been shown the least go first, then the longest-waiting.
function submit(q){
  var d=load(),r=Object.assign({id:uid("r"),ts:Date.now()},q),n=+String(q.zip).slice(0,3);
  d.requests.push(r);
  var all=d.pros.filter(function(p){return p.svc.indexOf(q.svc)>-1}),
  cov=function(p){return p.zips.some(function(z){return n>=z[0]&&n<=z[1]})},
  ord=function(a,b){return a.shown-b.shown||a.last-b.last},
  pick=all.filter(cov).sort(ord).concat(all.filter(function(p){return!cov(p)}).sort(ord)).slice(0,5);
  pick.forEach(function(p){p.shown++;p.last=Date.now();d.offers.push({id:uid("o"),reqId:r.id,proId:p.id,status:"offered",near:cov(p),ts:Date.now()})});
  save(d);try{localStorage.setItem("hkc.last",r.id)}catch(e){}return r.id}
function job(r){return"Hi! I’d like a quote for "+r.svc+". "+[].concat(r.q||[]).join(", ")+". Timing: "+r.when+". Frequency: "+r.freq+"."+(r.det?" Notes: "+r.det:"")}
function msg(reqId,proId,from,text){var d=load();d.msgs.push({id:uid("m"),reqId:reqId,proId:proId,from:from,text:text,ts:Date.now()});
  if(from==="client")d.offers.forEach(function(o){if(o.reqId===reqId&&o.proId===proId&&o.status==="offered")o.status="requested"});save(d)}
function contact(reqId,ids){var d=load(),r=d.requests.filter(function(x){return x.id===reqId})[0];save(d);
  ids.forEach(function(p){var has=load().msgs.some(function(m){return m.reqId===reqId&&m.proId===p});msg(reqId,p,"client",has?"I’d like a quote for this job.":job(r))})}
function setO(id,st){var d=load();d.offers.forEach(function(o){if(o.id===id){o.status=st;if(st==="accepted")d.ledger.push({id:uid("l"),proId:o.proId,reqId:o.reqId,amount:20,ts:Date.now()})}});save(d)}
function review(proId,reqId,r,t,name){var d=load(),p=d.pros.filter(function(x){return x.id===proId})[0];
  p.reviews.unshift({id:uid("v"),name:name,r:r,t:t||"",d:new Date().toISOString().slice(0,10)});p.rating=(p.rating*p.count+r)/(p.count+1);p.count++;
  d.offers.forEach(function(o){if(o.reqId===reqId&&o.proId===proId)o.reviewed=true});save(d)}
function addPro(o){var d=load(),p=Object.assign({id:uid("p"),rating:0,count:0,shown:0,last:0,reviews:[]},o);d.pros.push(p);save(d);return p.id}
function reset(){["hkc.v1","hkc.last","hkc.pro"].forEach(function(k){try{localStorage.removeItem(k)}catch(e){}})}
w.HKC={SV:SV,load:load,save:save,esc:esc,stars:stars,pz:pz,fz:fz,submit:submit,contact:contact,msg:msg,accept:function(i){setO(i,"accepted")},decline:function(i){setO(i,"declined")},review:review,addPro:addPro,reset:reset}
})(typeof window!=="undefined"?window:globalThis);
