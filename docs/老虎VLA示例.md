# 老虎 VLA：漂浮目标与水中抓取

老虎游动、扑按木头、转身并再次拨弄目标。日志根据画面编排，是模拟 VLA 文案，不代表动物真实的内部推理。

## 成片与时间线

成片为 `output/examples/tiger-vla/tiger-vla.mp4`。裁掉前 6 秒静候，保留原素材第 6–36.97 秒，共 30.97 秒，正常速度。原素材没有音轨，成片保持静音。输出为 1920 × 1080、30 fps、H.264；共享 Geist 深色版式，左标题、右 ASCII 字标，9 条双语日志与 5 段阶段字幕，主行渐变停留约 3 秒。

以下时间从裁切后的成片起点计算；网页预览与导出均将其映射到原素材第 6 秒之后。

| 时间 | 画面与日志编排 |
| --- | --- |
| 0–6 秒 | 短暂观察、木头露出水面；任务绑定与视觉定位 |
| 6–12 秒 | 前爪下压、水花遮挡；尝试固定与反馈 |
| 12–19 秒 | 转身、再次低头接触；调整角度和支撑 |
| 19–27 秒 | 目标回到身前、再次拨动；近身控制与位置修正 |
| 27–31 秒 | 木头仍在水面；保持交互，任务自动续杯 |

## 素材来源与许可

- 作者：**Grendelkhan**；拍摄日期：2017-04-21。
- 原始页面：[Tiger playing with a piece of wood in a pool](https://commons.wikimedia.org/wiki/File:Tiger_playing_with_a_piece_of_wood_in_a_pool.webm)。拍摄于 Tiger Park Pattaya，页面描述为孟加拉虎与印度支那虎的杂交个体。
- 许可：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。
- 原文件：1920 × 1080、37.037 秒、VP9、WebM 容器，无音轨。
- SHA-256：`26d27bba60bacc405778d1fa3e0d9a816b8d92fa18ad2b8150efb380337dbd47`。

本示例截取第 6–36.97 秒，转换编码，增加模拟日志、阶段字幕和深色版式。成片及其衍生截图、动图按 **CC BY-SA 4.0** 提供，保留作者署名；分享时保留原始页面、许可链接和修改说明，不暗示原作者认可本项目。素材许可不更改程序代码或其他素材的许可。

原素材、完整 MP4 和验证产物保存在忽略的 `output/` 目录。仓库保存 CSV、预设、文档和 README 展示用的截图及短动图。

## 网页与命令行复现

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:4320>，在「视频合成」点击「载入老虎完整示例」。视频、9 条日志、5 段字幕、裁切范围及版式一起载入。

首次载入从 `upload.wikimedia.org` 下载固定素材，校验 SHA-256 后缓存到 `output/examples/tiger-vla/source.webm`；FFmpeg 准备浏览器可播放的 H.264 视频，后续复用已校验的源文件。

服务运行时，在另一个终端执行：

```sh
npm run example:tiger-vla
# 等价命令
node scripts/make-video-example.mjs tiger-vla
```

使用其他端口时设置 `AGENT_LOG_STUDIO_TEST_URL`，通过 `CHROME_PATH` 指定 Chrome / Chromium。

```sh
npm run verify:examples
```

检查覆盖完整示例的网页载入、裁切起点、播放、预览 / 导出像素一致性、MP4 下载、草稿恢复及移动端入口布局。
