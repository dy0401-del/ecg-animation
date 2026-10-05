(() => {
 'use strict';
 const {canvas,shell}=window.LearnerDiagram;
 let loading=document.getElementById('loading')||document.getElementById('frame-loading');
 if(!loading){loading=document.createElement('p');loading.id='frame-loading';shell.after(loading);}
 shell.append(loading);
 loading.setAttribute('role','status');loading.setAttribute('aria-live','polite');
 const play=document.getElementById('play'),reset=document.getElementById('reset'),seek=document.getElementById('seek'),speed=document.getElementById('speed'),repeat=document.getElementById('repeat'),status=document.getElementById('status');
 shell.append(play.closest('nav'));
 play.textContent='再生';play.disabled=true;reset.disabled=seek.disabled=true;
 function waitForPlay(load,message=loading){
  let pending=false;play.disabled=false;reset.disabled=seek.disabled=true;message.hidden=false;message.textContent='再生ボタンを押すと映像を読み込みます。解説は先に読むことができます。';
  play.onclick=async()=>{if(pending)return;pending=true;play.disabled=true;message.hidden=false;message.textContent='映像を読み込み中…';try{await load();message.hidden=true;}catch(error){message.hidden=false;message.textContent='読み込めませんでした。再生を押して再試行してください。';console.error(error);}finally{pending=false;play.disabled=false;}};
 }
 function start(render,duration,fps,autoplay=false){
  let elapsed=0,playing=autoplay,previous=null,cycles=0;const last=duration-1000/fps;
  reset.disabled=seek.disabled=speed.disabled=repeat.disabled=play.disabled=false;seek.max=String(Math.round(duration*fps/1000)-1);loading.hidden=true;
  function draw(){render(Math.min(elapsed,last));seek.value=String(Math.min(Number(seek.max),Math.floor(elapsed*fps/1000+1e-6)));status.value=`${(elapsed/1000).toFixed(2)} / ${(duration/1000).toFixed(2)} 秒`;play.textContent=playing?'一時停止':'再生';play.setAttribute('aria-label',play.textContent);}
  function tick(now){if(playing&&previous!==null){elapsed+=Math.max(0,now-previous)*Number(speed.value);if(elapsed>=duration){if(repeat.checked){cycles+=Math.floor(elapsed/duration);elapsed%=duration;}else{elapsed=duration;playing=false;}}draw();}previous=now;requestAnimationFrame(tick);}
  play.onclick=()=>{if(!playing&&elapsed>=duration)elapsed=0;playing=!playing;previous=null;draw();};
  reset.onclick=()=>{elapsed=0;cycles=0;playing=false;previous=null;draw();};
  seek.oninput=()=>{playing=false;elapsed=Number(seek.value)*1000/fps;previous=null;draw();};
  document.addEventListener('visibilitychange',()=>{previous=null;});
  document.addEventListener('cardiac-redraw',()=>draw());
  window.cardiacAnimation.playback={getState:()=>({elapsed,playing,speed:Number(speed.value),repeat:repeat.checked,cycles})};
  draw();canvas.dataset.previewReady='true';requestAnimationFrame(tick);
 }
 function prepareFrames(frames,urls,render,duration,fps){
  function load(i){return new Promise((resolve,reject)=>{const im=frames[i];if(im.complete&&im.naturalWidth){resolve();return;}im.onload=resolve;im.onerror=()=>reject(new Error('Image load failed'));im.src=urls[i];});}
  // A single unchanged source image draws the initial composite. The remaining
  // frames are requested only after play; all drawing functions remain intact.
  load(0).then(()=>{render(0);canvas.dataset.previewReady='true';}).catch(()=>{});
  waitForPlay(async()=>{await Promise.all(urls.map((_,i)=>load(i)));window.__CARDIAC_READY__=true;start(render,duration,fps,true);});
 }
 window.LearnerPlayer={start,waitForPlay,prepareFrames};
})();
