import {defaults} from './model.js';
const duration=45.6;
export const catVLASource={
  creator:'超级无敌大开门',
  douyinAccount:'dakaimenPYQ',
  mirror:'https://github.com/Sean-Jian/xiaokaimen',
  commit:'03e34f48b85bfc32e593ab3ae58bf94f8758cc21',
  url:'https://raw.githubusercontent.com/Sean-Jian/xiaokaimen/03e34f48b85bfc32e593ab3ae58bf94f8758cc21/pictures%26audio/xiaokaimen.mp4',
  sha256:'97b4b658717419166bec11dd6405fd661ddc017ef0d5a8b69a33416040bd98a9',
  originalDuration:49.2,
  retainedRange:[0,duration],
};

export const catVLALogSettings={...defaults,width:1152,height:768,padding:32,mainSize:30,actionSize:26,
  language:'zh',showLogo:false,showTimestamp:false,collapse:false,tail:2,
  glowColor:'#ffffff',glowStrength:0,thinkingHold:3,
  typeColors:{think:'#ededed',feed:'#a1a1a1',action:'#ededed',instruction:'#ffffff'}};

export const catVLAPhases=[
  {time:0,title:'语言指令已入队',detail:'target=萝卜；actuator=前爪'},
  {time:3.3,title:'人类拒绝语义别名',detail:'重复指令触发策略回滚'},
  {time:8.2,title:'上下文切换：纸巾',detail:'清理萝卜缓存，重建目标索引'},
  {time:17.2,title:'命中萝卜目标缓存',detail:'复用已验证的橙色长条表征'},
  {time:22.0,title:'检测到目标迁移',detail:'人类移动萝卜；旧坐标租约失效'},
  {time:26.0,title:'目标热切换：纸巾',detail:'取消萝卜预取，保留奖励会话'},
  {time:30.4,title:'进入萝卜熟悉领域',detail:'不加载纸巾分支，直接执行短路径'},
  {time:33.3,title:'测试旋转不变表征',detail:'萝卜朝向改变，奖励语义保持不变'},
  {time:41.2,title:'目标切换：纸巾',detail:'连续萝卜任务结束；旧缓存待清理'},
];

export const catVLASettings={...catVLALogSettings,width:1920,height:1080,speed:1};
export const catVLAComposition={enabled:true,title:'猫咪 VLA',subtitle:'萝卜？纸巾？真棒！',credit:'来源：超级无敌大开门 · 抖音 dakaimenPYQ',sourceStart:0,sourceEnd:45.6,logOffset:0,keepAudio:true,monochrome:true,fit:'contain',phases:catVLAPhases};
