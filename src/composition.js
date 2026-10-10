import {renderFrame,wrapText} from './render.js';
import {geist} from './theme.js';
import {COMPOSITION_LOGO} from './config.js';

export const compositionDefaults={enabled:false,title:'Agent 思维链',subtitle:'Vision → Language → Action',credit:'',sourceStart:0,sourceEnd:0,logOffset:0,keepAudio:true,monochrome:false,fit:'contain',phases:[]};
export const MAX_MEDIA_BYTES=200*1024*1024;
// Separate from the standalone log logo: old video drafts disabled that logo
// because it consumed log space. The composition logo lives only in the header.
export const compositionLogo=c=>c.logo??COMPOSITION_LOGO;
export function validateComposition(c,media){
  if(!c||typeof c!=='object'||!media)throw Error('请先选择原视频');
  for(const [key,max] of [['title',80],['subtitle',120],['credit',160]])if(typeof c[key]!=='string'||c[key].length>max)throw Error('标题或署名过长');
  if(!Number.isFinite(c.sourceStart)||!Number.isFinite(c.sourceEnd)||c.sourceStart<0||c.sourceEnd<=c.sourceStart||c.sourceEnd>media.duration+.02)throw Error('视频片段须位于原视频范围内，结束时间须大于开始时间');
  if(!Number.isFinite(c.logOffset)||Math.abs(c.logOffset)>1200)throw Error('日志延迟须在 -1200 至 1200 秒之间');
  if(!['contain','cover'].includes(c.fit)||typeof c.keepAudio!=='boolean')throw Error('视频显示或音频设置无效');
  if(c.monochrome!==undefined&&typeof c.monochrome!=='boolean')throw Error('日志配色设置无效');
  if(c.showLogo!==undefined&&typeof c.showLogo!=='boolean')throw Error('ASCII Logo 显示设置无效');
  if(c.logo!==undefined&&(typeof c.logo!=='string'||c.logo.length>10000))throw Error('ASCII Logo 最多 10000 字符');
  if(!Array.isArray(c.phases)||c.phases.length>200)throw Error('阶段字幕最多 200 条');
  let previous=-1;
  for(const p of c.phases){
    if(!Number.isFinite(p.time)||p.time<0||p.time<previous||typeof p.title!=='string'||typeof p.detail!=='string'||p.title.length>80||p.detail.length>160)throw Error('阶段字幕需按非负秒数排列，标题最多 80 字，说明最多 160 字');
    previous=p.time;
  }
  return c;
}

export function compositionLayout(width,height,media){
  const stacked=width/height<1.2;
  const scale=Math.min(width/(stacked?1080:1920),height/(stacked?1440:1080)),margin=Math.round(64*scale),top=Math.round(228*scale),gap=Math.round(64*scale);
  const contentHeight=height-top-Math.round(84*scale);
  if(width/height<1.2){
    const videoHeight=Math.round(contentHeight*.43),logY=top+videoHeight+gap;
    return {scale,margin,video:{x:margin,y:top,width:width-2*margin,height:videoHeight},log:{x:margin,y:logY,width:width-2*margin,height:height-logY-Math.round(140*scale)}};
  }
  const videoWidth=Math.max(2,Math.round(Math.min(contentHeight*media.width/media.height,(width-2*margin)*.4)/2)*2);
  const logX=Math.max(margin+videoWidth+gap,Math.round(width*11/30));
  return {scale,margin,video:{x:margin,y:top,width:videoWidth,height:contentHeight},log:{x:logX,y:top,width:width-margin-logX,height:contentHeight}};
}

// The browser preview and server export paint the same layer. The transparent
// video rectangle is filled by a decoded video frame or the FFmpeg input.
export function renderComposition(canvas,rows,settings,time,c,media,video=null,fps=30){
  const {width,height}=settings;
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d'),layout=compositionLayout(width,height,media),{scale,margin,log}=layout;
  ctx.clearRect(0,0,width,height);ctx.fillStyle=geist.dark.background;ctx.fillRect(0,0,width,height);
  const {sans,mono}=geist,ink=geist.dark.text,muted=geist.dark.muted,border=geist.dark.border;
  const stacked=width/height<1.2;
  function text(value,x,y,size,color=ink,weight=400,font=sans,maxWidth=width-margin-x){
    if(maxWidth<=0)return;
    ctx.font=`${weight} ${size*scale}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='alphabetic';
    const glyphs=Array.from(value);let copy=value;
    if(ctx.measureText(copy).width>maxWidth){
      while(glyphs.length&&ctx.measureText(glyphs.join('')+'…').width>maxWidth)glyphs.pop();
      copy=glyphs.join('')+'…';
    }
    ctx.fillText(copy,x,y);
  }
  const duration=c.sourceEnd-c.sourceStart,logTime=time-c.logOffset;
  const titleX=margin,logoX=stacked?margin+(width-2*margin)*.57+32*scale:log.x;
  const titleWidth=logoX-titleX-48*scale;
  const logoBox={x:logoX,y:32*scale,width:width-margin-logoX,height:160*scale};
  if(c.showLogo!==false&&compositionLogo(c).trim()){
    const lines=compositionLogo(c).replace(/\r\n?/g,'\n').split('\n');
    ctx.font=`100px ${mono}`;
    const measured=Math.max(1,...lines.map(line=>ctx.measureText(line).width));
    const size=Math.min(20*scale,logoBox.width/measured*100,logoBox.height/(lines.length*1.2));
    ctx.save();ctx.beginPath();ctx.rect(logoBox.x,logoBox.y,logoBox.width,logoBox.height);ctx.clip();
    ctx.font=`${size}px ${mono}`;ctx.textBaseline='top';ctx.fillStyle=ink;
    const top=logoBox.y+(logoBox.height-lines.length*size*1.2)/2;
    lines.forEach((line,index)=>ctx.fillText(line,logoBox.x,top+index*size*1.2));
    ctx.restore();
  }
  text(c.title,titleX,104*scale,stacked?36:48,ink,600,sans,titleWidth);
  text(c.subtitle,titleX,146*scale,22,muted,400,sans,titleWidth);
  ctx.fillStyle=border;ctx.fillRect(margin,196*scale,width-2*margin,scale);
  const v=layout.video;
  ctx.clearRect(v.x,v.y,v.width,v.height);
  if(video?.readyState>=2){
    ctx.fillStyle='#000';ctx.fillRect(v.x,v.y,v.width,v.height);
    const ratio=c.fit==='cover'?Math.max(v.width/media.width,v.height/media.height):Math.min(v.width/media.width,v.height/media.height);
    const w=media.width*ratio,h=media.height*ratio;
    ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.width,v.height);ctx.clip();ctx.drawImage(video,v.x+(v.width-w)/2,v.y+(v.height-h)/2,w,h);ctx.restore();
  }
  ctx.strokeStyle=border;ctx.strokeRect(v.x-scale,v.y-scale,v.width+2*scale,v.height+2*scale);
  // Keep the log renderer independent of the composition canvas size.
  const logCanvas=canvas._logCanvas??=document.createElement('canvas');
  const headerHeight=Math.round(48*scale);
  const logSettings={...settings,showLogo:false,width:log.width,height:log.height-headerHeight,padding:Math.min(settings.padding,Math.floor(log.width/5),Math.floor((log.height-headerHeight)/5))};
  const info=renderFrame(logCanvas,rows,logSettings,logTime);
  ctx.fillStyle=geist.dark.background;ctx.fillRect(log.x,log.y,log.width,log.height);
  ctx.fillStyle=geist.dark.surface;ctx.fillRect(log.x,log.y,log.width,headerHeight);
  ctx.fillStyle=geist.dark.border;ctx.fillRect(log.x,log.y+headerHeight-scale,log.width,scale);
  text('>_  agent.log',log.x+20*scale,log.y+30*scale,15,geist.dark.text,400,mono,log.width*.5);
  const eventCount=`${String(info.visibleCount).padStart(2,'0')} / ${rows.length} EVENTS`;
  ctx.font=`${13*scale}px ${mono}`;
  text(eventCount,log.x+log.width-20*scale-ctx.measureText(eventCount).width,log.y+30*scale,13,geist.dark.muted,400,mono);
  ctx.save();if(c.monochrome)ctx.filter='grayscale(1)';ctx.drawImage(logCanvas,log.x,log.y+headerHeight);ctx.restore();
  const phase=c.phases.filter(p=>p.time<=logTime).at(-1);
  const footerY=log.y+log.height+24*scale;
  if(phase){
    text(phase.title,log.x,footerY,22,ink,600,sans,log.width);
    // Stack detail under its title: portrait and square output keep the full column.
    ctx.font=`400 ${17*scale}px ${sans}`;
    const detail=wrapText(ctx,phase.detail,log.width);
    text(stacked?(detail[0]||''):phase.detail,log.x,footerY+26*scale,17,muted,400,sans,log.width);
    if(stacked&&detail.length>1)text(detail.slice(1).join(''),log.x,footerY+50*scale,17,muted,400,sans,log.width);
  }
  text(c.credit,margin,height-22*scale,14,muted,400,sans,stacked?width-2*margin:log.x-margin-32*scale);
  ctx.fillStyle=border;ctx.fillRect(margin,height-3*scale,width-2*margin,2*scale);
  ctx.fillStyle=ink;ctx.fillRect(margin,height-3*scale,(width-2*margin)*Math.max(0,Math.min(1,time/duration)),2*scale);
  return {...info,layout};
}
