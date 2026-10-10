import './style.css';
import {APP_ID,APP_NAME,STORAGE_KEY} from './config.js';
import {samples} from './samples.js';
import {defaults,defaultTypeColors,readCSV,writeCSV,validateRows,validateSettings,reparent,compressWaits,endTime,formatDuration,formatClock} from './model.js';
import {renderFrame} from './render.js';
import {compositionDefaults,renderComposition,validateComposition,MAX_MEDIA_BYTES} from './composition.js';
import {videoExamples} from './video-examples.js';
await Promise.all([document.fonts.load('400 26px Geist'),document.fonts.load('600 26px Geist'),document.fonts.load('400 18px "Geist Mono"')]);
const icons={expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',plus:'<path d="M12 5v14M5 12h14"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',settings:'<path d="M4 7h16M4 17h16M9 4v6m6 4v6"/>',arrow:'<path d="m9 5 7 7-7 7"/>',check:'<path d="m5 12 4 4L19 6"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name]||''}</svg>`;
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeLabels={think:'思考 · 主行',feed:'反馈 · 感知与回执',action:'调用 · 模型与工具',instruction:'指令 · 任务执行'};
let settings={...defaults,typeColors:{...defaultTypeColors}},rows=[],time=0,playing=false,lastTick=0,bgMode='solid',bgColor='#10171c',imageURL='',activeTab='content',jobId=null,dirty=false;
let previewZoom='fit',previewFocused=false,nativePreviewFullscreen=false;
let imported=[];
let composition={...compositionDefaults,phases:[]},media=null,mediaBusy=false,mediaPollToken=0;
let stored;try{stored=JSON.parse(localStorage.getItem(STORAGE_KEY));if(stored){validateSettings(stored.settings);validateRows(stored.rows);settings={...defaults,...stored.settings,typeColors:{...defaultTypeColors,...stored.settings.typeColors}};rows=stored.rows;if(stored.composition){composition={...compositionDefaults,...stored.composition};media=stored.media||null;if(media)validateComposition(composition,media);else{composition.enabled=false;validateComposition({...composition,sourceStart:0,sourceEnd:1},{duration:1});}}if(stored.imported?.length){for(const scene of new Set(stored.imported.map(r=>r.scene)))validateRows(stored.imported.filter(r=>r.scene===scene));imported=stored.imported;}}}catch{stored=null;composition={...compositionDefaults,phases:[]};media=null;}
$('#app').innerHTML=`
<header class="app-header"><a class="brand" href="/" aria-label="${APP_NAME}"><span class="brand-symbol">▦</span><b>Agent</b><span class="brand-divider"></span><span>Log Studio</span><span class="version">BETA</span></a><div class="header-right"><span id="saveState" class="save-state"><i></i> 已保存到本机</span><button id="exportOpen" class="button primary">${icon('download')}导出视频</button></div></header>
<main class="workspace"><section class="preview-panel" id="previewPanel">
<div class="preview-toolbar"><div class="toolbar-title"><span class="live-dot"></span>效果预览 <span id="canvasSize" class="canvas-meta"></span></div><div class="background-control" title="背景仅用于预览，不进入视频"><span>背景</span><div class="segments" id="backgroundModes"><button data-bg="solid" class="selected">纯色</button><button data-bg="image">图片</button><button data-bg="transparent">透明</button></div><input id="bgColor" type="color" value="#10171c" aria-label="预览背景颜色"><button id="imagePick" class="small-button hidden">上传图片</button></div><div class="preview-tools"><select id="previewZoom" aria-label="预览缩放" title="只改变查看大小，不改变导出尺寸"><option value="fit">适应窗口</option><option value="1.5">放大 1.5×</option><option value="2">放大 2×</option><option value="actual">原始像素</option></select><button id="previewFullscreen" class="small-button" title="全屏预览 · Esc 退出" aria-label="全屏预览" aria-pressed="false">${icon('expand')}<span>全屏</span></button></div></div>
<div class="stage" id="stage" tabindex="0" aria-label="预览画布；放大后可滚动查看"><div class="stage-surface" id="stageSurface"><div class="canvas-frame" id="canvasFrame"><canvas id="preview" aria-label="日志动画预览"></canvas></div></div></div>
<div class="transport"><div class="play-controls"><button id="restart" class="icon-button" title="从头播放">${icon('reset')}</button><button id="play" class="play-button" title="播放" aria-label="播放" aria-pressed="false" data-playing="false">${icon('play').replace('<svg ','<svg class="play-icon" aria-hidden="true" ')}${icon('pause').replace('<svg ','<svg class="pause-icon" aria-hidden="true" ')}</button><span id="timeLabel" class="time-label"></span></div><input id="scrubber" type="range" min="0" max="143" step="0.01" value="0" aria-label="播放进度"><div class="transport-right"><span id="visibleCount"></span><select id="quickSpeed" aria-label="播放倍率"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="4">4×</option><option value="10">10×</option></select></div><span id="timelineHint" class="sr-only">时间戳驱动 · 可拖动预览</span></div></section>
<aside class="editor-panel"><nav class="tabs"><button data-tab="content" class="active">${icon('code')}日志</button><button data-tab="composition">${icon('play')}视频合成</button><button data-tab="settings">${icon('settings')}画布</button></nav>
<div id="contentTab" class="tab-content"><section class="editor-section"><div class="section-title"><h2>日志脚本</h2><span class="pill">CSV 日志</span></div><label class="field-label" for="sample">示例场景</label><select id="sample">${samples.map(sample=>`<option value="${sample.id}">${sample.label}</option>`).join('')}<option value="custom" hidden>自定义日志 / 已编辑</option></select><div class="import-row"><button id="importCSV" class="button">${icon('upload')}导入 CSV</button><button id="downloadCSV" class="button">${icon('download')}下载 CSV</button></div><div id="multiScene" class="hidden"><label class="field-label">导入文件中的场景</label><select id="importedScene"></select></div><p class="help">英文 / 中文各一列，支持双语。播放秒数决定出现时刻，原始时间戳用于上屏。type 用于文字配色。内置示例为模拟数据。</p></section>
<section class="editor-section logo-section"><details><summary><span><span class="section-number">01</span>头部 TUI 图案</span><span class="summary-hint">可粘贴替换 ${icon('arrow')}</span></summary><textarea id="logoInput" class="logo-input" spellcheck="false" aria-label="头部 TUI 图案"></textarea><button id="resetLogo" class="text-button">恢复默认 Agent 图案</button></details></section>
<section class="editor-section log-section"><div class="section-title"><h2><span class="section-number">02</span>日志内容 <span id="rowCount" class="count">0</span></h2><button id="addRow" class="small-button">${icon('plus')}添加</button></div><div class="log-tools"><span><i class="legend thinking"></i>思考 <i class="legend action"></i>行动</span><button id="compress" class="text-button">压缩长等待</button></div><div class="list-columns"><span>播放秒数 / 时间戳</span><span>内容 · 点击编辑</span></div><div id="logList" class="log-list"></div></section></div>
<div id="settingsTab" class="tab-content hidden"><section class="editor-section"><div class="section-title"><h2>显示设置</h2><span class="pill">实时生效</span></div><label class="toggle-row"><span>头部 TUI Logo<small>在画面顶部显示字符图案</small></span><input id="showLogo" type="checkbox" class="switch"></label><label class="toggle-row"><span>显示时间戳<small>显示每条日志的原始时刻</small></span><input id="showTimestamp" type="checkbox" class="switch"></label><label class="field-label">显示语言</label><div class="segments language-control" id="language"><button data-lang="en">English</button><button data-lang="zh">中文</button><button data-lang="both">双语</button></div></section>
<section class="editor-section" id="typeColorSettings"><div class="section-title"><h2>日志类型配色</h2><button id="resetTypeColors" class="text-button">恢复默认</button></div><p class="help">灰蓝反馈为主，青绿调用、淡紫指令作区分；think 保持原来的柔白。</p><div class="type-color-fields">${Object.entries(typeLabels).map(([type,label])=>`<div class="type-color-row"><label for="typeColor-${type}"><b>${type}</b><small>${label}</small></label><input id="typeColor-${type}" type="color" data-type-color="${type}" aria-label="${type} 文字颜色"><input id="typeHex-${type}" type="text" data-type-hex="${type}" maxlength="7" spellcheck="false" aria-label="${type} 文字颜色 HEX"></div>`).join('')}</div><div class="type-color-preview" aria-label="类型配色示例">${Object.keys(typeLabels).map(type=>`<div data-type-example="${type}">[${type}] ${typeLabels[type]}</div>`).join('')}</div><p class="help">整行文字按 type 着色，时间戳保持灰色。think 思考中的流光由下方发光设置控制。旧 CSV 无 type 时保留原配色；预览与导出同步生效。</p></section>
<section class="editor-section"><h2>思考文字发光</h2><div class="glow-color-row"><label for="glowColor">发光颜色</label><input id="glowColor" type="color" aria-label="发光颜色"><input id="glowHex" type="text" maxlength="7" spellcheck="false" aria-label="发光颜色 HEX" placeholder="#ffffff"></div><div class="setting-slider"><label for="glowStrength">光晕强度 <output id="glowStrengthValue"></output></label><input id="glowStrength" type="range" min="0" max="100" step="1"></div><p class="help">颜色同时用于流光与思考点阵。降低强度可减少文字周围的光晕；设为 0 仅保留清晰的流光渐变。预览与导出同步生效。</p></section>
<section class="editor-section"><h2>画布与排版</h2><label class="field-label" for="preset">画布尺寸</label><select id="preset"><option value="1280x720">横屏 · 1280 × 720</option><option value="1920x1080">全高清 · 1920 × 1080</option><option value="1080x1920">竖屏 · 1080 × 1920</option><option value="1080x1080">方形 · 1080 × 1080</option><option value="custom">自定义</option></select><div class="two-fields"><label>宽度 · px<input id="width" type="number" min="320" max="3840" step="2"></label><span>×</span><label>高度 · px<input id="height" type="number" min="240" max="2160" step="2"></label></div><div class="setting-slider"><label for="mainSize">思考字号 <output id="mainSizeValue"></output></label><input id="mainSize" type="range" min="12" max="80"></div><div class="setting-slider"><label for="actionSize">行动字号 <output id="actionSizeValue"></output></label><input id="actionSize" type="range" min="10" max="64"></div><div class="setting-slider"><label for="padding">画布边距 <output id="paddingValue"></output></label><input id="padding" type="range" min="16" max="160"></div><p class="help">文字按画布宽度自动换行，预览按比例缩放。</p></section>
<section class="editor-section"><h2>播放与行为</h2><div class="two-fields playback-fields"><label>播放倍率<input id="speed" type="number" min="0.1" max="100" step="0.1"></label><label>片尾停留 · 秒<input id="tail" type="number" min="1" max="30" step="1"></label></div><p class="help">倍率同时影响预览与导出。片尾停留按脚本时间计算。</p><label class="toggle-row"><span>自动折叠已完成行动<small>保留思考，收起该段的行动明细</small></span><input id="collapse" type="checkbox" class="switch"></label><div class="info-note">当前思考以点阵与流光呈现；行动输出完成后恢复静态。关闭折叠时，内容超出画布会自动向上滚动。</div></section></div>
<div id="compositionTab" class="tab-content hidden"><section class="editor-section"><div class="section-title"><h2>原视频</h2><span class="pill">01 / SOURCE</span></div><div class="import-row"><button id="uploadVideo" class="button">${icon('upload')}上传视频</button>${videoExamples.map(example=>`<button id="${example.buttonId}" data-video-example="${example.id}" class="button">载入${example.label}</button>`).join('')}</div><p id="mediaStatus" class="help" role="status">上传原视频，或直接载入完整示例的素材、日志与阶段字幕。</p><progress id="mediaProgress" class="hidden" max="100" value="0"></progress><div id="mediaInfo" class="media-info hidden"></div><label class="toggle-row"><span>预览与导出完整成片<small>视频、运行日志、标题与阶段字幕一起输出</small></span><input id="compositionEnabled" type="checkbox" class="switch"></label><button id="removeVideo" class="text-button hidden">移除当前素材</button></section>
<section class="editor-section"><div class="section-title"><h2>画面与同步</h2><span class="pill">02 / COMPOSE</span></div><label class="field-label" for="compositionTitle">成片标题<input id="compositionTitle" maxlength="80" placeholder="Agent 思维链"></label><label class="field-label" for="compositionSubtitle">副标题<input id="compositionSubtitle" maxlength="120"></label><label class="field-label" for="compositionCredit">来源署名<input id="compositionCredit" maxlength="160" placeholder="素材作者或来源"></label><div class="two-fields"><label>片段起点 · 原视频秒数<input id="sourceStart" type="number" min="0" step="0.01"></label><label>片段终点 · 原视频秒数<input id="sourceEnd" type="number" min="0" step="0.01"></label></div><label class="field-label" for="logOffset">日志延迟 · 秒<input id="logOffset" type="number" step="0.01" min="-1200" max="1200"></label><p class="help">日志与阶段字幕的 0 秒对应片段起点；正延迟让文字晚出现，负延迟让文字提前出现。</p><label class="field-label" for="videoFit">视频显示<select id="videoFit"><option value="contain">完整画面 · 保留比例</option><option value="cover">铺满区域 · 居中裁切</option></select></label><label class="toggle-row"><span>保留原声<small>口令、反馈与环境声音同步导出</small></span><input id="keepAudio" type="checkbox" class="switch"></label><label class="toggle-row"><span>日志黑白排版<small>关闭后使用「画布」中的日志类型配色</small></span><input id="monochrome" type="checkbox" class="switch"></label></section>
<section class="editor-section"><div class="section-title"><h2>阶段字幕</h2><button id="addPhase" class="small-button">${icon('plus')}添加</button></div><p class="help">出现在成片底部，可随动作切换。点击条目编辑时间、标题与说明。</p><div id="phaseList" class="phase-list"></div></section></div>
<div class="editor-footer"><span class="live-dot"></span>本地工作空间<span id="durationSummary"></span></div></aside></main>
<input id="csvFile" type="file" accept=".csv,text/csv" hidden><input id="imageFile" type="file" accept="image/*" hidden><input id="videoFile" type="file" accept="video/*,.mp4,.mov,.mkv,.webm" hidden><video id="sourceVideo" preload="auto" playsinline hidden></video>
<dialog id="phaseDialog"><form id="phaseForm"><div class="dialog-heading"><h2>阶段字幕</h2><button type="button" class="icon-button" data-close="phaseDialog">${icon('close')}</button></div><input id="phaseIndex" type="hidden"><label class="field-label" for="phaseTime">出现时间 · 秒<input id="phaseTime" type="number" min="0" step="0.01" required></label><label class="field-label" for="phaseTitle">阶段标题<input id="phaseTitle" maxlength="80" required></label><label class="field-label" for="phaseDetail">阶段说明<textarea id="phaseDetail" maxlength="160" rows="3"></textarea></label><div class="dialog-actions"><button type="button" id="deletePhase" class="button danger">删除</button><button class="button primary" type="submit">保存字幕</button></div></form></dialog>
<dialog id="rowDialog"><form id="rowForm"><div class="dialog-heading"><div><div class="eyebrow">LOG ENTRY</div><h2 id="rowDialogTitle">编辑日志</h2></div><button type="button" class="icon-button" data-close="rowDialog">${icon('close')}</button></div><input id="editId" type="hidden"><div class="two-fields"><label>日志层级<select id="editLevel"><option value="thinking">一级 · 思考</option><option value="action">二级 · 行动</option></select></label><label>出现时间 · 秒<input id="editTime" type="number" min="0" step="0.01" required></label></div><label class="field-label">日志类型 · type<input id="editType" type="text" list="logTypes" maxlength="48" placeholder="未指定 · 使用旧版配色" spellcheck="false"><datalist id="logTypes"><option value="think">思考</option><option value="feed">反馈</option><option value="action">调用</option><option value="instruction">指令</option></datalist></label><label class="field-label">上屏时间戳<input id="editTimestamp" type="text" placeholder="09:00:00"></label><label class="field-label">English<textarea id="editEn" rows="4" placeholder="What is your agent thinking or doing?"></textarea></label><label class="field-label">中文<textarea id="editZh" rows="3" placeholder="输入对应的中文文案（可选）"></textarea></label><p class="help">层级决定字号和缩进，type 决定配色。支持思考前的独立反馈；修改时间后自动排序。</p><div class="dialog-actions"><button type="button" id="deleteRow" class="button danger">删除此条</button><button type="submit" class="button primary">保存日志</button></div></form></dialog>
<dialog id="exportDialog"><div class="dialog-heading"><div><div class="eyebrow">READY FOR YOUR NEXT CUT</div><h2>导出视频</h2></div><button class="icon-button" data-close="exportDialog">${icon('close')}</button></div><div class="export-spec"><span id="exportDimensions"></span><span id="exportDuration"></span><span id="exportBackgroundLabel">纯黑背景</span></div><label class="field-label">视频格式<select id="exportFormat"><option value="mp4">MP4 · 黑色背景 / 推荐</option><option value="webm">WebM · VP9 / 透明背景</option><option value="mov">MOV · ProRes 4444 / 剪辑素材</option></select></label><div class="two-fields"><label>帧率<select id="exportFPS"><option value="60">60 fps · 推荐</option><option value="30">30 fps</option><option value="24">24 fps</option></select></label><label>导出范围<select id="exportRange"><option value="all">完整脚本</option><option value="preview">从当前时刻起 5 秒</option></select></label></div><p id="exportHelp" class="help">导出日志与动效，背景为纯黑色。60 fps 呈现更连贯的流光；叠加到其他视频时可使用滤色混合模式。</p><div id="exportStatus" class="export-status">准备就绪</div><progress id="exportProgress" max="100" value="0"></progress><div class="dialog-actions"><button id="cancelExport" class="button hidden">取消导出</button><a id="downloadVideo" class="button hidden" download>下载视频</a><button id="startExport" class="button primary">${icon('download')}开始导出</button></div></dialog><div id="toast" role="status"></div>`;
const canvas=$('#preview');
const sourceVideo=$('#sourceVideo');
const composed=()=>composition.enabled&&media?.status==='ready';
const timelineEnd=()=>composed()?composition.sourceEnd-composition.sourceStart:endTime(rows,settings);
const outputSize=()=>`${settings.width} × ${settings.height}`;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function save(){if(imported?.length&&rows.length){const scene=rows[0].scene;imported=[...imported.filter(r=>r.scene!==scene),...rows];}try{localStorage.setItem(STORAGE_KEY,JSON.stringify({settings,rows,imported,composition,media}));$('#saveState').innerHTML='<i></i> 已保存到本机';}catch{$('#saveState').textContent='存储已满，请下载 CSV 备份';}}
function changed(){dirty=true;$('#sample').value='custom';save();refresh();}
function syncSettings(){for(const type of Object.keys(defaultTypeColors)){const color=settings.typeColors[type];$('#typeColor-'+type).value=color;$('#typeHex-'+type).value=color;document.querySelector(`[data-type-example="${type}"]`).style.color=color;}$('#glowColor').value=settings.glowColor;$('#glowHex').value=settings.glowColor;$('#glowStrengthValue').textContent=settings.glowStrength+'%';for(const key of ['showLogo','showTimestamp','collapse'])$('#'+key).checked=settings[key];for(const key of ['width','height','mainSize','actionSize','padding','speed','tail','glowStrength'])$('#'+key).value=settings[key];for(const key of ['mainSize','actionSize','padding'])$('#'+key+'Value').textContent=settings[key]+' px';$('#logoInput').value=settings.logo;$('#quickSpeed').value=String(settings.speed);$('#preset').value=[...$('#preset').options].some(o=>o.value===`${settings.width}x${settings.height}`)?`${settings.width}x${settings.height}`:'custom';document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('selected',b.dataset.lang===settings.language));}
function refresh(){syncSettings();syncComposition();$('#canvasSize').textContent=outputSize();$('#canvasFrame').style.aspectRatio=`${settings.width} / ${settings.height}`;fitCanvas();$('#scrubber').max=timelineEnd();time=Math.min(time,timelineEnd());$('#rowCount').textContent=rows.length;$('#durationSummary').textContent=`${formatDuration(timelineEnd()/settings.speed)} 成片`;draw();}
function fitCanvas(){
 const area=$('#stage'),ratio=settings.width/settings.height;
 const fitWidth=Math.max(1,Math.min(area.clientWidth-16,(area.clientHeight-16)*ratio));
 const width=previewZoom==='actual'?settings.width:fitWidth*(previewZoom==='fit'?1:Number(previewZoom));
 const height=width/ratio;
 $('#canvasFrame').style.width=width+'px';$('#canvasFrame').style.height=height+'px';
 $('#stageSurface').style.width=Math.max(area.clientWidth,width+16)+'px';
 $('#stageSurface').style.height=Math.max(area.clientHeight,height+16)+'px';
}
function setPreviewFocus(active){
 previewFocused=active;$('#previewPanel').classList.toggle('preview-focused',active);
 $('#previewFullscreen').setAttribute('aria-pressed',String(active));
 $('#previewFullscreen').setAttribute('aria-label',active?'退出全屏预览':'全屏预览');
 $('#previewFullscreen').title=active?'退出全屏预览 · Esc':'全屏预览 · Esc 退出';
 $('#previewFullscreen').innerHTML=icon(active?'close':'expand')+`<span>${active?'退出':'全屏'}</span>`;
 requestAnimationFrame(fitCanvas);
}
async function togglePreviewFocus(){
 if(previewFocused){if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});nativePreviewFullscreen=false;setPreviewFocus(false);}
 else{setPreviewFocus(true);try{await $('#previewPanel').requestFullscreen?.();nativePreviewFullscreen=!!document.fullscreenElement;}catch{/* Embedded browsers fall back to filling the available window. */}}
}
$('#previewZoom').onchange=e=>{previewZoom=e.target.value;fitCanvas();$('#stage').scrollTop=0;$('#stage').scrollLeft=Math.max(0,($('#stage').scrollWidth-$('#stage').clientWidth)/2);};
$('#previewFullscreen').onclick=togglePreviewFocus;
document.addEventListener('fullscreenchange',()=>{if(nativePreviewFullscreen&&!document.fullscreenElement){nativePreviewFullscreen=false;setPreviewFocus(false);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&previewFocused){e.preventDefault();void togglePreviewFocus();}});

// Keep pointer targets mounted between mousedown and mouseup while frames render.
function syncPlaybackButton(){
 const button=$('#play'),state=String(playing);
 if(button.dataset.playing===state)return;
 button.dataset.playing=state;
 button.setAttribute('aria-pressed',state);
 button.setAttribute('aria-label',playing?'暂停':'播放');
 button.title=playing?'暂停':'播放';
}
function draw(){
 syncSourceVideo();const info=composed()?renderComposition(canvas,rows,settings,time,composition,media,sourceVideo,Number($('#exportFPS').value)):renderFrame(canvas,rows,settings,time);
 $('#timeLabel').innerHTML=`${formatDuration(time/settings.speed)} <em>/ ${formatDuration(timelineEnd()/settings.speed)}</em>`;$('#visibleCount').textContent=`${info.visibleCount} / ${rows.length} 条`;$('#scrubber').value=time;$('#scrubber').style.setProperty('--progress',`${100*time/timelineEnd()}%`);syncPlaybackButton();
}
function renderList(){let group=0;$('#logList').innerHTML=rows.map((r,i)=>{if(r.level==='thinking')group++;return `<button class="log-row ${r.level}" data-id="${escape(r.id)}"><div class="row-time"><b>${Number(r.time).toFixed(1)}<small>s</small></b><span>${escape(r.timestamp)}</span></div><div class="row-copy"><span class="row-tag">${r.level==='thinking'?`思考 ${String(group).padStart(2,'0')}`:'↳ 行动'}${r.type?` · ${escape(r.type)}`:''}</span><p>${escape(r.en||r.zh)}</p>${r.zh&&r.en?`<p class="row-zh">${escape(r.zh)}</p>`:''}</div><span class="row-index">${String(i+1).padStart(2,'0')}</span></button>`;}).join('');}
async function loadSample(value){try{
 const sample=samples.find(item=>item.id===value);
 if(!sample)throw Error('示例不存在');
 const response=await fetch(sample.file);
 if(!response.ok)throw Error('无法载入示例');
 const data=readCSV(await response.text());
 rows=data;$('#sample').value=value;imported=[];$('#multiScene').classList.add('hidden');time=0;playing=false;dirty=false;renderList();save();refresh();$('#timelineHint').textContent='模拟示例 · 按播放秒数输出';
}catch(e){toast(e.message);}}
$('#sample').addEventListener('change',e=>{if(e.target.value!=='custom')loadSample(e.target.value);});
$('#play').onclick=()=>{if(time>=timelineEnd())time=0;playing=!playing;draw();};$('#restart').onclick=()=>{time=0;playing=false;draw();};$('#scrubber').oninput=e=>{time=Number(e.target.value);draw();};
function animate(now){if(lastTick&&playing){time=composed()&&!sourceVideo.paused?Math.min(timelineEnd(),Math.max(0,sourceVideo.currentTime-composition.sourceStart)):Math.min(timelineEnd(),time+(now-lastTick)/1000*settings.speed);if(time>=timelineEnd()-.005)playing=false;draw();}lastTick=now;requestAnimationFrame(animate);}requestAnimationFrame(animate);
new ResizeObserver(fitCanvas).observe($('#stage'));
function selectTab(tab){activeTab=tab;document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));for(const name of ['content','settings','composition'])$('#'+name+'Tab').classList.toggle('hidden',tab!==name);}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
for(const key of ['showLogo','showTimestamp','collapse'])$('#'+key).onchange=e=>{settings[key]=e.target.checked;changed();};
for(const key of ['width','height','mainSize','actionSize','padding','speed','tail','glowStrength'])$('#'+key).addEventListener(['width','height','speed','tail'].includes(key)?'change':'input',e=>{const next={...settings,[key]:Number(e.target.value)};try{validateSettings(next);settings=next;changed();}catch(err){toast(err.message);syncSettings();}});
function setGlowColor(value){const next={...settings,glowColor:value.trim().toLowerCase()};try{validateSettings(next);settings=next;changed();}catch(err){toast(err.message);syncSettings();}}
$('#glowColor').oninput=e=>setGlowColor(e.target.value);
$('#glowHex').onchange=e=>setGlowColor(e.target.value);
function setTypeColor(type,value){const next={...settings,typeColors:{...settings.typeColors,[type]:value.trim().toLowerCase()}};try{validateSettings(next);settings=next;changed();}catch(err){toast(err.message);syncSettings();}}
document.querySelectorAll('[data-type-color]').forEach(input=>input.oninput=e=>setTypeColor(input.dataset.typeColor,e.target.value));
document.querySelectorAll('[data-type-hex]').forEach(input=>input.onchange=e=>setTypeColor(input.dataset.typeHex,e.target.value));
$('#resetTypeColors').onclick=()=>{settings={...settings,typeColors:{...defaultTypeColors}};changed();toast('已恢复默认类型配色');};
$('#quickSpeed').onchange=e=>{settings.speed=Number(e.target.value);changed();};
$('#preset').onchange=e=>{if(e.target.value==='custom')return;const [width,height]=e.target.value.split('x').map(Number);settings={...settings,width,height};changed();};
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{settings.language=b.dataset.lang;changed();});
$('#logoInput').oninput=e=>{if(e.target.value.length>10000)return toast('Logo 最多 10000 字符');settings.logo=e.target.value;save();draw();};$('#resetLogo').onclick=()=>{settings.logo=defaults.logo;changed();};
function updateBackground(){const frame=$('#canvasFrame');frame.classList.toggle('checker',bgMode==='transparent');frame.style.backgroundColor=bgMode==='solid'?bgColor:bgMode==='image'?'#10171c':'';frame.style.backgroundImage=bgMode==='image'&&imageURL?`url("${imageURL}")`:'';$('#bgColor').classList.toggle('hidden',bgMode!=='solid');$('#imagePick').classList.toggle('hidden',bgMode!=='image');document.querySelectorAll('[data-bg]').forEach(b=>b.classList.toggle('selected',b.dataset.bg===bgMode));}
document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{bgMode=b.dataset.bg;updateBackground();if(bgMode==='image'&&!imageURL)$('#imageFile').click();});$('#bgColor').oninput=e=>{bgColor=e.target.value;updateBackground();};$('#imagePick').onclick=()=>$('#imageFile').click();$('#imageFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const bitmap=await createImageBitmap(file);bitmap.close();if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);bgMode='image';updateBackground();}catch{toast('无法读取该图片，请使用 PNG、JPG 或 WebP');}e.target.value='';};
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('#downloadCSV').onclick=()=>download(writeCSV(rows),`${APP_ID}-script.csv`,'text/csv;charset=utf-8');$('#importCSV').onclick=()=>$('#csvFile').click();
$('#csvFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>8e6)throw Error('CSV 最大支持 8 MB');const data=readCSV(await f.text());const scenes=[...new Set(data.map(r=>r.scene))];imported=data;$('#importedScene').innerHTML=scenes.map(s=>`<option>${escape(s)}</option>`).join('');$('#multiScene').classList.toggle('hidden',scenes.length<2);rows=data.filter(r=>r.scene===scenes[0]);time=0;playing=false;renderList();changed();toast(`已导入 ${data.length} 条日志${scenes.length>1?`，包含 ${scenes.length} 个场景`:''}`);}catch(err){toast(err.message);}e.target.value='';};
$('#importedScene').onchange=e=>{rows=imported.filter(r=>r.scene===e.target.value);time=0;playing=false;renderList();changed();};
$('#compress').onclick=()=>{if(composed())return toast('完整成片按原视频时间同步；请编辑各条日志的出现时间。');rows=compressWaits(rows);time=0;playing=false;renderList();changed();$('#timelineHint').textContent='等待间隔上限 3 秒 · 原始时间戳保留';toast('已将超过 3 秒的等待压缩为 3 秒');};
function openRow(id){const r=rows.find(r=>r.id===id);$('#rowDialogTitle').textContent=r?'编辑日志':'添加日志';$('#editId').value=r?.id||'';$('#editType').value=r?.type||(!r&&rows.some(row=>row.type)?'action':'');$('#editLevel').value=r?.level||(rows.length?'action':'thinking');$('#editTime').value=r?.time??((rows.at(-1)?.time||0)+2);$('#editTimestamp').value=r?.timestamp||formatClock((rows.at(-1)?.time||0)+2);$('#editEn').value=r?.en||'';$('#editZh').value=r?.zh||'';$('#deleteRow').classList.toggle('hidden',!r);$('#rowDialog').showModal();}
$('#logList').onclick=e=>{const b=e.target.closest('[data-id]');if(b)openRow(b.dataset.id);};$('#addRow').onclick=()=>openRow();
$('#rowForm').onsubmit=e=>{e.preventDefault();const id=$('#editId').value;const row={...(rows.find(r=>r.id===id)||{}),id:id||crypto.randomUUID(),scene:rows[0]?.scene||'01',level:$('#editLevel').value,time:Number($('#editTime').value),timestamp:$('#editTimestamp').value.trim(),en:$('#editEn').value.trim(),zh:$('#editZh').value.trim()};const type=$('#editType').value.trim().toLowerCase();if(type)row.type=type;else delete row.type;try{const list=reparent((id?rows.map(r=>r.id===id?row:r):[...rows,row]).sort((a,b)=>a.time-b.time));validateRows(list);rows=list;renderList();changed();$('#rowDialog').close();}catch(err){toast(err.message);}};
$('#deleteRow').onclick=()=>{const id=$('#editId').value;const r=rows.find(r=>r.id===id);if(r&&!r.parent&&rows.some(r=>r.parent===id))return toast('请先删除或重新归属该段落下的明细，再删除主行。');try{const list=reparent(rows.filter(r=>r.id!==id));validateRows(list);rows=list;renderList();changed();$('#rowDialog').close();}catch(e){toast(e.message);}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function syncExportFormat(){
 if(composed())$('#exportFormat').value='mp4';$('#exportFormat').disabled=composed();
 $('#exportFormat').options[0].textContent=composed()?'MP4 · 完整成片 / 原视频与日志':'MP4 · 黑色背景 / 推荐';
 const black=$('#exportFormat').value==='mp4';$('#exportBackgroundLabel').textContent=composed()?(composition.keepAudio&&media.hasAudio?'完整成片 · 原声':'完整成片 · 静音'):black?'纯黑背景':'Alpha 透明';$('#exportHelp').textContent=composed()?'将当前预览中的原视频、日志、标题与阶段字幕合成为完整 MP4。导出期间可以关闭此面板，任务会继续运行。':black?'导出日志与动效，背景为纯黑色。60 fps 呈现更连贯的流光；叠加到其他视频时可使用滤色混合模式。':'导出日志与动效并保留透明通道，预览背景不会写入视频。';
}
$('#exportFormat').onchange=syncExportFormat;
$('#exportFPS').onchange=()=>draw();
$('#exportOpen').onclick=()=>{syncExportFormat();playing=false;draw();$('#exportDimensions').textContent=outputSize()+' px';$('#exportDuration').textContent=`${formatDuration(timelineEnd()/settings.speed)} 成片`;$('#exportRange').options[0].textContent=composed()?'完整视频片段':'完整脚本';$('#exportDialog').showModal();};
const api=async(path,options)=>{const res=await fetch(path,options);const data=await res.json();if(!res.ok)throw Error(data.error||'导出服务暂不可用');return data;};
$('#startExport').onclick=async()=>{try{validateRows(rows);validateSettings(settings);if(composed())validateComposition(composition,media);const start=$('#exportRange').value==='preview'?time:0;const duration=$('#exportRange').value==='preview'?Math.min(5,(timelineEnd()-start)/settings.speed):(timelineEnd()/settings.speed);$('#startExport').disabled=true;$('#downloadVideo').classList.add('hidden');$('#exportStatus').textContent='准备渲染…';$('#exportProgress').value=0;
 const data=await api('/api/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,settings,format:$('#exportFormat').value,fps:Number($('#exportFPS').value),start,duration,...(composed()?{composition:{...composition,mediaId:media.id}}:{})})});jobId=data.id;$('#cancelExport').classList.remove('hidden');pollExport();
 }catch(e){$('#exportStatus').textContent=e.message;$('#startExport').disabled=false;}};
async function pollExport(){if(!jobId)return;try{const job=await api(`/api/exports/${jobId}`);$('#exportProgress').value=job.progress;$('#exportStatus').textContent=job.message;if(job.status==='done'){$('#downloadVideo').href=`/api/exports/${jobId}/download`;$('#downloadVideo').classList.remove('hidden');finishExport();}else if(['error','cancelled'].includes(job.status))finishExport();else setTimeout(pollExport,800);}catch(e){$('#exportStatus').textContent=e.message;finishExport();}}
function finishExport(){jobId=null;$('#startExport').disabled=false;$('#cancelExport').classList.add('hidden');}
$('#cancelExport').onclick=async()=>{if(jobId)try{await api(`/api/exports/${jobId}`,{method:'DELETE'});}catch(e){toast(e.message);}};

function syncComposition(){
 $('#compositionEnabled').checked=composition.enabled;$('#compositionEnabled').disabled=!media;
 for(const [id,key] of Object.entries({compositionTitle:'title',compositionSubtitle:'subtitle',compositionCredit:'credit',sourceStart:'sourceStart',sourceEnd:'sourceEnd',logOffset:'logOffset',videoFit:'fit'}))$('#'+id).value=composition[key];
 $('#sourceStart').max=$('#sourceEnd').max=media?.duration||0;$('#keepAudio').checked=composition.keepAudio;$('#keepAudio').disabled=!media?.hasAudio;$('#monochrome').checked=composition.monochrome;
 $('#mediaInfo').classList.toggle('hidden',!media);$('#removeVideo').classList.toggle('hidden',!media);
 if(media)$('#mediaInfo').textContent=`${media.name}\n${media.width} × ${media.height} · ${media.duration.toFixed(2)} 秒${media.hasAudio?' · 有原声':''}`;
 $('#backgroundModes').closest('.background-control').classList.toggle('hidden',composed());
 const phaseKey=JSON.stringify(composition.phases);
 if($('#phaseList').dataset.key!==phaseKey){$('#phaseList').dataset.key=phaseKey;$('#phaseList').innerHTML=composition.phases.map((p,i)=>`<button class="phase-row" data-phase="${i}"><span>${p.time.toFixed(1)}s</span><b>${escape(p.title)}</b><small>${escape(p.detail)}</small></button>`).join('')||'<p class="help">尚未添加阶段字幕。</p>';}
 $('#addPhase').disabled=!media;
 $('#exportOpen').innerHTML=icon('download')+(composed()?'导出完整视频':'导出日志视频');
}
function syncSourceVideo(){
 if(!composed()){sourceVideo.pause();return;}
 sourceVideo.muted=!composition.keepAudio;
 try{sourceVideo.playbackRate=settings.speed;}catch{if(playing){playing=false;toast('浏览器预览支持的播放倍率为 0.1–16×；请降低倍率后播放。');}}
 const target=Math.min(media.duration-.001,composition.sourceStart+time);
 if(sourceVideo.readyState>=1&&!sourceVideo.seeking&&Math.abs(sourceVideo.currentTime-target)>(playing ? .2 : .001))sourceVideo.currentTime=target;
 if(playing&&sourceVideo.paused)sourceVideo.play().catch(()=>{playing=false;syncPlaybackButton();toast('视频暂时无法播放，请重新点击播放。');});
 if(!playing&&!sourceVideo.paused)sourceVideo.pause();
}
sourceVideo.onseeked=sourceVideo.onloadeddata=()=>draw();
sourceVideo.onended=()=>{playing=false;time=timelineEnd();draw();};
sourceVideo.onerror=()=>{playing=false;toast('无法载入预览视频，请重新上传素材。');};
function attachMedia(item){media=item;sourceVideo.src=item.url;sourceVideo.load();}
function updateComposition(next){
 try{if(media)validateComposition(next,media);composition=next;playing=false;save();refresh();}catch(error){toast(error.message);syncComposition();}
}
$('#compositionEnabled').onchange=e=>updateComposition({...composition,enabled:e.target.checked});
$('#keepAudio').onchange=e=>updateComposition({...composition,keepAudio:e.target.checked});
$('#monochrome').onchange=e=>updateComposition({...composition,monochrome:e.target.checked});
for(const [id,key] of Object.entries({compositionTitle:'title',compositionSubtitle:'subtitle',compositionCredit:'credit',sourceStart:'sourceStart',sourceEnd:'sourceEnd',logOffset:'logOffset',videoFit:'fit'}))$('#'+id).onchange=e=>updateComposition({...composition,[key]:['sourceStart','sourceEnd','logOffset'].includes(key)?Number(e.target.value):e.target.value});
$('#removeVideo').onclick=()=>{mediaPollToken++;media=null;composition={...compositionDefaults,phases:[]};playing=false;sourceVideo.pause();sourceVideo.removeAttribute('src');sourceVideo.load();save();refresh();$('#mediaStatus').textContent='已移除素材，可重新上传视频。';};
function mediaControls(busy,message){mediaBusy=busy;for(const id of ['uploadVideo',...videoExamples.map(example=>example.buttonId),'removeVideo','exportOpen'])$('#'+id).disabled=busy;$('#mediaStatus').textContent=message;$('#mediaProgress').classList.toggle('hidden',!busy);}
async function waitMedia(item,token){
 const deadline=Date.now()+10*60*1000;
 while(Date.now()<deadline){
  if(token!==mediaPollToken)throw Error('已取消素材载入');
  const state=await api(`/api/media/${item.id}`);$('#mediaProgress').value=state.progress;$('#mediaStatus').textContent=state.message;
  if(state.status==='ready')return state;if(['error','cancelled'].includes(state.status))throw Error(state.message);
  await new Promise(resolve=>setTimeout(resolve,700));
 }
 await api(`/api/media/${item.id}`,{method:'DELETE'});throw Error('视频准备超时，请尝试较短或较小的视频。');
}
function upload(file){
 return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();xhr.open('POST','/api/media');xhr.setRequestHeader('Content-Type','application/octet-stream');xhr.setRequestHeader('X-File-Name',encodeURIComponent(file.name));
  xhr.upload.onprogress=e=>{if(e.lengthComputable){$('#mediaProgress').value=Math.round(e.loaded/e.total*100);$('#mediaStatus').textContent=`正在上传 ${Math.round(e.loaded/e.total*100)}%…`;}};
  xhr.onload=()=>{try{const result=JSON.parse(xhr.responseText);xhr.status<300?resolve(result):reject(Error(result.error||'视频上传失败'));}catch{reject(Error('视频上传失败'));}};
  xhr.onerror=()=>reject(Error('上传连接中断，请重新选择视频'));xhr.send(file);
 });
}
$('#uploadVideo').onclick=()=>$('#videoFile').click();
$('#videoFile').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file||mediaBusy)return;
 if(file.size>MAX_MEDIA_BYTES)return toast('视频最大支持 200 MB');
 const token=++mediaPollToken;mediaControls(true,'正在上传视频…');$('#mediaProgress').value=0;
 try{
  const item=await waitMedia(await upload(file),token);
  const first=!media;composition={...composition,enabled:true,credit:'',sourceStart:0,sourceEnd:item.duration};
  if(videoExamples.some(example=>composition.title===example.composition.title)){composition.title=file.name.replace(/\.[^.]+$/,'').slice(0,80)||compositionDefaults.title;composition.subtitle=compositionDefaults.subtitle;}
  if(first){settings={...settings,width:1920,height:1080,showLogo:false};$('#exportFPS').value='30';}
  attachMedia(item);time=0;playing=false;save();refresh();mediaControls(false,'视频已就绪，可编辑日志、同步时间并导出完整成片。');
 }catch(error){mediaControls(false,error.message);}
};
for(const example of videoExamples)$('#'+example.buttonId).onclick=async()=>{
 if(mediaBusy)return;const token=++mediaPollToken;mediaControls(true,`正在载入${example.subject}示例素材…`);$('#mediaProgress').value=0;
 try{
  const response=await fetch(example.file);if(!response.ok)throw Error('无法载入示例日志');const exampleRows=readCSV(await response.text());
  const item=await waitMedia(await api(`/api/media/examples/${example.id}`,{method:'POST'}),token);
  rows=exampleRows;settings=structuredClone(example.settings);composition=structuredClone(example.composition);imported=[];$('#multiScene').classList.add('hidden');$('#sample').value=example.id;$('#exportFPS').value=String(example.fps);
  attachMedia(item);time=0;playing=false;renderList();save();refresh();mediaControls(false,`${example.subject}素材、${rows.length} 条日志与 ${composition.phases.length} 段阶段字幕已载入。`);
 }catch(error){mediaControls(false,error.message);}
};
function openPhase(index=-1){const p=composition.phases[index];$('#phaseIndex').value=index;$('#phaseTime').value=p?.time??time;$('#phaseTitle').value=p?.title||'';$('#phaseDetail').value=p?.detail||'';$('#deletePhase').classList.toggle('hidden',!p);$('#phaseDialog').showModal();}
$('#addPhase').onclick=()=>openPhase();$('#phaseList').onclick=e=>{const row=e.target.closest('[data-phase]');if(row)openPhase(Number(row.dataset.phase));};
$('#phaseForm').onsubmit=e=>{
 e.preventDefault();const index=Number($('#phaseIndex').value),p={time:Number($('#phaseTime').value),title:$('#phaseTitle').value.trim(),detail:$('#phaseDetail').value.trim()};
 const phases=composition.phases.slice();if(index<0)phases.push(p);else phases[index]=p;phases.sort((a,b)=>a.time-b.time);
 try{const next={...composition,phases};validateComposition(next,media||{duration:Math.max(1,next.sourceEnd)});composition=next;save();refresh();$('#phaseDialog').close();}catch(error){toast(error.message);}
};
$('#deletePhase').onclick=()=>{composition={...composition,phases:composition.phases.filter((p,i)=>i!==Number($('#phaseIndex').value))};save();refresh();$('#phaseDialog').close();};
if(stored){if(imported.length){const scenes=[...new Set(imported.map(r=>r.scene))];$('#importedScene').innerHTML=scenes.map(s=>`<option>${escape(s)}</option>`).join('');$('#importedScene').value=rows[0].scene;$('#multiScene').classList.toggle('hidden',scenes.length<2);}$('#sample').value='custom';renderList();refresh();}else await loadSample(samples[0].id);updateBackground();
if(media){try{const item=await api(`/api/media/${media.id}`);if(item.status!=='ready')throw Error('素材尚未就绪');attachMedia(item);refresh();$('#mediaStatus').textContent='已恢复上次的素材与合成设置。';}catch{media=null;composition.enabled=false;save();refresh();$('#mediaStatus').textContent='上次的视频素材不可用，请重新上传；日志与阶段字幕已保留。';}}
