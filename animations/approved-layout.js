(()=>{'use strict';
function init(){
 const {canvas,shell,viewport}=window.LearnerDiagram;
 const notes=shell.querySelector('.category-reentry-notes');
 const entries=notes?Array.from(notes.querySelectorAll('p')):[];
 if(entries.length!==2)return;
 shell.classList.add('avnrt-approved-layout');
 const left=document.createElement('aside'),right=document.createElement('aside');
 left.className='avnrt-side-note avnrt-side-note--left';right.className='avnrt-side-note avnrt-side-note--right';
 left.setAttribute('aria-label','心臓の見方');right.setAttribute('aria-label','心電図の見方');
 left.innerHTML='<p class="avnrt-kicker">心臓の見方</p><h2>典型的AVNRT<br>slow–fast型</h2><p>AVNRTは、房室結節リエントリー性頻拍です。</p>';
 right.innerHTML='<p class="avnrt-kicker">心電図の見方</p><h2>心房の興奮と<br>QRSの関係</h2>';
 left.append(entries[0].cloneNode(true));right.append(entries[1].cloneNode(true));
 left.insertAdjacentHTML('beforeend','<h3>回路の色</h3><p>拡大回路の橙はslow、紫はfastを示します。</p>');
 right.insertAdjacentHTML('beforeend','<h3>図の色</h3><p>青緑は逆行性の心房興奮、赤い×は開始時のブロックです。</p>');
 viewport.append(left,right);
 const header=document.createElement('header');header.className='avnrt-layout-header';
 const title=document.createElement('h1');title.textContent='典型的AVNRT（slow–fast型）';header.append(title);shell.prepend(header);
 // Keep the original player IDs and clock, arranging only the visible controls.
 const bar=shell.querySelector('.controls'),play=document.querySelector('#play'),seek=document.querySelector('#seek'),speed=document.querySelector('#speed'),repeat=document.querySelector('#repeat'),reset=document.querySelector('#reset'),status=document.querySelector('#status'),zoom=document.querySelector('#diagram-zoom'),ecgZoom=document.querySelector('#ecg-zoom');
 const stash=document.createElement('div');stash.hidden=true;stash.append(reset,status);shell.append(stash);
 const seekLabel=document.createElement('label');seekLabel.className='avnrt-seek';seekLabel.append(document.createTextNode('再生位置'),seek);
 const speedLabel=document.createElement('label');speedLabel.append(document.createTextNode('速度 '),speed);
 const repeatLabel=document.createElement('label');repeatLabel.append(repeat,document.createTextNode('繰り返し'));
 ecgZoom.remove();
 bar.classList.add('avnrt-playbar');bar.setAttribute('aria-label','再生バー');bar.replaceChildren(play,seekLabel,speedLabel,repeatLabel,document.querySelector('#diagram-fullscreen'));
 let queued=false,previousActive=true;
 function update(){queued=false;const active=document.fullscreenElement===shell||shell.classList.contains('expanded');let width=0;
  if(!active){
   const top=viewport.getBoundingClientRect().top+window.scrollY;
   const barHeight=bar.getBoundingClientRect().height;
   shell.style.setProperty('--avnrt-normal-fit-height',Math.max(100,window.innerHeight-top-barHeight-20)+'px');
   viewport.scrollTop=viewport.scrollLeft=0;
   if(previousActive)requestAnimationFrame(()=>shell.scrollIntoView({block:'start',behavior:'instant'}));
  }
  previousActive=active;
  if(active&&zoom.value==='1'){
   const css=getComputedStyle(shell);let height=shell.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
   for(const child of shell.children){if(child===viewport||child===notes||getComputedStyle(child).display==='none')continue;const s=getComputedStyle(child);height-=child.getBoundingClientRect().height+parseFloat(s.marginTop)+parseFloat(s.marginBottom);}
   width=Math.min(280,Math.floor((viewport.clientWidth-Math.min(viewport.clientWidth,Math.max(1,height)*canvas.width/canvas.height))/2)-24);
   if(viewport.clientWidth>=740)width=Math.max(140,width);
  }
  const enable=active&&width>=140;shell.classList.toggle('avnrt-side-layout',enable);viewport.style.setProperty('--avnrt-note-width',Math.max(0,width)+'px');left.hidden=right.hidden=!enable;
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
 new ResizeObserver(schedule).observe(shell);new ResizeObserver(schedule).observe(viewport);new ResizeObserver(schedule).observe(bar);
 new MutationObserver(schedule).observe(shell,{attributes:true,attributeFilter:['class']});
 document.addEventListener('fullscreenchange',schedule);zoom.addEventListener('change',schedule);window.addEventListener('resize',schedule);
 // Preview links open the accepted full-screen arrangement; ordinary links fit normally.
 const layout=new URLSearchParams(location.search).get('layout');
 if(layout==='preview'||layout==='animation'){shell.classList.add('expanded');document.dispatchEvent(new Event('fullscreenchange'));}
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
