# Agent Log Studio

**把任何视频做成 Agent 思维链，让每个动作都有一份足够专业的运行日志。**

猫伸爪，是末端执行器完成目标接触；人发呆，是推理引擎正在扩大搜索空间；连续选错，是探索策略主动采集负样本；吃口零食，是奖励信号开始胃部反向传播。只要日志写得够严肃，万物皆可具身智能。

Agent Log Studio 是本机运行的日志编辑与动画导出工具：为视频编写观察、推理、决策、执行与奖励日志，按时间线预览，再导出动画与原视频合成。支持 CSV 导入、逐条编辑和双语排版。你负责提供视频和剧本，它负责把胡说八道排版得像刚通过了论文评审。

## 猫咪 VLA 示例视频

让“大开门”听口令辨识萝卜和纸巾，再配上一本正经的 VLA 运行日志。完整成片为 45.6 秒，保留原视频的人类口令和猫咪动作，用 Geist 风格的黑白排版同步呈现视频、日志与当前目标。

下面是成片前 8.2 秒的动图：猫先碰纸巾，重发“萝卜”指令后纠正目标，随后获得奖励。

![猫咪 VLA 示例动图：探索纸巾、切换萝卜目标并获得奖励](docs/images/cat-vla-preview.gif)

日志示例：

```text
[policy] 回滚纸巾分支；橙色长条提升为主目标。
[reward] 收到真棒与食物；奖励梯度进入胃部。
[action] 切换纸巾目标；前爪提交热修复。
```

<details>
<summary>查看成片高清截图</summary>

纸巾识别与前爪执行：

![猫咪 VLA 成片截图：纸巾目标识别与运行日志](docs/images/cat-vla.png)

最后一轮目标纠正与“前爪热修复”：

![猫咪 VLA 成片截图：失效萝卜缓存并切换纸巾目标](docs/images/cat-vla-correction.png)

</details>

在编辑器示例菜单中选择「猫咪 VLA · 萝卜？纸巾？真棒！」，即可修改 [44 条双语日志](public/samples/cat-vla.csv)。网页导出生成日志动画；[示例脚本](scripts/make-cat-vla.mjs) 负责下载素材、调用项目导出接口，并合成视频、原声、Geist 界面与阶段字幕。

按下方「启动」步骤安装依赖并运行 `npm run dev`，另一个终端执行：

```sh
node scripts/make-cat-vla.mjs
```

完整成片输出到 `output/examples/cat-vla/cat-vla.mp4`，规格为 1920 × 1080、30 fps、H.264 / AAC。首次运行需要联网下载固定版本素材，并校验 SHA-256。脚本还需要系统 `ffmpeg`、`ffprobe`、`curl` 和中文字体；Chrome 不在默认路径时设置 `CHROME_PATH`，中文字体路径可用 `CAT_VLA_FONT` 指定。

README 展示用的截图和短动图保存在 `docs/images/`；原素材及完整生成产物保留在忽略的 `output/` 目录。素材作者为抖音「超级无敌大开门」（`dakaimenPYQ`），原水印和音轨均保留。更多来源与复现步骤见 [猫咪 VLA 示例说明](docs/猫咪VLA示例.md)。

## 启动

需要 Node.js 20.19+ 或 22.12+，视频导出还需要 Google Chrome。FFmpeg 由依赖自带。

```sh
npm ci
npm run dev
```

访问 <http://127.0.0.1:4320>，macOS 也可以双击 `启动 Agent Log Studio.command`。首次使用或切换平台时先运行 `npm ci`。

默认只监听本机。用 `PORT` 更改端口，Chrome 不在常见路径时设置 `CHROME_PATH`。草稿保存在当前浏览器、当前站点的本地存储中，键名为 `agent-log-studio-v1`。

生产模式：

```sh
npm run build
npm start
```

## 使用

1. 选择通用示例，或导入自己的 CSV；多场景文件支持切换，每次预览和导出一个场景。
2. 点击日志条目编辑文案、时间、层级和类型，也可以逐条添加或删除。
3. 在设置中调整双语、画布、字号、颜色、发光、Logo、播放倍率和折叠。
4. 播放、暂停、拖动时间轴；“压缩长等待”将相邻记录超过 3 秒的间隔缩短为 3 秒。
5. 下载当前场景 CSV，或导出完整视频／从当前时刻起最多 5 秒的样片。

脚本和设置自动保存；切换示例会替换当前脚本，请先下载要保留的 CSV。CSV 不包含配色等画布设置。纯色、图片和棋盘格背景只影响预览。

## CSV

```csv
id,scene,level,parent,timestamp,time,en,zh,shot,type
task-1,demo,thinking,,09:00:00,0,Planning the task.,正在规划任务。,,think
task-2,demo,action,task-1,09:00:01,1,Read the input.,读取输入。,,action
```

| 字段 | 含义 |
| --- | --- |
| `level` | `thinking` 主行、`action` 明细；控制字号与缩进。也支持 `1` / `2`、`思考` / `行动` |
| `type` | 可选：`think`、`feed`、`action`、`instruction` 控制配色；其他英文类型保留并以中性色显示 |
| `en` / `zh` | 英文与中文，至少一种非空；显示语言缺失时使用另一种 |
| `time` | 从片头开始的出现秒数，可为小数；同一场景按时间递增，允许相同 |
| `timestamp` | 上屏时间戳；没有 `time` 时可从 `HH:MM:SS` 推算相对时间，支持跨午夜 |
| `id` / `scene` | 可选：唯一行 ID 和场景标识 |
| `parent` | 可选：明细所属的前一个段落主行；带 `type` 的行可留空成为独立事件 |
| `shot` | 可选：镜头或外部对照标记，仅保留、不上屏 |

无 `type` 的双层 CSV 仍可导入，明细自动归入前一个主行。支持 UTF-8 BOM、CRLF、逗号、引号及带引号的多行文案。每次最多 2000 条日志；文件上传上限 8 MB。

## 视频导出

| 格式 | 背景 | 用途 |
| --- | --- | --- |
| MP4 / H.264（默认） | 纯黑 | 日常展示、黑底视频素材 |
| WebM / VP9 | Alpha 透明 | 支持透明视频的浏览器或剪辑流程 |
| MOV / ProRes 4444 | Alpha 透明 | 剪辑素材，体积较大 |

默认 60 fps，也支持 24 / 30 fps。导出使用 Chrome 逐帧渲染与 FFmpeg 编码，结果保存在 `output/exports/`；可查看进度、取消和下载。预览与导出共用同一 Canvas 渲染器。

成片时长为（最后一条出现秒数 + 片尾停留）÷ 播放倍率。单次最多 20 分钟或 36000 帧；画布支持 320–3840 × 240–2160，宽高必须为偶数。透明 MOV 沿用既有编码流程，部分 macOS 播放器的兼容问题尚未解决，需要在目标剪辑软件中确认。

## 开发

```sh
npm test
npm run build
# 先启动服务，再运行浏览器检查
npm run verify:playback
npm run verify:ui
```

浏览器检查默认连接 `http://127.0.0.1:4320`；可用 `AGENT_LOG_STUDIO_TEST_URL` 指定地址。`verify:ui` 会实际导出 5 秒 MP4，测试产物写入 `output/qa/`。

| 位置 | 职责 |
| --- | --- |
| `src/config.js` | 应用名称、端口、存储命名 |
| `src/samples.js`、`public/samples/` | 通用示例清单与 CSV |
| `src/model.js` | CSV、时间、层级、默认设置和校验 |
| `src/render.js` | 共用 Canvas 渲染与动画 |
| `src/main.js`、`src/style.css` | 编辑器、预览和交互 |
| `server.mjs`、`export.html` | 本地服务、逐帧渲染、编码与下载 |
| `tests/`、`scripts/verify-*.mjs` | 模型测试、播放和界面验证 |

添加内置示例时，在 `public/samples/` 放入 CSV，然后更新 `src/samples.js`。项目范围见 [项目说明](docs/项目说明.md)。
