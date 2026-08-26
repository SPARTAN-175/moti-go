window.MOTIMissions=(function(){
let current=null,time=90;
function newMission(){const s=MOTIWorld.shops[(Math.random()*MOTIWorld.shops.length)|0];let h;do{h=MOTIWorld.houses[(Math.random()*MOTIWorld.houses.length)|0]}while(Math.hypot(s.x-h.x,s.y-h.y)<700);current={shop:s,house:h,state:"pickup",reward:25+((Math.random()*45)|0)};time=90}
function update(dt){
 if(!current)return;
 time-=dt/1000;if(time<=0){MOTIGame.toast("⏱️ Pedido perdido");newMission();return}
 const t=current.state==="pickup"?current.shop:current.house,p=MOTIPlayer.p;
 if(Math.hypot(p.x-t.x,p.y-t.y)<65){
  if(current.state==="pickup"){current.state="delivery";time=90;MOTIAudio.pickup();MOTIGame.toast("📦 ¡PEDIDO RECOGIDO!")}
  else{const reward=current.reward+Math.floor(time*.4);MOTIGame.money+=reward;MOTIGame.deliveries++;MOTIAudio.delivery();MOTIGame.toast("✅ ¡ENTREGADO! +$"+reward);if(MOTIGame.deliveries>=10){MOTIGame.end();return}newMission()}
 }
}
function reset(){newMission()}
return{get current(){return current},get time(){return time},update,reset};
})();
