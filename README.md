# dsh-plugin-conversation-start

DSH 客户端 UI 插件：在当前对话消息流的最底部、composer 卡的上方，显示当前会话中**第一条 user 消息**的本地时间戳 + 相对时间。

界面效果（单行、灰色小字、居中）：

```
🕒 对话开始于 2024-10-12 15:32:08 · 2 小时前
```

空白会话（还没有 user 消息）下显示占位：

```
等待第一条消息…
```

## 功能

- **绝对时间**：当前会话第一条 `user/message` 的本地时间戳 `YYYY-MM-DD HH:MM:SS`
- **相对时间**：例如 `2 小时前` / `3 分钟前` / `刚刚` / `in 3 hours`（多语言）
- **空状态**：新空白会话会展示浅色斜体占位，而不是什么都不渲染
- **会话切换稳定**：从空白会话切到历史会话（或反之）会平滑过渡，**不出现 hook 数量变化导致的 React 错误**
- **多语言**：跟随 DSH locale 设置，中文 / 英文
- **30 秒刷新**：相对时间每 30 秒自动更新一次
- **零侵入**：只占用 `conversation.input.dock` slot 的一行空间，不修改其他 UI

## 安装

### 方式 A：在 DSH Desktop 里直接粘贴 git 仓库地址（最简单）

1. 打开 DSH Desktop（或 Web UI）的**设置 → 插件**
3. 找到"从仓库安装" / "Install from Git" / "Add plugin" 类入口
4. 粘贴下面的仓库地址：

   ```
   https://github.com/tizerdev/dsh-plugin-conversation-start
   ```

5. 确认安装
6. 第一次安装需要重启 DSH 进程一次（Loader 要重新装载 patch layer）
7. 浏览器硬刷新 Web UI（Cmd/Ctrl+Shift+R）

> 这个插件是纯 JS，没有 `prepare` / 构建脚本，pnpm 10+ 默认安全策略不会拦截。

### 方式 B：用 `dsh` CLI 安装

如果你装了 `dsh` 命令行工具：

```bash
# 1. 克隆到本地
git clone https://github.com/tizerdev/dsh-plugin-conversation-start.git
cd dsh-plugin-conversation-start

# 2. 加进 web profile
dsh plugin --profile web add .
# 或者
dsh plugin --profile web add ./dsh-plugin-conversation-start

# 3. 验证配置层
dsh --profile web --dump-config | grep conversation-start

# 4. 启动
dsh --profile web
```

### 方式 C：从 `.tgz` 安装

适合离线 / 私有场景：

```bash
# 1. 打包
pnpm pack
# 产出 dsh-plugin-conversation-start-1.0.0.tgz

# 2. 在 DSH Desktop 里选"从本地文件安装" / "Install from .tgz" → 选这个文件
# 或者用 CLI：
dsh plugin --profile web add ./dsh-plugin-conversation-start-1.0.0.tgz
```

## 卸载

**DSH Desktop**：设置 → 插件 → 找到 `conversation-start` → 停用 / 移除。

**CLI**：

```bash
dsh plugin --profile web remove dsh-plugin-conversation-start
```

卸载后也需要重启 DSH 一次让 patch 撤销生效。

## 工作原理

- 在客户端 [conversation.input.dock](https://example.com) slot（消息流底部 / composer 上方）注册一个 list entry（`id: conversation-start`，`order: 5`，位于 todo 与 goal 之间）。
- View 组件 `ConversationStart` 接收 owner-provided 的 `sessionId` prop，**用 `useMemo` 派生**当前会话的 `eventSource`，**用 `useCallback` 缓存** `useSyncExternalStore` 的 subscribe/getSnapshot 引用。
- 会话切换时，`sessionId` prop 变化 → eventSource 重新计算 → subscribe/getSnapshot 引用变化 → React 自动取消旧订阅、建立新订阅 → 显示新会话的第一条 user 消息时间。
- 所有 hook 在任何分支下都按相同顺序执行（满足 [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)），空状态分支不会破坏 hook 数量。
- 文案通过 [ctx.locale.register()](file:client.js) 注册 `zh` / `en` 字典，DSH 切语言时自动跟随。
- 样式只用 `--dsw-alias-*` 主题 token（`--dsw-alias-label-secondary`），自动适配明暗主题。

## 兼容性

| 项 | 要求 |
|---|---|
| DSH 版本 | `>= 0.2.0-rc.2`（需要 `conversation.input.dock` slot 和 client session event source） |
| 平台 | Web（DSH Web UI / Desktop） |
| peer dependency | `@deepseek-ai/dsh-client-ui-conversation`（>= 0.2.0-rc.2） |

## 文件结构

```
dsh-plugin-conversation-start/
├── package.json          # 包元数据、peer dependency、dsh.client 注入声明
├── cordis.patch.yml      # Loader 补丁：把 row 插入到 root entries
├── index.js              # Host 半（空操作，渲染全部由 client 端负责）
├── client.js             # Client 半：注册 slot entry、订阅 eventSource、渲染 View
├── README.md             # 本文件
├── LICENSE               # MIT
└── .gitignore            # node_modules / .tgz / .DS_Store
```

## 开发 / 调整

修改 `client.js` 后重新装一次即可。client 资源由 HMR 推送，**不需要重启 DSH**，只要浏览器硬刷新一次。

**DSH Desktop**：

1. 设置 → 插件 → 找到 `conversation-start` → 移除
3. 重新走一遍安装流程（从同一个 git 仓库地址或同一个本地目录）

**CLI**：

```bash
# 1. 修改 client.js 后，重新加一遍
dsh plugin --profile web remove dsh-plugin-conversation-start
dsh plugin --profile web add .

# 2. 浏览器硬刷新 Web UI（Cmd/Ctrl+Shift+R）
```

### 调文案

所有可读字符串在 [client.js](client.js) 顶部的 `zh` / `en` 字典里。修改后两边都改就是同步翻译。

### 调样式

[client.js](client.js) 顶部的 `css` 字符串。用 `--dsw-alias-*` 主题 token，不要硬编码颜色。

### 改时间格式

- 绝对时间：`formatTime(timeMs)` 函数（输出 `YYYY-MM-DD HH:MM:SS`）
- 相对时间：`formatRelative(nowMs, pastMs, t)` 函数（依赖字典的 `relative.*` key）

### 加新语言

在 [client.js](client.js) 顶部的 `zh` / `en` 旁边加一个 `ja` / `ko` 等字典，并在 `ctx.locale.register(NS, { zh, en, ja })` 调用里注册。

## 已知问题

无。如发现新问题请在 GitHub 提 issue。

## License

MIT