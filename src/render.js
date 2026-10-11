import {defaults,groupStates,rowColor} from './model.js';
import {geist} from './theme.js';
const font=geist.mono;
export function wrapText(ctx,text,width){
 const result=[];
 for(const paragraph of text.split('\n')){let line='';const tokens=paragraph.match(/[a-zA-Z0-9’'.,:;!?_/@()\-]+\s*|[^\x00-\x7F]|\s+|./gu)||[''];
   for(const token of tokens){if(ctx.measureText(line+token).width<=width){line+=token;continue;}
     if(line.trim()){result.push(line.trimEnd());line='';}
     if(ctx.measureText(token).width<=width){line=token.trimStart();continue;}
     for(const c of Array.from(token)){if(ctx.measureText(line+c).width>width&&line){result.push(line);line='';}line+=c;}
   }result.push(line.trimEnd());
 }return result;
}
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function shimmerGradient(ctx,left,right,time,color){
 const gradient=ctx.createLinearGradient(left,0,right,0);const base=[125,125,125];
 for(let step=0;step<=64;step++){
   const x=step/64;const weight=Math.pow((1+Math.cos(2*Math.PI*(x-time/3)))/2,4);
   const rgb=base.map((value,i)=>Math.round(value+(color[i]-value)*weight));
   gradient.addColorStop(x,`rgb(${rgb.join(',')})`);
 }
 return gradient;
}
export function renderFrame(canvas,rows,s,t){
 if(canvas.width!==s.width)canvas.width=s.width;if(canvas.height!==s.height)canvas.height=s.height;
 const ctx=canvas.getContext('2d',{alpha:true});ctx.clearRect(0,0,s.width,s.height);ctx.textBaseline='top';
 const glowColor=s.glowColor??defaults.glowColor;
 const glowRGB=glowColor.slice(1).match(/.{2}/g).map(v=>parseInt(v,16));
 const glowStrength=(s.glowStrength??defaults.glowStrength)/100;
 const p=s.padding;let top=p;
 if(s.showLogo&&s.logo.trim()){
   const lines=s.logo.split('\n');const longest=Math.max(...lines.map(l=>Array.from(l).length),1);
   const size=Math.min(14,(s.width-2*p)/(longest*.61),(s.height*.33)/Math.max(1,lines.length)/1.22);
   ctx.font=`${size}px ${font}`;ctx.fillStyle=geist.dark.text;
   lines.forEach((line,i)=>ctx.fillText(line,p,top+i*size*1.22));top+=lines.length*size*1.22+24;
 }
 const contentHeight=s.height-top-p;const items=[];let y=0;
 const all=groupStates(rows,t,s.thinkingHold);
 all.forEach(g=>{
   const {completeAt,complete}=g;
   const canFold=s.collapse&&g.row.level==='thinking';
   const fold=canFold&&complete?1-ease((t-completeAt)/.35):1;
   add(g.row,complete,g.row.level==='action',1);
   for(const row of g.visible)if(fold>0)add(row,true,true,fold);
   if(canFold&&complete&&g.children.length){const amount=1-fold;items.push({type:'summary',y,height:24*amount,text:s.language==='zh'?`↳ 已完成 ${g.children.length} 项行动`:`↳ ${g.children.length} actions completed`,alpha:amount});y+=24*amount;}
   y+=14;
   function add(row,done,action,factor){
     const size=action?s.actionSize:s.mainSize;ctx.font=`${size}px ${font}`;
     const left=p+(action&&row.parent?32:0);const mark=action?24:32;
     const maxWidth=s.width-p-left-mark;
     const entries=[];
     if(s.showTimestamp)entries.push({text:row.timestamp,size:Math.max(11,Math.round(size*.51)),timestamp:true});
     const languages=s.language==='both'?['en','zh']:[s.language];
     languages.forEach(lang=>{const copy=row[lang]||row[lang==='en'?'zh':'en'];const secondary=s.language==='both'&&lang==='zh';const fs=secondary?size*.86:size;ctx.font=`${fs}px ${font}`;wrapText(ctx,copy,maxWidth).forEach(text=>entries.push({text,size:fs,secondary}));});
     const h=entries.reduce((sum,e)=>sum+e.size*(e.timestamp?1.8:1.52),0)+(action?14:18);
     const appear=row.time===0?1:ease((t-row.time)/.3);
     items.push({type:'row',row,y,left,mark,entries,action,done,height:h,alpha:Math.max(.08,appear)*factor});y+=h*factor*appear;
   }
 });
 const scroll=Math.max(0,y-contentHeight);
 ctx.save();ctx.beginPath();ctx.rect(0,top,s.width,Math.max(0,contentHeight));ctx.clip();
 for(const item of items){const iy=top+item.y-scroll;if(iy+item.height<top||iy>s.height-p)continue;
   ctx.globalAlpha=item.alpha;
   if(item.type==='summary'){ctx.font=`12px ${font}`;ctx.fillStyle=geist.dark.muted;ctx.fillText(item.text,p+34,iy+3);continue;}
   let ty=iy;const firstOffset=s.showTimestamp?item.entries[0].size*1.8:0;
   const color=rowColor(item.row,s);
   if(item.action){ctx.fillStyle=item.row.type?color:geist.dark.muted;ctx.font=`${s.actionSize*.85}px ${font}`;ctx.fillText(item.row.parent?'↳':'·',item.left,iy+firstOffset+1);}
   else if(item.done){ctx.strokeStyle=geist.dark.text;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(item.left+2,iy+firstOffset+11);ctx.lineTo(item.left+7,iy+firstOffset+16);ctx.lineTo(item.left+16,iy+firstOffset+5);ctx.stroke();}
   else {const dot=Math.max(2,Math.min(4,s.mainSize/7));for(let n=0;n<12;n++){ctx.fillStyle=`rgba(${glowRGB.join(',')},${.18+.82*Math.pow((1+Math.cos(2*Math.PI*(n/12-t*.75)))/2,3)})`;ctx.fillRect(item.left+(n%4)*(dot+2),iy+firstOffset+4+Math.floor(n/4)*(dot+2),dot,dot);}}
   const gradient=!item.action&&!item.done?shimmerGradient(ctx,item.left+item.mark,s.width-p,t,glowRGB):null;
   for(const line of item.entries){ctx.font=`${line.size}px ${font}`;
     if(line.timestamp)ctx.fillStyle=geist.dark.muted;
     else if(item.action||item.done){ctx.fillStyle=color;if(line.secondary){if(item.row.type)ctx.globalAlpha=item.alpha*.8;else ctx.fillStyle=geist.dark.muted;}}
     else {ctx.fillStyle=gradient;ctx.shadowColor=`rgba(${glowRGB.join(',')},${glowStrength*.45})`;ctx.shadowBlur=glowStrength>0?Math.max(1,line.size*.07):0;}
     ctx.fillText(line.text,item.left+item.mark,ty);ctx.shadowBlur=0;ctx.globalAlpha=item.alpha;ty+=line.size*(line.timestamp?1.8:1.52);
   }
 }
 ctx.restore();ctx.globalAlpha=1;
 if(scroll>0){ctx.save();ctx.globalCompositeOperation='destination-out';const fade=ctx.createLinearGradient(0,top,0,top+20);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=fade;ctx.fillRect(0,top,s.width,20);ctx.restore();}
 return {visibleCount:rows.filter(r=>r.time<=t).length,scroll};
}
