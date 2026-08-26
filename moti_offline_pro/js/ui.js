window.MOTIUI=(function(){
const $=id=>document.getElementById(id);
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove("show"),1400)}
function update(){const p=MOTIPlayer.p;$("money").textContent=MOTIGame.money;$("deliveries").textContent=MOTIGame.deliveries;$("speed").textContent=Math.round(Math.abs(p.s)*11);$("health").textContent=Math.round(p.hp);$("energy").textContent=Math.round(p.energy);$("healthBar").style.width=p.hp+"%";$("energyBar").style.width=p.energy+"%";$("healthIcon").textContent=p.hp<30?"🔴":p.hp<60?"🟡":"🟢";const m=MOTIMissions.current;if(m){$("missionType").textContent=m.state==="pickup"?"RECOGER":"ENTREGAR";$("missionTarget").textContent=(m.state==="pickup"?m.shop:m.house).name;$("reward").textContent="$"+m.reward;$("time").textContent=Math.max(0,Math.ceil(MOTIMissions.time))+" s"}}
return{toast,update};
})();
