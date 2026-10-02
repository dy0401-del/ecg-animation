(() => {
 'use strict';
 const search=document.getElementById('rhythm-search'),cards=[...document.querySelectorAll('#rhythm-list > li')],buttons=[...document.querySelectorAll('[data-filter]')];
 let category='all';
 const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/slow[\s‐–—_-]*fast/g,'slowfast').replace(/fast[\s‐–—_-]*slow/g,'fastslow').replace(/(?<![a-z])iii(?=度|群)/g,'3').replace(/(?<![a-z])ii(?=度|群)/g,'2').replace(/(?<![a-z])i(?=度|群)/g,'1').replace(/[‐–—ー＿_-]/g,' ').replace(/\s+/g,' ').trim();
 // Match whole abbreviation tokens: AF does not also select AFL.
 const matches=(hay,term)=>/^afl?$/.test(term)?hay.split(/[^a-z]+/).includes(term):hay.includes(term);
 function render(){
  const terms=normalize(search.value).split(' ').filter(Boolean);let count=0;
  cards.forEach(card=>{const show=(category==='all'||card.dataset.category===category)&&terms.every(term=>matches(normalize(card.dataset.search),term));card.hidden=!show;if(show)count++;});
  document.getElementById('result-count').textContent=count+'件 / 全'+cards.length+'件の教材';
  document.getElementById('empty-results').hidden=count>0;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===category)));
 }
 search.addEventListener('input',render);
 buttons.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;render();}));
 document.getElementById('clear-filters').addEventListener('click',()=>{category='all';search.value='';render();search.focus();});
 render();
})();
