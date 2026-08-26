window.MOTIWorld=(function(){
const world={w:5200,h:4200,roadW:150};
const vertical=[520,1450,2500,3600,4550],horizontal=[520,1450,2500,3500];
const roads=[];vertical.forEach(x=>roads.push({x:x-roadW/2,y:0,w:roadW,h:world.h,type:"v"}));horizontal.forEach(y=>roads.push({x:0,y:y-roadW/2,w:world.w,h:roadW,type:"h"}));
const buildings=[],trees=[],shops=[],houses=[];
const wall=["#d18461","#d9a957","#739fb3","#c76f6b","#9a79b7","#719e6c"],roof=["#a75146","#4d5a5f","#795145","#b97048","#516d79"];
const rnd=(a,b)=>a+Math.random()*(b-a);
function isRoad(x,y){return roads.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)}
function generate(){
 buildings.length=trees.length=shops.length=houses.length=0;
 for(let y=70;y<world.h-80;y+=210)for(let x=70;x<world.w-80;x+=225){let b={x:x+rnd(-15,15),y:y+rnd(-15,15),w:rnd(105,170),h:rnd(90,145)};if(!isRoad(b.x+20,b.y+20)&&!isRoad(b.x+b.w-20,b.y+b.h-20))buildings.push({...b,wall:wall[(Math.random()*wall.length)|0],roof:roof[(Math.random()*roof.length)|0]})}
 for(let i=0;i<120;i++){let x=rnd(30,world.w-30),y=rnd(30,world.h-30);if(!isRoad(x,y))trees.push({x,y,r:rnd(15,26)})}
 const sn=["Abarrotes Don Pepe","Mini Súper","Farmacia","Papelería","Tienda La Fe","Panadería","Frutas y Verduras","Ferretería"];
 [[1450,1450],[2500,520],[3600,520],[520,1450],[2500,1450],[3600,2500],[1450,3500],[4550,3500]].forEach((p,i)=>shops.push({x:p[0],y:p[1],name:sn[i%sn.length]}));
 const names=["Ana","Luis","María","Carlos","Sofía","José","Pedro","Rosa","Juan","Elena","Miguel","Laura"];
 for(let i=0;i<35;i++){let x,y;do{x=rnd(180,world.w-180);y=rnd(180,world.h-180)}while(isRoad(x,y));houses.push({x,y,name:"Casa de "+names[i%names.length]})}
}
generate();
return{world,vertical,horizontal,roads,buildings,trees,shops,houses,isRoad};
})();
