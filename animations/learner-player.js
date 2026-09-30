(() => {
 'use strict';
 const canvas=document.getElementById('scene');
 const shell=document.createElement('section');shell.className='diagram-shell';shell.setAttribute('aria-label','心臓と心電図の表示');
 const viewport=document.createElement('div');viewport.className='diagram-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label','図の表示領域。拡大後は上下左右にスクロールできます');
 canvas.before(shell);shell.append(viewport);viewport.append(canvas);
 const tools=document.createElement('div');tools.className='diagram-tools';
 tools.innerHTML='<label>図の倍率<select id="diagram-zoom"><option value="1">全体</option><option value="2">2倍</option><option value="4">4倍</option><option value="native">実寸</option></select></label><button type="button" id="ecg-zoom">心電図を拡大</button><button type="button" id="diagram-fullscreen">全画面</button>';
 shell.append(tools);
 const help=document.createElement('p');help.className='diagram-help';help.textContent='拡大後は図を上下左右にスクロールできます。スマートフォンを横向きにすると広く表示できます。';shell.append(help);
 const zoom=tools.querySelector('select'),full=tools.querySelector('#diagram-fullscreen');
 function resize(){let width=zoom.value==='native'?Math.max(canvas.width,viewport.clientWidth):viewport.clientWidth*Number(zoom.value);if(zoom.value==='1')width=Math.min(width,window.innerHeight*.6*canvas.width/canvas.height);canvas.style.width=width+'px';canvas.style.margin='0 auto';}
 zoom.onchange=()=>{resize();if(zoom.value==='1'){viewport.scrollTop=viewport.scrollLeft=0;}};
 tools.querySelector('#ecg-zoom').onclick=()=>{zoom.value='native';resize();const scale=canvas.getBoundingClientRect().width/canvas.width;viewport.scrollLeft=Number(canvas.dataset.ecgX)*scale;viewport.scrollTop=Number(canvas.dataset.ecgY)*scale;viewport.focus({preventScroll:true});};
 full.onclick=async()=>{
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  if(shell.classList.contains('expanded')){shell.classList.remove('expanded');full.textContent='全画面';resize();return;}
  try{if(!shell.requestFullscreen)throw new Error('fallback');await shell.requestFullscreen();}catch{shell.classList.add('expanded');full.textContent='全画面を閉じる';resize();}
 };
 document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'全画面を閉じる':'全画面';resize();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('expanded')){shell.classList.remove('expanded');full.textContent='全画面';resize();}});
 new ResizeObserver(resize).observe(viewport);
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
