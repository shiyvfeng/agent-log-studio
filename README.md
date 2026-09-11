# Agent Log Studio

通用 Agent 日志动画工具：编辑 CSV 日志、预览执行过程，再导出视频素材。适用于研究助手、工作流、工具调用等演示，也能导入自己的日志脚本。

这是本机运行的网页工具。当前输入方式为 CSV 导入和逐条编辑；内置示例均为模拟数据。

## 启动

需要 Node.js 20.19+ 或 22.12+，视频导出还需要 Google Chrome。FFmpeg 由依赖自带。

```sh
npm ci
npm run dev
```

访问 <http://127.0.0.1:4320>，macOS 也可以双击 `启动 Agent Log Studio.command`。本次迁入已复制本机依赖，可直接启动；在新机器或切换平台时运行 `npm ci`。

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

添加内置示例时，在 `public/samples/` 放入 CSV，然后更新 `src/samples.js`。迁移范围见 [迁移说明](docs/迁移说明.md)。
