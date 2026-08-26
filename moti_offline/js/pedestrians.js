window.MOTIPedestrians=(function(){
const people=[];
function generate(){
 people.length=0;
 for(let i=0;i<70;i++){
  if(Math.random()<.5){let y=MOTIWorld.horizontal[(Math.random()*MOTIWorld.horizontal.length)|0]+(Math.random()<.5?-52:52);people.push({x:Math.random()*MOTIWorld.world.w,y,a:Math.random()<.5?0:Math.PI,walk:Math.random()*6})}
  else{let x=MOTIWorld.vertical[(Math.random()*MOTIWorld.vertical.length)|0]+(Math.random()<.5?-52:52);people.push({x,y:Math.random()*MOTIWorld.world.h,a:Math.random()<.5?Math.PI/2:-Math.PI/2,walk:Math.random()*6})}
 }
}
function update(){people.forEach(p=>{p.walk+=.15;p.x+=Math.cos(p.a)*.3;p.y+=Math.sin(p.a)*.3;if(p.x<10||p.x>MOTIWorld.world.w-10||p.y<10||p.y>MOTIWorld.world.h-10)p.a+=Math.PI})}
generate();return{people,update};
})();
