export const DEFAULT_LOGO = String.raw`┌────────────────────────────┐
│  >_ AGENT                  │
│     L O G   S T U D I O    │
└────────────────────────────┘`;
export const defaultTypeColors = Object.freeze({think:'#d5dce7',feed:'#acb6c4',action:'#91bdb2',instruction:'#b7acd6'});
export const defaults = {width:1280,height:720,mainSize:28,actionSize:23,padding:48,language:'en',showLogo:true,showTimestamp:true,collapse:false,speed:1,tail:3,glowColor:'#ffffff',glowStrength:20,typeColors:defaultTypeColors,logo:DEFAULT_LOGO};
export function rowColor(row,settings){
  const type=row.type?.toLowerCase()||(row.level==='thinking'?'think':'');
  return Object.hasOwn(defaultTypeColors,type)?(settings.typeColors?.[type]??defaultTypeColors[type]):'#acb6c4';
}
export function clockSeconds(value) {
  if (/^\d+(\.\d+)?$/.test(String(value).trim())) return Number(value);
  const m = /^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(String(value).trim());
  if (!m || +m[1]>23 || +m[2]>59 || +m[3]>=60) throw Error(`时间格式无效：${value}。请使用秒数或 HH:MM:SS。`);
  return +m[1]*3600 + +m[2]*60 + +m[3];
}
export function readCSV(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {const c=text[i];
    if(c==='"') {if(quoted && text[i+1]==='"'){cell+='"';i++;}else if(!quoted && cell.length) throw Error('CSV 引号格式无效');else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('CSV 中存在未闭合的引号');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw Error('CSV 至少需要表头和一条日志');
  const headers=rows.shift().map(h=>h.trim().toLowerCase());
  if(!headers.includes('en')&&!headers.includes('zh'))throw Error('CSV 需要 en 或 zh 文案列');
  if(!headers.includes('level'))throw Error('CSV 缺少 level 列（thinking / action）');
  if(!headers.includes('time')&&!headers.includes('timestamp'))throw Error('CSV 需要 time（播放秒数）或 timestamp 列');
  let parent='',previousClock=null,offset=0,origin=null,scene='';
  const data=rows.map((values,i)=>{
    if(values.length!==headers.length)throw Error(`CSV 第 ${i+2} 行列数不匹配`);
    const v=Object.fromEntries(headers.map((h,j)=>[h,values[j]]));
    const level=({'1':'thinking','2':'action','思考':'thinking','行动':'action'})[v.level]||v.level;
    if(!['thinking','action'].includes(level))throw Error(`第 ${i+2} 行 level 无效`);
    const rowScene=v.scene||'01';
    if(rowScene!==scene){scene=rowScene;previousClock=null;origin=null;offset=0;parent='';}
    let t;
    if(v.time?.trim())t=Number(v.time);
    else {const c=clockSeconds(v.timestamp);if(previousClock!==null&&c<previousClock){if(previousClock-c>43200)offset+=86400;else throw Error(`第 ${i+2} 行时间戳倒序`);}if(origin===null)origin=c;t=c+offset-origin;previousClock=c;}
    if(!Number.isFinite(t)||t<0)throw Error(`第 ${i+2} 行播放时间必须为非负秒数`);
    const id=v.id||`log-${i+1}`;
    const type=(v.type||'').trim().toLowerCase();
    // Typed scripts may start with a standalone feed before the first thought.
    const rowParent=level==='thinking'?'':type&&headers.includes('parent')?v.parent:parent;
    if(level==='action'&&!rowParent&&!type)throw Error(`第 ${i+2} 行行动前没有思考日志`);
    if(!rowParent)parent=id;
    if(!(v.en||'').trim()&&!(v.zh||'').trim())throw Error(`第 ${i+2} 行文案为空`);
    return {id,scene:rowScene,level,parent:rowParent,timestamp:v.timestamp||formatClock(t),time:t,en:v.en||'',zh:v.zh||'',shot:v.shot||'',...(type?{type}:{})};
  });
  validateRows(data);return data;
}
export function validateRows(rows) {
  if(!Array.isArray(rows)||!rows.length||rows.length>2000)throw Error('日志数量须为 1–2000 条');
  const ids=new Set();const last=new Map();const parents=new Map();
  for(const row of rows){
    if(!row.id||ids.has(row.id))throw Error('日志 ID 不能为空或重复');ids.add(row.id);
    if(!Number.isFinite(row.time)||row.time<0)throw Error('播放时间必须为非负秒数');
    if(row.time<(last.get(row.scene)??0))throw Error('播放时间需按顺序递增（可以相同）；请调整时间或行顺序');last.set(row.scene,row.time);
    if(!['thinking','action'].includes(row.level))throw Error('日志层级无效');
    if(row.type!==undefined&&(typeof row.type!=='string'||!/^[a-z][a-z0-9_-]{0,47}$/i.test(row.type)))throw Error('type 须为 1–48 位英文类型名');
    if(typeof row.en!=='string'||typeof row.zh!=='string'||(!row.en.trim()&&!row.zh.trim()))throw Error('每条日志至少需要一种语言');
    if(row.en.length+row.zh.length>12000)throw Error('单条日志文案过长');
    if(row.level==='thinking'||(row.type&&row.parent===''))parents.set(row.scene,row.id);
    else if(!parents.has(row.scene)||row.parent!==parents.get(row.scene))throw Error('行动必须属于前一个段落；独立事件需填写 type 并留空 parent');
  }
  return rows;
}
export function reparent(rows){const parents=new Map();return rows.map(r=>{const parent=parents.get(r.scene)||'';const root=r.level==='thinking'||(r.type&&(r.parent===''||!parent));if(root)parents.set(r.scene,r.id);return {...r,parent:root?'':parent};});}
export function writeCSV(rows){const keys=['id','scene','level','parent','timestamp','time','en','zh','shot','type'];return '\uFEFF'+[keys.join(','),...rows.map(r=>keys.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(','))].join('\r\n');}
export function compressWaits(rows,maxGap=3){let time=0;let last=rows[0]?.time||0;return rows.map(r=>{time+=Math.min(maxGap,Math.max(0,r.time-last));last=r.time;return {...r,time:Math.round(time*1000)/1000};});}
export function formatClock(t){return [Math.floor(t/3600),Math.floor(t/60)%60,Math.floor(t)%60].map(n=>String(n).padStart(2,'0')).join(':');}
export function formatDuration(t){return t>=3600?formatClock(t):`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;}
export function endTime(rows,s){return (rows.at(-1)?.time||0)+Number(s.tail);}
export function groupStates(rows,t){
  const groups=[];
  for(const row of rows){if(row.level==='thinking'||(row.type&&!row.parent))groups.push({row,children:[]});else groups.at(-1)?.children.push(row);}
  return groups.filter(g=>g.row.time<=t).map(g=>({...g,complete:t>=(g.children.at(-1)?.time??g.row.time)+0.65,visible:g.children.filter(r=>r.time<=t)}));
}
export function validateSettings(s){
  for(const [key,min,max] of [['width',320,3840],['height',240,2160],['mainSize',12,80],['actionSize',10,64],['padding',16,160],['speed',0.1,100],['tail',1,30]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`${key} 超出允许范围 ${min}–${max}`);
  if(s.glowColor!==undefined&&(typeof s.glowColor!=='string'||!/^#[0-9a-f]{6}$/i.test(s.glowColor)))throw Error('发光颜色须为六位 HEX 色值，如 #80bfff');
  if(s.glowStrength!==undefined&&(!Number.isFinite(s.glowStrength)||s.glowStrength<0||s.glowStrength>100))throw Error('光晕强度须为 0–100');
  if(s.typeColors!==undefined){
    if(!s.typeColors||typeof s.typeColors!=='object'||Array.isArray(s.typeColors))throw Error('类型配色须为颜色映射');
    for(const [type,color] of Object.entries(s.typeColors))if(!Object.hasOwn(defaultTypeColors,type)||typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))throw Error('类型配色须使用六位 HEX 色值，如 #91bdb2');
  }
  if(s.width%2||s.height%2)throw Error('画布宽高须为偶数');
  if(!['en','zh','both'].includes(s.language))throw Error('语言设置无效');
  if(typeof s.logo!=='string'||s.logo.length>10000)throw Error('Logo 内容过长');
  return s;
}
