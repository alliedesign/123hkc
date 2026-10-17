(function(w){
"use strict";
var H=w.HKC,e=H.esc,dlg,st=null,off=null,timer=null;
function build(){
  if(dlg)return;
  dlg=document.createElement("dialog");dlg.setAttribute("aria-labelledby","ct-title");
  dlg.innerHTML='<div class="dh"><h2 id="ct-title"></h2><button class="ghost" id="ct-x" type="button">✕ Close</button></div><div class="chat" id="ct-log" tabindex="0" aria-live="polite"></div><p class="biz" id="ct-note" style="padding:0 1rem"></p><p class="err" id="ct-err" role="alert" style="padding:0 1rem"></p><form id="ct-form"><label class="sr" for="ct-in">Message</label><input id="ct-in" autocomplete="off" maxlength="2000" placeholder="Type a message"><button class="btn sm">Send</button></form>';
  document.body.appendChild(dlg);
  dlg.querySelector("#ct-x").addEventListener("click",function(){dlg.close()});
  dlg.addEventListener("close",stop);
  dlg.querySelector("#ct-form").addEventListener("submit",async function(ev){
    ev.preventDefault();var i=dlg.querySelector("#ct-in"),v=i.value.trim(),er=dlg.querySelector("#ct-err");if(!v||!st)return;
    er.textContent="";i.disabled=true;
    try{await H.sendMessage(st.req,st.pro,v);i.value="";await paint();if(st.onSent)st.onSent()}catch(x){er.textContent=x.message}
    i.disabled=false;i.focus()})}
async function paint(){
  if(!st)return;
  var log=dlg.querySelector("#ct-log"),ms;
  try{ms=await H.messages(st.req,st.pro)}catch(x){return}
  var atEnd=log.scrollHeight-log.scrollTop-log.clientHeight<60;
  log.innerHTML=ms.length?ms.map(function(m){return'<div class="m '+(m.from_role===st.role?"me":"th")+'">'+e(m.body)+'<br><small class="biz">'+e(H.dt(m.created_at))+'</small></div>'}).join(""):'<p class="biz">No messages yet.</p>';
  if(atEnd)log.scrollTop=log.scrollHeight}
function stop(){st=null;if(timer)clearInterval(timer);timer=null;if(off)off();off=null}
H.chat={open:function(o){
  build();st=o;
  dlg.querySelector("#ct-title").textContent=o.title;
  dlg.querySelector("#ct-note").textContent=o.note||"";
  dlg.querySelector("#ct-err").textContent="";
  dlg.querySelector("#ct-in").disabled=!o.canSend;dlg.querySelector("#ct-form .btn").disabled=!o.canSend;
  dlg.showModal();paint().then(function(){var l=dlg.querySelector("#ct-log");l.scrollTop=l.scrollHeight});
  if(o.canSend)dlg.querySelector("#ct-in").focus();
  off=H.onChange(["messages"],paint);timer=setInterval(paint,8000)}}
})(window);
