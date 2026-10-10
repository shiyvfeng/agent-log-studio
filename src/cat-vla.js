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
  glowColor:'#ffffff',glowStrength:0,
  typeColors:{think:'#ededed',feed:'#a1a1a1',action:'#ededed',instruction:'#ffffff'}};

export const catVLAPhases=[
  {time:0,title:'语言指令已入队',detail:'target=萝卜；actuator=前爪'},
  {time:1.7,title:'探索性接触：纸巾',detail:'正在验证纸巾是否也能被称为萝卜'},
  {time:3.3,title:'人类拒绝语义别名',detail:'重复指令触发策略回滚'},
  {time:4.2,title:'前爪路径重规划',detail:'回滚纸巾分支，转向橙色目标'},
  {time:4.6,title:'奖励信号已接收',detail:'真棒与食物组成多模态监督'},
  {time:8.2,title:'上下文切换：纸巾',detail:'清理萝卜缓存，重建目标索引'},
  {time:11.2,title:'推理超时，口令重发',detail:'确认不是网络重传；重新定位'},
  {time:12.1,title:'纸巾目标接触中',detail:'左侧路径生效，前爪获得读写权限'},
  {time:14.0,title:'奖励写入胃部缓存',detail:'本轮纠错样本可食用，已成功摄入'},
  {time:17.2,title:'命中萝卜目标缓存',detail:'复用已验证的橙色长条表征'},
  {time:18.8,title:'前爪执行缓存策略',detail:'萝卜接触确认；预期奖励即将返回'},
  {time:19.6,title:'奖励服务返回 200',detail:'反馈稳定，继续最大化真棒'},
  {time:22.0,title:'检测到目标迁移',detail:'人类移动萝卜；旧坐标租约失效'},
  {time:24.7,title:'启用萝卜接触预取',detail:'跟踪新坐标，提前建立前爪连接'},
  {time:26.0,title:'目标热切换：纸巾',detail:'取消萝卜预取，保留奖励会话'},
  {time:27.0,title:'多目标调度成功',detail:'纸巾事务已提交，食物完成结算'},
  {time:30.4,title:'进入萝卜熟悉领域',detail:'不加载纸巾分支，直接执行短路径'},
  {time:31.8,title:'启动胃部反向传播',detail:'食物包已接收，参数朝饱腹方向更新'},
  {time:33.3,title:'测试旋转不变表征',detail:'萝卜朝向改变，奖励语义保持不变'},
  {time:35.2,title:'复用旋转不变策略',detail:'横着竖着都能换粮，身份匹配完成'},
  {time:36.8,title:'策略持续获得奖励',detail:'奖励通道畅通，暂不支持下班'},
  {time:41.2,title:'目标切换：纸巾',detail:'连续萝卜任务结束；旧缓存待清理'},
  {time:42.8,title:'检测到缓存污染',detail:'口令为纸巾，前爪仍执行萝卜策略'},
  {time:43.4,title:'执行纸巾回退策略',detail:'失效旧缓存，前爪提交热修复'},
  {time:45.0,title:'任务闭环，开始消化',detail:'最终奖励到账；胃部接管后处理'},
];

export const catVLASettings={...catVLALogSettings,width:1920,height:1080,speed:1};
export const catVLAComposition={enabled:true,title:'猫咪 VLA',subtitle:'萝卜？纸巾？真棒！',credit:'来源：超级无敌大开门 · 抖音 dakaimenPYQ',sourceStart:0,sourceEnd:45.6,logOffset:0,keepAudio:true,monochrome:true,fit:'contain',phases:catVLAPhases};
