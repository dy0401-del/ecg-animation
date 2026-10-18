(()=>{'use strict';
function init(){
 const {canvas:source,shell,viewport}=window.LearnerDiagram;
 const output=document.createElement('canvas');output.className='normal-wide-scene';output.id='normal-scene';output.setAttribute('role','img');output.setAttribute('aria-label','典型的AVNRT。左に回路、中央に心臓、右に心房の図、下段全幅に心電図を配置した模式図');viewport.append(output);
 const ctx=output.getContext('2d');let lastKey='';
 function fitCrop(x,y,w,h,dx,dy,dw,dh){const scale=Math.min(dw/w,dh/h),cw=w*scale,ch=h*scale;ctx.drawImage(source,x*source.width/1808,y*source.height/1488,w*source.width/1808,h*source.height/1488,dx+(dw-cw)/2,dy+(dh-ch)/2,cw,ch);}
 function drawECG(ms,width,top,height,config){
  const a=config.ecg.panel,scale=height/400,left=8,right=width-8,y=top+14*scale,bottom=top+372*scale,baseline=top+(a.baseline-1088)*scale,box=a.smallBoxPx*scale,pxMs=a.pxPerMs*scale,pxMv=a.pxPerMv*scale,cursor=(left+right)/2,offset=ms-(cursor-left)/pxMs;
  ctx.fillStyle='#fffdfd';ctx.fillRect(0,top,width,height);ctx.save();ctx.beginPath();ctx.rect(left,y,right-left,bottom-y);ctx.clip();
  // Grid and trace use equal horizontal/vertical scale. Wider space shows more
  // of the same finite recording, rather than stretching QRS complexes.
  for(let i=0,x=left;x<=right;i++,x=left+i*box){ctx.strokeStyle=i%5?'#f8e1e4':'#edb7bd';ctx.lineWidth=(i%5?.65:1)*scale;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,bottom);ctx.stroke();}
  for(let i=-18;i<=10;i++){const gy=baseline+i*box;ctx.strokeStyle=i%5?'#f8e1e4':'#edb7bd';ctx.lineWidth=(i%5?.65:1)*scale;ctx.beginPath();ctx.moveTo(left,gy);ctx.lineTo(right,gy);ctx.stroke();}
  const end=config.duration.totalSeconds*1000,first=Math.max(0,Math.ceil(offset)),last=Math.min(end,Math.floor(offset+(right-left)/pxMs));
  for(const [color,limit] of [['#919da5',right],['#20282e',cursor]]){ctx.save();ctx.beginPath();ctx.rect(left,y,limit-left,bottom-y);ctx.clip();ctx.beginPath();for(let t=first;t<=last;t++){const x=left+(t-offset)*pxMs,py=baseline-window.cardiacAnimation.ecgValue(t)*pxMv;t===first?ctx.moveTo(x,py):ctx.lineTo(x,py);}ctx.strokeStyle=color;ctx.lineWidth=Math.max(.8,a.lineWidth*scale);ctx.lineJoin='round';ctx.stroke();ctx.restore();}
  ctx.strokeStyle='#bf8a20';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cursor,y);ctx.lineTo(cursor,bottom);ctx.stroke();ctx.restore();ctx.font='bold '+Math.max(11,29*scale)+'px "BIZ UDPGothic","Yu Gothic",sans-serif';ctx.fillStyle='#283743';ctx.fillText('II',left+4,y+Math.max(12,29*scale));
  output.dataset.cursorX=String(cursor);output.dataset.pxPerMs=String(pxMs);output.dataset.ms=String(ms);output.dataset.recordStart=String(first);output.dataset.recordEnd=String(last);
 }
 function frame(){
  const active=document.fullscreenElement===shell||shell.classList.contains('expanded'),api=window.cardiacAnimation;
  if(!active&&window.__CARDIAC_READY__&&api){
   const width=output.clientWidth,height=output.clientHeight,dpr=window.devicePixelRatio||1,ms=window.__elapsedms??api.playback?.getState().elapsed??0,key=[width,height,dpr,ms,source.width].join(':');
   if(width&&height&&key!==lastKey){lastKey=key;output.width=Math.round(width*dpr);output.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,width,height);
    const topHeight=height*1088/1488,gap=8,side=width*.28,center=width-2*side;
    fitCrop(24,165,462,923,0,0,side-gap,topHeight);
    fitCrop(api.config.anatomy.left,0,768,1088,side,0,center,topHeight);
    fitCrop(1324,230,460,670,width-side+gap,0,side-gap,topHeight);
    drawECG(ms,width,topHeight,height-topHeight,api.config);
   }
  }else lastKey='';
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
