import {defaults} from './model.js';

export const tigerVLASource={
  creator:'Grendelkhan',
  title:'Tiger playing with a piece of wood in a pool',
  page:'https://commons.wikimedia.org/wiki/File:Tiger_playing_with_a_piece_of_wood_in_a_pool.webm',
  url:'https://upload.wikimedia.org/wikipedia/commons/2/2b/Tiger_playing_with_a_piece_of_wood_in_a_pool.webm',
  filename:'source.webm',
  sha256:'26d27bba60bacc405778d1fa3e0d9a816b8d92fa18ad2b8150efb380337dbd47',
  license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  originalDuration:37.037,
  retainedRange:[6,36.97],
};

export const tigerVLASettings={...defaults,width:1920,height:1080,padding:32,mainSize:30,actionSize:26,
  language:'zh',showLogo:false,showTimestamp:false,collapse:false,tail:2,speed:1,
  glowColor:'#ffffff',glowStrength:0,thinkingHold:3,
  typeColors:{think:'#ededed',feed:'#a1a1a1',action:'#ededed',instruction:'#ffffff'}};

export const tigerVLAPhases=[
  {time:0,title:'锁定漂浮目标',detail:'目标是木头，变量是水。'},
  {time:6,title:'尝试固定木头',detail:'前爪下压；水花暂时遮挡目标'},
  {time:12,title:'调整抓取姿态',detail:'转身改变接触角度；继续尝试'},
  {time:19,title:'切换近身控制',detail:'目标回到身前；再次拨动木头'},
  {time:27,title:'抓取任务自动续杯',detail:'木头仍在漂；保持跟踪与交互'},
];

export const tigerVLAComposition={enabled:true,title:'老虎 VLA',subtitle:'目标是木头，变量是水。',
  credit:'Grendelkhan · Wikimedia Commons · CC BY-SA 4.0',sourceStart:6,sourceEnd:36.97,
  logOffset:0,keepAudio:false,monochrome:true,fit:'contain',phases:tigerVLAPhases};
