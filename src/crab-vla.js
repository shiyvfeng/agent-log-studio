import {defaults} from './model.js';

export const crabVLASource={
  creator:'Arthro',
  title:'Carcinus maenas walking on land',
  page:'https://commons.wikimedia.org/wiki/File:Carcinus_maenas_walking_on_land.ogv',
  url:'https://upload.wikimedia.org/wikipedia/commons/f/f4/Carcinus_maenas_walking_on_land.ogv',
  filename:'source.ogv',
  uploadedAt:'2012-09-11T16:51:57Z',
  sha256:'f05059e01ad1c0b24d9841d8211709982319909fa5de56395882e6ceb8575d0f',
  license:'CC0 1.0',
  licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  originalDuration:19.224,
  retainedRange:[0,19.2],
};

export const crabVLASettings={...defaults,width:1920,height:1080,padding:32,mainSize:30,actionSize:26,
  language:'zh',showLogo:false,showTimestamp:false,collapse:false,tail:2,speed:1,
  glowColor:'#ffffff',glowStrength:0,thinkingHold:3,
  typeColors:{think:'#ededed',feed:'#a1a1a1',action:'#ededed',instruction:'#ffffff'}};

export const crabVLAPhases=[
  {time:0,title:'岸线巡航服务已启动',detail:'八腿在线；横向导航为默认配置'},
  {time:5.6,title:'检测到海量外部更新',detail:'浪花进入视野；潮汐服务准备推送'},
  {time:8.4,title:'沙盒环境切换为水池',detail:'首批海水抵达；继续保持在线'},
  {time:12.5,title:'切换水陆运行模式',detail:'收到第二轮推送；不提供拒绝按钮'},
  {time:17.2,title:'提交潮汐接管权限',detail:'海水覆盖路径；本蟹进入托管模式'},
];

export const crabVLAComposition={enabled:true,title:'螃蟹 VLA',subtitle:'横着走，照样上线。',
  credit:'来源：Arthro · Wikimedia Commons · CC0',sourceStart:0,sourceEnd:19.2,
  logOffset:0,keepAudio:true,monochrome:true,fit:'contain',phases:crabVLAPhases};
