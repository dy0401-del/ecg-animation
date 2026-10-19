(()=>{'use strict';function init(){
 const shell=window.LearnerDiagram?.shell;if(!shell)return;const bar=shell.querySelector('.controls');if(!bar)return;
 const get=id=>document.getElementById(id),play=get('play'),seek=get('seek'),speed=get('speed'),repeat=get('repeat'),fullscreen=get('diagram-fullscreen');if(!play||!seek||!speed||!repeat||!fullscreen)return;
 const extras=Array.from(bar.querySelectorAll('input[type=checkbox]')).filter(el=>el!==repeat).map(el=>el.closest('label')||el);
 const stash=document.createElement('div');stash.hidden=true;for(const el of [get('reset'),get('status'),get('ecg-zoom')])if(el)stash.append(el);shell.append(stash);
 const seekLabel=document.createElement('label');seekLabel.className='playbar-only-seek';seekLabel.append(document.createTextNode('再生位置'),seek);
 const speedLabel=document.createElement('label');speedLabel.append(document.createTextNode('速度 '),speed);
 const repeatLabel=document.createElement('label');repeatLabel.append(repeat,document.createTextNode('繰り返し'));
 bar.classList.add('playbar-only');bar.setAttribute('aria-label','再生バー');bar.replaceChildren(play,seekLabel,speedLabel,repeatLabel,...extras,fullscreen);window.LearnerDiagram.viewport.after(bar);for(const el of shell.querySelectorAll('.diagram-tools,.diagram-help'))el.hidden=true;window.LearnerDiagram.viewport.setAttribute('aria-label','図の表示領域');shell.dataset.playbarOnlyReady='true';
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
