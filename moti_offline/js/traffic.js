window.MOTITraffic=(function(){
const cars=[];let timer=15;
const rnd=(a,b)=>a+Math.random()*(b-a);
const V=MOTIWorld.vertical,H=MOTIWorld.horizontal;

function spawn(){
  const horizontal=Math.random()<.5, dir=Math.random()<.5?-1:1;
  const col=["#d84c3d","#4283bd","#dda532","#5aa06a","#e4e4e4","#686f79"][(Math.random()*6)|0];

  if(horizontal){
    const y=H[(Math.random()*H.length)|0]+(dir>0?42:-42);
    cars.push({x:dir>0?-100:MOTIWorld.world.w+100,y,a:dir>0?0:Math.PI,s:rnd(1.35,2.05),col,axis:"h",dir,turning:false,turnAt:V[(Math.random()*V.length)|0]});
  }else{
    const x=V[(Math.random()*V.length)|0]+(dir>0?-42:42);
    cars.push({x,y:dir>0?-100:MOTIWorld.world.h+100,a:dir>0?Math.PI/2:-Math.PI/2,s:rnd(1.35,2.05),col,axis:"v",dir,turning:false,turnAt:H[(Math.random()*H.length)|0]});
  }
}

function turnAtIntersection(car){
  if(car.turning)return;
  if(car.axis==="h"){
    const ix=car.turnAt;
    if(Math.abs(car.x-ix)<2.5){
      if(Math.random()<0.55){
        car.axis="v";
        car.a=car.dir>0?Math.PI/2:-Math.PI/2;
        car.turnAt=H[(Math.random()*H.length)|0];
        car.turning=true;
        setTimeout(()=>car.turning=false,250);
      }else{
        car.turnAt=V[(Math.random()*V.length)|0];
      }
    }
  }else{
    const iy=car.turnAt;
    if(Math.abs(car.y-iy)<2.5){
      if(Math.random()<0.55){
        car.axis="h";
        car.a=car.dir>0?0:Math.PI;
        car.turnAt=V[(Math.random()*V.length)|0];
        car.turning=true;
        setTimeout(()=>car.turning=false,250);
      }else{
        car.turnAt=H[(Math.random()*H.length)|0];
      }
    }
  }
}

function update(){
  if(--timer<=0){spawn();timer=28+Math.random()*35}
  cars.forEach(car=>{
    turnAtIntersection(car);
    car.x+=Math.cos(car.a)*car.s;
    car.y+=Math.sin(car.a)*car.s;

    const p=MOTIPlayer.p;
    if(p.inv<=0&&Math.hypot(p.x-car.x,p.y-car.y)<38){
      p.inv=55;p.hp-=25;p.s=-1;
      MOTIAudio.crash();MOTIGame.toast("💥 ¡CHOQUE!");
      if(p.hp<=0)MOTIGame.end();
    }
  });
  for(let i=cars.length-1;i>=0;i--){
    const c=cars[i];
    if(c.x<-180||c.x>MOTIWorld.world.w+180||c.y<-180||c.y>MOTIWorld.world.h+180)cars.splice(i,1);
  }
}
return{cars,update,reset:()=>{cars.length=0;timer=10}};
})();
