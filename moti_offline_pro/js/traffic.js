window.MOTITraffic=(function(){
const cars=[];let timer=25;
const rnd=(a,b)=>a+Math.random()*(b-a);
function spawn(){
 const horiz=Math.random()<.5,dir=Math.random()<.5?-1:1, V=MOTIWorld.vertical,H=MOTIWorld.horizontal;
 const col=["#d84c3d","#4283bd","#dda532","#5aa06a","#e4e4e4","#686f79"][(Math.random()*6)|0];
 if(horiz){const y=H[(Math.random()*H.length)|0]+(dir>0?40:-40);cars.push({x:dir>0?-100:MOTIWorld.world.w+100,y,a:dir>0?0:Math.PI,s:rnd(1.3,2.2),col})}
 else{const x=V[(Math.random()*V.length)|0]+(dir>0?-40:40);cars.push({x,y:dir>0?-100:MOTIWorld.world.h+100,a:dir>0?Math.PI/2:-Math.PI/2,s:rnd(1.3,2.2),col})}
}
function update(){
 if(--timer<=0){spawn();timer=35+Math.random()*40}
 cars.forEach(car=>{
  if(car.a===0||Math.abs(car.a-Math.PI)<.01){for(const x of MOTIWorld.vertical)if(Math.abs(car.x-x)<3&&Math.random()<.018){car.a=Math.random()<.5?Math.PI/2:-Math.PI/2;break}}
  else for(const y of MOTIWorld.horizontal)if(Math.abs(car.y-y)<3&&Math.random()<.018){car.a=Math.random()<.5?0:Math.PI;break}
  car.x+=Math.cos(car.a)*car.s;car.y+=Math.sin(car.a)*car.s;
  const p=MOTIPlayer.p;
  if(p.inv<=0&&Math.hypot(p.x-car.x,p.y-car.y)<38){p.inv=55;p.hp-=25;p.s=-1;MOTIAudio.crash();MOTIGame.toast("💥 ¡CHOQUE!");if(p.hp<=0)MOTIGame.end()}}
 );
 for(let i=cars.length-1;i>=0;i--)if(cars[i].x<-180||cars[i].x>MOTIWorld.world.w+180||cars[i].y<-180||cars[i].y>MOTIWorld.world.h+180)cars.splice(i,1);
}
return{cars,update,reset:()=>{cars.length=0;timer=20}};
})();
