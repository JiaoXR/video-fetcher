# VideoGrabber

浏览器端视频下载插件（Chrome/Edge），自动检测网页中的视频资源并支持一键下载或复制直链。项目代号 `video-fetcher`，扩展名称为 VideoGrabber。

## 功能特性
- 自动检测网页中的视频资源：
  - `<video>`/`<source>` 标签的 `src`
  - 网络请求中的视频流（匹配扩展名与 `Content-Type`）
  - 支持类型：`mp4`、`webm`、`mkv`、`m3u8`、`mov`、`m4v`
- 弹出面板展示：文件名、URL、格式、大小（如可获取），提供「下载」「复制链接」操作
- 图标徽标显示检测到的视频数量；检测到视频时徽标高亮
- 右键菜单：
  - 「下载本页视频」
  - 「复制视频链接」（如存在多个资源将尝试打开弹窗）
- 简易历史记录：在弹窗中查看最近下载的记录（存储于本地 `chrome.storage.local`）

## 支持浏览器
- Chrome 100+
- Edge（Chromium内核）
- Firefox（后续支持）

## 安装与加载
- 打开 `chrome://extensions`
- 开启「开发者模式」
- 点击「加载已解压的扩展程序」，选择本仓库下的 `extension/` 目录
- 成功加载后，工具栏显示 VideoGrabber 图标；页面检测到视频时图标徽标会显示数量

## 使用说明
- 打开包含视频的网页，等待页面加载或开始播放
- 点击扩展图标打开弹窗，可查看已检测到的资源列表
- 针对每条资源：
  - 点击「下载」调用浏览器 `downloads` API 开始下载
  - 点击「复制链接」将直链写入剪贴板
- 也可在页面空白处使用右键菜单进行快捷操作
- 如列表为空，可点击弹窗右上角的刷新按钮再试；部分资源需播放后才能被检测到
- 说明：`m3u8` 为流媒体索引文件，当前版本仅支持下载索引文件本身，不会自动合并切片为 MP4

## 权限与安全
- 权限：`activeTab`、`downloads`、`storage`、`webRequest`、`contextMenus`、`clipboardWrite`；`host_permissions` 为 `<all_urls>`
- 用途：
  - `webRequest` 用于分析响应头以判断视频类型与大小
  - `content_script` 仅用于扫描 DOM 中的 `<video>` 标签
  - `downloads` 触发浏览器下载；`clipboardWrite` 复制直链
  - `storage` 记录最近下载历史
- 隐私与安全：不采集、不上传任何用户数据或链接；所有数据处理均在本地完成，遵循 Chrome Web Store 隐私规范

## 项目结构
- `extension/manifest.json` — MV3 配置与权限声明
- `extension/background.js` — 网络请求检测、缓存、消息路由、右键菜单、徽标更新
- `extension/content_script.js` — 扫描 `<video>`/`<source>` 并上报至后台（不使用 `webRequest`）
- `extension/popup.html|css|js` — 弹窗 UI（列表、下载、复制、刷新、历史）
- 需求文档：`浏览器视频下载插件需求文档.md`

开发边界约定：后台脚本不直接操作 DOM；内容脚本不发起或监听 `webRequest`。

## 技术实现要点
- 通过 `chrome.webRequest.onHeadersReceived` 结合 URL 扩展名与响应头 `Content-Type` 判断是否为视频资源
- 使用每个标签页的内存缓存保存检测到的资源，并通过徽标显示计数
- 内容脚本在 `document_idle` 阶段扫描 `<video>`/`<source>` 并通过 `runtime.sendMessage` 上报
- 弹窗读取缓存列表，展示文件名、URL、类型、大小，并提供下载与复制操作
- 下载记录通过 `chrome.storage.local` 持久化以便在弹窗中查看最近下载

## 测试建议（手动）
- 加载本扩展后，打开包含 `<video>` 的页面或流媒体站点
- 观察扩展图标徽标是否显示数字；点击图标查看列表是否准确
- 测试「下载」与「复制链接」是否按预期工作
- 测试右键菜单两项操作；在存在多个资源时弹窗是否打开
- 针对 `m3u8` 资源验证仅下载索引文件，不进行合并

## 已知限制
- DRM/受保护的流媒体与加密切片不支持下载或合并
- `m3u8` 仅下载索引文件；不自动拼接为 MP4
- 某些站点可能使用自定义协议或混淆请求，无法被准确识别
- 若响应头未提供 `Content-Length`，将无法显示文件大小
- 文件名默认基于 URL 路径提取，可能不够语义化

## 未来计划
- 多分辨率检测（针对 `m3u8` 列出清晰度选项）
- 自动命名规则（基于页面标题/视频标题）
- 批量下载与更完善的历史记录视图
- 黑名单域名配置（在特定站点禁用检测）
- 国际化（中/英切换）
- 支持常见平台的专项解析逻辑（YouTube/Bilibili 等）
- 本地合并 `m3u8` 切片为 MP4（实验性）

## 开发提示
- 代码语言为 JavaScript（ES2022）；缩进 2 空格，单引号
- 保持模块边界清晰；避免引入不必要的权限与依赖
- 如需提交 PR：请遵循 Conventional Commits（`feat:`、`fix:`、`chore:`、`docs:` 等），并在说明中包含目的、变更点、测试方案，以及任何权限变更的理由

## 版本
- 当前版本：`0.1.0`
