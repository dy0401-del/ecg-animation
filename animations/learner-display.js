(() => {
 'use strict';
 const canvas=document.getElementById('scene');
 const shell=document.createElement('section');shell.className='diagram-shell';shell.setAttribute('aria-label','心臓と心電図の表示');
 const viewport=document.createElement('div');viewport.className='diagram-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label','図の表示領域。拡大後は上下左右にスクロールできます');
 const oldViewport=canvas.parentElement.classList.contains('viewport')?canvas.parentElement:null;
 canvas.before(shell);shell.append(viewport);viewport.append(canvas);
 if(oldViewport){oldViewport.before(shell);if(!oldViewport.children.length)oldViewport.remove();}
 const tools=document.createElement('div');tools.className='diagram-tools';
 tools.innerHTML='<label>図の倍率<select id="diagram-zoom"><option value="1">全体</option><option value="2">2倍</option><option value="4">4倍</option><option value="native">実寸</option></select></label><button type="button" id="ecg-zoom">心電図を拡大</button><button type="button" id="diagram-fullscreen">全画面</button>';
 shell.append(tools);
 const help=document.createElement('p');help.className='diagram-help';help.textContent='拡大後は図を上下左右にスクロールできます。スマートフォンを横向きにすると広く表示できます。';shell.append(help);
 const controls=document.querySelector('.controls');if(controls)shell.append(controls);
 const zoom=tools.querySelector('select'),full=tools.querySelector('#diagram-fullscreen');
 let restoreZoom=null,restoreOverflow='',restoreFocus=null;
 function expanded(){return document.fullscreenElement===shell||shell.classList.contains('expanded');}
 function resize(){
  const availableWidth=viewport.clientWidth;
  let width=zoom.value==='native'?Math.max(canvas.width,availableWidth):availableWidth*Number(zoom.value);
  if(zoom.value==='1'){
   const height=expanded()?viewport.clientHeight:window.innerHeight*.6;
   width=Math.min(width,height*canvas.width/canvas.height);
  }
  canvas.style.width=Math.max(1,width)+'px';canvas.style.height='auto';canvas.style.margin='0 auto';
 }
 function sync(){
  const active=expanded();
  if(active&&restoreZoom===null){restoreZoom=zoom.value;zoom.value='1';restoreFocus=document.activeElement;restoreOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';}
  if(!active&&restoreZoom!==null){zoom.value=restoreZoom;restoreZoom=null;document.documentElement.style.overflow=restoreOverflow;restoreFocus?.focus({preventScroll:true});}
  full.textContent=active?'全画面を閉じる':'全画面';full.setAttribute('aria-expanded',String(active));
  viewport.scrollTop=viewport.scrollLeft=0;resize();requestAnimationFrame(resize);
 }
 zoom.onchange=()=>{resize();if(zoom.value==='1')viewport.scrollTop=viewport.scrollLeft=0;};
 tools.querySelector('#ecg-zoom').onclick=()=>{zoom.value='native';resize();const scale=canvas.getBoundingClientRect().width/canvas.width;viewport.scrollLeft=Number(canvas.dataset.ecgX||0)*scale;viewport.scrollTop=Number(canvas.dataset.ecgY||1088)*scale;viewport.focus({preventScroll:true});};
 full.onclick=async()=>{
  if(document.fullscreenElement===shell){await document.exitFullscreen();return;}
  if(shell.classList.contains('expanded')){shell.classList.remove('expanded');sync();return;}
  try{if(!shell.requestFullscreen)throw new Error('fallback');await shell.requestFullscreen();}catch{shell.classList.add('expanded');sync();}
 };
 document.addEventListener('fullscreenchange',sync);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('expanded')){shell.classList.remove('expanded');sync();}});
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 new ResizeObserver(resize).observe(viewport);new ResizeObserver(resize).observe(shell);
 window.LearnerDiagram={canvas,shell,viewport,resize};sync();
})();
