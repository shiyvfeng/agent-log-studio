# 螃蟹 VLA：横向导航与潮汐热更新

一只海滩上的岸蟹负责横向巡航，海浪负责不经同意地更新运行环境。八条腿是执行器，足迹是沙盘数据库，浪花是全量推送，最后由潮汐服务接管导航。日志保持一本正经的系统口吻，与画面中的停顿、转向和涉水同步。

## 成片与时间线

成片为 `output/examples/crab-vla/crab-vla.mp4`，19.2 秒、1920 × 1080、30 fps、H.264 / AAC。保留原素材的 0–19.2 秒、连续镜头、正常速度和环境原声，没有拼接其他镜头或添加配音。视频保持原始 4:3 比例，与 8 条双语日志、5 段阶段字幕一起使用共享 Geist 成片版式。

以下标记按连续帧人工核对，时间从原素材第一帧起算，也是成片时间：

| 时间 | 画面 | 日志编排 |
| --- | --- | --- |
| 0–3.8 秒 | 岸蟹沿沙面横向移动、短暂停顿并转向 | 八腿上线、横向路径、足迹数据库、航向微调 |
| 3.8–5.6 秒 | 调整朝向后继续移动 | 身体朝向与行进方向解耦、腿部线程调度 |
| 5.6–8.4 秒 | 浪花进入画面，第一股海水流到岸蟹周围 | 潮汐事件、海浪最高优先级、沙盒升级水池 |
| 8.4–12.5 秒 | 岸蟹在浅水中停顿、继续移动，浪花再次抵达 | 足迹数据库溶解、现场定位、路径租约失效 |
| 12.5–17.2 秒 | 海水逐渐覆盖沙面，岸蟹降低姿态 | 切换水陆模式、低姿态稳定、接受托管导航 |
| 17.2–19.2 秒 | 浪花进一步覆盖岸蟹周围，进入片尾 | 潮汐接管、海已上线、八腿仍在线 |

示例文案：

```text
[language] 任务=沿岸巡航；优先保持干燥。
[feedback] 海水已抵达；干燥约束被环境否决。
[vision] 第二股浪花接近；可用干地继续缩小。
[action] 执行低姿态涉水；导航权暂交潮汐。
```

英文日志使用相同语气，例如 `Sandbox promoted to swimming pool.` 和 `The ocean exposes no reject button.`。主行围绕巡航、来浪、重定位与降低姿态展开，每段渐变至少持续约 3 秒，动作与环境反馈归入所属主行。

## 素材来源与许可

- 作者：**Arthro**。
- 原始页面：[Carcinus maenas walking on land](https://commons.wikimedia.org/wiki/File:Carcinus_maenas_walking_on_land.ogv)，描述为普通岸蟹（*Carcinus maenas*）在陆地行走；画面拍摄于真实海滩。
- 许可：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，Commons 页面将作者原创视频标为 CC0。示例成片底部仍保留作者、来源与许可署名。
- 上传时间：2012-09-11 16:51:57 UTC。
- 原文件：640 × 480、约 19.224 秒、30 fps、Theora / Vorbis，Ogg 容器。
- SHA-256：`f05059e01ad1c0b24d9841d8211709982319909fa5de56395882e6ceb8575d0f`。

仓库保存编排配置、CSV、复现与验证脚本，以及 README 的实际截图和短动图。原素材、完整成片和检查产物保留在忽略的 `output/` 目录。原始 URL 与校验和固定在 `src/crab-vla.js`，来源发生变化时会拒绝载入。

## 网页复现

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:4320>，在「视频合成」点击「载入螃蟹完整示例」。素材、8 条日志、5 段阶段字幕、标题、署名与画布设置一起载入。可以直接预览，也可以修改日志或时间，随后点击「导出完整视频」下载 19.2 秒成片。

首次载入通过系统 `curl` 从 `upload.wikimedia.org` 下载素材，验证 SHA-256 后缓存到 `output/examples/crab-vla/source.ogv`。FFmpeg 将 Theora / Vorbis 准备为浏览器可播放的 H.264 / AAC；后续载入复用通过校验的原素材缓存。

## 命令行复现

保持服务运行，在另一个终端执行：

```sh
npm run example:crab-vla
# 等价命令
node scripts/make-video-example.mjs crab-vla
```

网页与命令行共用 `src/video-examples.js` 的预设、素材准备接口和完整视频导出接口。脚本输出 MP4、CSV 副本、画布设置、素材来源和导出记录；它会实际生成视频，不依赖预先制作的成片。

环境需要 Chrome / Chromium、curl 和中文字体；FFmpeg 由依赖自带。使用其他端口时设置 `AGENT_LOG_STUDIO_TEST_URL`，通过 `CHROME_PATH` 指定浏览器。

```sh
npm run verify:examples
```

此检查实际载入所有完整示例，验证播放、网页与导出文字像素一致、网页 MP4 下载、草稿恢复、手机宽度的示例入口，并拒绝未知素材预设。产物位于 `output/qa/video-examples/`。
