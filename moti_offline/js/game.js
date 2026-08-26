window.MOTIGame=(function(){
if(!window.MOTIWorld||!window.MOTIPlayer||!window.MOTITraffic||!window.MOTIPedestrians||!window.MOTIMissions||!window.MOTIUI){
  throw new Error("MOTI: faltan módulos. Verifica que todos los archivos JS estén en la carpeta js/");
}
let running=false,last=performance.now(),money=0,deliveries=0;
let W=innerWidth,H=innerHeight;
const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d"),mini=document.getElementById("miniCanvas"),mctx=mini.getContext("2d");
function resize(){W=innerWidth;H=innerHeight;const d=window.devicePixelRatio||1;canvas.width=W*d;canvas.height=H*d;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(d,0,0,d,0,0);mini.width=155;mini.height=108}
addEventListener("resize",resize);resize();
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function round(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function draw(){
 ctx.clearRect(0,0,W,H);ctx.fillStyle="#78a95d";ctx.fillRect(0,0,W,H);const cam=MOTIPlayer.camera;
 ctx.save();ctx.translate(Math.round(W/2-cam.x),Math.round(H/2-cam.y));
 const wo=MOTIWorld;
 wo.roads.forEach(r=>{ctx.fillStyle="#c8bca2";ctx.fillRect(r.x-6,r.y-6,r.w+12,r.h+12);ctx.fillStyle="#414749";ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle="#eee2ad";ctx.lineWidth=2;ctx.setLineDash([18,18]);ctx.beginPath();if(r.type==="h"){ctx.moveTo(r.x,r.y+r.h/2);ctx.lineTo(r.x+r.w,r.y+r.h/2)}else{ctx.moveTo(r.x+r.w/2,r.y);ctx.lineTo(r.x+r.w/2,r.y+r.h)}ctx.stroke();ctx.setLineDash([])});
 wo.buildings.forEach(b=>{ctx.fillStyle="#0003";ctx.fillRect(b.x+7,b.y+8,b.w,b.h);ctx.fillStyle=b.wall;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle=b.roof;ctx.fillRect(b.x+6,b.y+6,b.w-12,b.h-12);ctx.fillStyle="#fff3";for(let x=b.x+20;x<b.x+b.w-15;x+=38)for(let y=b.y+18;y<b.y+b.h-15;y+=32)ctx.fillRect(x,y,12,8)});
 wo.trees.forEach(t=>{ctx.fillStyle="#0003";ctx.beginPath();ctx.ellipse(t.x,t.y+8,t.r*.8,t.r*.35,0,0,7);ctx.fill();ctx.fillStyle="#72503b";ctx.fillRect(t.x-3,t.y-8,6,20);ctx.fillStyle="#3f854b";ctx.beginPath();ctx.arc(t.x,t.y-12,t.r,0,7);ctx.fill()});
 wo.shops.forEach(s=>{ctx.fillStyle="#0003";ctx.fillRect(s.x-34,s.y-28,68,52);ctx.fillStyle="#d88b42";ctx.fillRect(s.x-30,s.y-25,60,43);ctx.fillStyle="#52605f";ctx.fillRect(s.x-34,s.y-32,68,9);ctx.fillStyle="#f4c94e";ctx.fillRect(s.x-25,s.y-20,50,9);ctx.fillStyle="#60402f";ctx.fillRect(s.x-6,s.y-1,12,19)});
 wo.houses.forEach(h=>{ctx.fillStyle="#70a95d";ctx.fillRect(h.x-27,h.y-22,54,45);ctx.fillStyle="#dbc9aa";ctx.fillRect(h.x-21,h.y-16,42,31);ctx.fillStyle="#9f5749";ctx.beginPath();ctx.moveTo(h.x-27,h.y-16);ctx.lineTo(h.x,h.y-34);ctx.lineTo(h.x+27,h.y-16);ctx.closePath();ctx.fill();ctx.fillStyle="#60412f";ctx.fillRect(h.x-5,h.y-1,10,16)});
 MOTIPedestrians.people.forEach(p=>{const w=Math.sin(p.walk);ctx.strokeStyle="#29312d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x-2,p.y+3);ctx.lineTo(p.x-4+w*3,p.y+12);ctx.moveTo(p.x+2,p.y+3);ctx.lineTo(p.x+4-w*3,p.y+12);ctx.stroke();ctx.strokeStyle="#db704e";ctx.beginPath();ctx.moveTo(p.x-4,p.y-3);ctx.lineTo(p.x-9+w*3,p.y+5);ctx.moveTo(p.x+4,p.y-3);ctx.lineTo(p.x+9-w*3,p.y+5);ctx.stroke();ctx.fillStyle="#4f87b9";ctx.fillRect(p.x-5,p.y-7,10,12);ctx.fillStyle="#dca77b";ctx.beginPath();ctx.arc(p.x,p.y-12,5,0,7);ctx.fill()});
 MOTITraffic.cars.forEach(car=>drawCar(car));
 const m=MOTIMissions.current;if(m){const t=m.state==="pickup"?m.shop:m.house;ctx.strokeStyle=m.state==="pickup"?"#ffd34b":"#ff765a";ctx.lineWidth=4;ctx.beginPath();ctx.arc(t.x,t.y,32+Math.sin(performance.now()/180)*6,0,7);ctx.stroke()}
 drawMoto();ctx.restore();drawMini()
}
function drawCar(car){
 const x=car.x,y=car.y;
 ctx.save();ctx.translate(x,y);ctx.rotate(car.a);
 // Car is drawn LONG along the local X axis, so it always points where it moves.
 ctx.fillStyle="#0004";round(-24,-13,48,26,6);ctx.fill();
 ctx.fillStyle=car.col;round(-23,-12,46,24,6);ctx.fill();
 ctx.fillStyle="#243036";round(-7,-9,17,18,4);ctx.fill();
 ctx.fillStyle="#9fcbd3";ctx.fillRect(-4,-7,12,6);ctx.fillRect(-4,1,12,6);
 ctx.fillStyle="#fff1a0";ctx.fillRect(19,-8,4,5);ctx.fillRect(19,3,4,5);
 ctx.fillStyle="#d94343";ctx.fillRect(-23,-8,4,5);ctx.fillRect(-23,3,4,5);
 ctx.fillStyle="#161a1a";ctx.fillRect(-13,-15,9,4);ctx.fillRect(5,-15,9,4);
 ctx.fillRect(-13,11,9,4);ctx.fillRect(5,11,9,4);
 ctx.restore();
}
function drawMoto(){
 const p=MOTIPlayer.p;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
 if(p.inv&&Math.floor(p.inv/5)%2===0)ctx.globalAlpha=.45;

 // Simple, clean top-down delivery motorcycle.
 ctx.fillStyle="#0004";ctx.beginPath();ctx.ellipse(0,8,22,7,0,0,7);ctx.fill();

 // Wheels
 ctx.fillStyle="#151718";
 ctx.beginPath();ctx.ellipse(-16,0,5,13,0,0,7);ctx.fill();
 ctx.beginPath();ctx.ellipse(17,0,5,13,0,0,7);ctx.fill();
 ctx.strokeStyle="#858c88";ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(-16,0,2.5,8,0,0,7);ctx.stroke();
 ctx.beginPath();ctx.ellipse(17,0,2.5,8,0,0,7);ctx.stroke();

 // Green motorcycle body
 ctx.fillStyle="#25d579";round(-12,-9,27,18,8);ctx.fill();
 ctx.fillStyle="#173022";round(-7,-4,15,9,4);ctx.fill();

 // Rider
 ctx.fillStyle="#242b29";ctx.beginPath();ctx.arc(2,-13,6,0,7);ctx.fill();
 ctx.fillStyle="#3b79a9";ctx.beginPath();ctx.arc(2,-14,5,0,7);ctx.fill();

 // Delivery box
 ctx.fillStyle="#d98b35";round(-8,-27,18,12,3);ctx.fill();
 ctx.fillStyle="#ffe28a";ctx.fillRect(-5,-25,12,2);

 // Handlebar / headlight
 ctx.strokeStyle="#252b29";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(11,-7);ctx.lineTo(23,-10);ctx.moveTo(11,7);ctx.lineTo(23,10);ctx.stroke();
 ctx.fillStyle="#fff0a0";ctx.beginPath();ctx.arc(22,0,3.5,0,7);ctx.fill();
 ctx.restore();
}
function drawMini(){const w=155,h=108;mctx.clearRect(0,0,w,h);mctx.fillStyle="#78a95d";mctx.fillRect(0,0,w,h);const sx=w/MOTIWorld.world.w,sy=h/MOTIWorld.world.h;mctx.fillStyle="#41484a";MOTIWorld.roads.forEach(r=>mctx.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy));mctx.fillStyle="#e94d3d";MOTITraffic.cars.forEach(c=>mctx.fillRect(c.x*sx-1,c.y*sy-1,3,3));const m=MOTIMissions.current;if(m){const t=m.state==="pickup"?m.shop:m.house;mctx.fillStyle="#ffd34b";mctx.beginPath();mctx.arc(t.x*sx,t.y*sy,4,0,7);mctx.fill()}mctx.fillStyle="#28d779";mctx.beginPath();mctx.arc(MOTIPlayer.p.x*sx,MOTIPlayer.p.y*sy,4,0,7);mctx.fill()}
function bind(id,down,up){const e=document.getElementById(id);e.addEventListener("pointerdown",x=>{x.preventDefault();e.setPointerCapture?.(x.pointerId);down()});["pointerup","pointercancel","pointerleave"].forEach(ev=>e.addEventListener(ev,x=>{x.preventDefault();up()}))}
function controls(){const i=MOTIPlayer.input;bind("forward",()=>i.forward=true,()=>i.forward=false);bind("reverse",()=>i.reverse=true,()=>i.reverse=false);bind("turnLeft",()=>i.left=true,()=>i.left=false);bind("turnRight",()=>i.right=true,()=>i.right=false);bind("turbo",()=>i.turbo=true,()=>i.turbo=false);document.getElementById("horn").addEventListener("pointerdown",()=>{MOTIAudio.horn();toast("📣 ¡PÍÍÍÍÍ!")});addEventListener("keydown",e=>{if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")i.forward=true;if(e.key==="ArrowDown"||e.key.toLowerCase()==="s")i.reverse=true;if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")i.left=true;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")i.right=true;if(e.code==="Space")i.turbo=true});addEventListener("keyup",e=>{if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")i.forward=false;if(e.key==="ArrowDown"||e.key.toLowerCase()==="s")i.reverse=false;if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")i.left=false;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")i.right=false;if(e.code==="Space")i.turbo=false})}
function start(){MOTIAudio.init();MOTIAudio.start();MOTIPlayer.reset();MOTITraffic.reset();MOTIMissions.reset();money=0;deliveries=0;running=true;document.getElementById("startScreen").classList.add("hidden");document.getElementById("gameOverScreen").classList.add("hidden")}
function end(){running=false;document.getElementById("finalMoney").textContent="$"+money;document.getElementById("finalDeliveries").textContent=deliveries;document.getElementById("gameOverText").textContent=deliveries>=10?"¡Completaste la jornada!":"La moto quedó fuera de servicio.";document.getElementById("gameOverScreen").classList.remove("hidden")}
function toast(t){MOTIUI.toast(t)}
controls();document.getElementById("startButton").onclick=start;document.getElementById("restartButton").onclick=start;
function loop(now){const dt=Math.min(50,now-last);last=now;if(running){MOTIPlayer.update(W,H);MOTITraffic.update();MOTIPedestrians.update();MOTIMissions.update(dt);MOTIUI.update()}draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
return{get money(){return money},set money(v){money=v},get deliveries(){return deliveries},set deliveries(v){deliveries=v},toast,end};
})();
