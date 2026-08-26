window.MOTIAudio=(function(){
let ctx=null;
function init(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!ctx)ctx=new AC();if(ctx.state==="suspended")ctx.resume()}
function tone(f,d=.08,type="square",v=.035){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;o.connect(g);g.connect(ctx.destination);let n=ctx.currentTime;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.start(n);o.stop(n+d)}
return{init,engine(){tone(105,.035,"sine",.012)},horn(){tone(440,.15,"sawtooth",.07);setTimeout(()=>tone(520,.15,"sawtooth",.06),90)},crash(){tone(85,.18,"sawtooth",.08);setTimeout(()=>tone(50,.13,"square",.05),80)},pickup(){tone(660,.08,"sine",.04);setTimeout(()=>tone(880,.12,"sine",.04),90)},delivery(){tone(660,.08,"sine",.04);setTimeout(()=>tone(830,.08,"sine",.04),90);setTimeout(()=>tone(1050,.14,"sine",.04),180)},start(){tone(620,.1,"sine",.04)}};
})();
