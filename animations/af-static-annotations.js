// AF derivative: replace annotation adapters only, retaining every rhythm and waveform adapter.
(() => {
 'use strict';
 const ns=window.CardiacAnimation,base=ns.Rhythms['atrial-fibrillation'];
 const originalECG=base.renderAdapters.ecg;
 const font='"BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
 function text(ctx,s,x,y,size=34,bold=false){ctx.font=(bold?'700 ':'400 ')+size+'px '+font;ctx.fillStyle='#283743';ctx.textAlign='left';ctx.fillText(s,x,y);}
 function leader(ctx,x,y,tx,ty){ctx.strokeStyle='#526A75';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();}
 function labels(ctx){
  ctx.save();
  text(ctx,'心房細動',36,92,44,true);
  text(ctx,'心電図の観察点',36,260,40,true);
  text(ctx,'明瞭なP波がない',36,345,36);
  text(ctx,'R–R間隔が不規則',36,485,36);
  text(ctx,'心臓で起こること',1337,92,40,true);
  text(ctx,'心房の興奮',1337,270,38,true);
  text(ctx,'まとまらず、細かく活動',1337,330,32);
  leader(ctx,1320,258,1065,390);
  text(ctx,'房室結節',1337,480,38,true);
  text(ctx,'刺激の一部を',1337,545,34);
  text(ctx,'心室へ伝えます',1337,600,34);
  // Original AF adapter's AV node anchor. Explanation and leader remain fixed across frames.
  leader(ctx,1320,467,849,458);
  text(ctx,'伝わる間隔が不規則',1337,785,34);
  text(ctx,'→ R–R間隔も不規則',1337,845,34);
  ctx.restore();
  return {title:'心房細動',language:'ja',embeddedInCompositeFrame:false,staticAnnotations:true};
 }
 function ecg(ctx,state,config,design){
  const result=originalECG(ctx,state,config,design);
  ctx.save();
  // Clear only the former phase badge in the header. The ECG grid starts at y=74.
  ctx.fillStyle='#ffffff';ctx.fillRect(600,0,ctx.canvas.width-600,64);
  ctx.font='700 30px '+font;ctx.fillStyle='#283743';ctx.textAlign='right';
  ctx.fillText('明瞭なP波なし・R–R間隔が不規則',ctx.canvas.width-28,44);
  ctx.restore();
  return result;
 }
 ns.Rhythms['atrial-fibrillation']=Object.assign({},base,{renderAdapters:Object.assign({},base.renderAdapters,{labels,ecg})});
})();
