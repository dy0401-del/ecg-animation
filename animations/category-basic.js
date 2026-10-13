(() => {
 'use strict';
 const id=location.pathname.split('/').pop().replace(/\.html$/,''),shell=window.LearnerDiagram.shell;
 const notes={
  'sinus-rhythm':[
   ['心臓から波形への対応','洞結節から心房へ広がる興奮がP波、心室の興奮がQRS、心室の電気的な回復がT波に対応します。興奮と、その後の収縮は別の現象です。'],
   ['この模式例の観察点','規則的なP波とP–QRSの1対1の対応を確認します。この例は60回/分、R–R間隔1.00秒、PR間隔200 msです。12誘導は同じ時刻の電気活動を別の方向から記録しています。']],
  'normal-axis':[
   ['心臓上の矢印','青は興奮が進む経路です。通過後に保持される青い表示は直前の経路を示します。緑はQRS中の瞬時の合計方向で、QRS終了後は全体の平均方向を表示します。'],
   ['中央図と心電図','中央の緑矢印はQRS全体の平均方向（平均QRS軸）です。この例は＋60°で、Ⅰ・aVF・Ⅱ誘導のQRSは陽性優位です。心臓上の瞬時の矢印とは区別します。']],
  'left-axis-deviation':[
   ['心臓上の矢印','青は興奮が進む模式経路、水色は興奮した心筋です。×は左脚前枝の伝導遮断を示します。緑はQRS中の瞬時の合計方向です。'],
   ['中央図と心電図','中央の緑矢印はQRS全体の平均方向です。この左脚前枝ブロックの模式例は−60°で、Ⅰ誘導は陽性優位、aVF・Ⅱ誘導は陰性優位です。軸偏位の原因が常に前枝ブロックとは限りません。']],
  'right-axis-deviation':[
   ['心臓上の矢印','青は興奮が進む模式経路、水色は興奮した心筋です。×は左脚後枝の模式的な遮断位置です。橙の保持表示は電気的な合計方向を示し、新しい興奮が進む経路ではありません。'],
   ['中央図と心電図','中央の緑矢印はQRS全体の平均方向、橙はQRS中の瞬時の合計方向です。この模式例の平均軸は＋130°で、Ⅰ誘導は陰性優位、aVFは陽性優位です。投影は各誘導に記録される成分を示します。']]
 };
 const box=document.createElement('aside');box.className='category-basic-notes';box.setAttribute('aria-label','図と心電図の固定解説');
 for(const [heading,body] of notes[id]){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=heading;p.append(strong,document.createTextNode(body));box.append(p);}
 shell.querySelector('.diagram-tools').before(box);
 document.documentElement.setAttribute('data-category-ready','true');
})();
