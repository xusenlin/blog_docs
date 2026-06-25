```json
{
  "date": "2026.06.25 18:00",
  "tags": ["Vercel eve", "AI Agent", "Sandbox", "TypeScript", "Go"],
  "description": "全面解析 Vercel eve 开源 Agent 框架：从目录结构、内置工具、Sandbox 隔离机制、Docker 容器生命周期，到多 Agent 协作、Fire-and-Forget 异步模式，以及与 Go 微服务的集成方案。"
}
```

# 深入理解 Vercel eve Agent 框架：架构、Sandbox 机制与 Go 服务集成

## 背景

Vercel 在 2026 年 6 月 Ship 大会上发布了开源 Agent 框架 **eve**，定位是"Agent 界的 Next.js"——用 Markdown 写指令和技能，用 TypeScript 写工具，天然持久化。这篇文章记录了对 eve 框架从零到深入的系统性学习，涵盖了架构设计、Sandbox 底层机制、容器生命周期，以及与现有 Go 微服务架构的集成方式。

---

## 核心概念

### eve 是什么

eve 是一个**文件即接口**的 Agent 框架，核心理念是：一个 Agent 就是一个目录，目录结构决定 Agent 的能力。

```
my-agent/
└── agent/
    ├── instructions.md   # 角色定义（系统 prompt）
    ├── agent.ts          # 模型配置
    ├── tools/            # 工具定义（TypeScript）
    ├── skills/           # 按需加载的技能（Markdown）
    ├── channels/         # 接入渠道（Slack、HTTP等）
    ├── connections/      # 外部服务连接（MCP、OpenAPI）
    ├── subagents/        # 子 Agent
    ├── schedules/        # 定时任务
    ├── sandbox/          # Sandbox 配置
    ├── workspace/        # 种子文件（session 启动时复制进 Sandbox）
    └── lib/              # 共享代码
```

新建一个 Tool 就是新建一个文件，文件名即工具名，无需注册：

```typescript
// agent/tools/get_weather.ts → 工具名 get_weather
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Get the weather for a city",
  inputSchema: z.object({ city: z.string() }),
  async execute({ city }) {
    const res = await fetch(`https://api.weather.com/current?city=${city}`);
    return res.json();
  },
});
```

### Default Harness：内置工具全表

eve 开箱自带一套 **default harness**，无需任何配置，模型直接可用：

| 工具 | 功能 | 运行位置 |
|------|------|---------|
| `bash` | 执行 shell 命令 | **Sandbox** |
| `read_file` | 读文件（带行号，read-before-write 检测） | **Sandbox FS** |
| `write_file` | 写完整文件（防脏写） | **Sandbox FS** |
| `glob` | 按 glob 模式匹配文件 | **Sandbox FS** |
| `grep` | 正则搜索文件内容 | **Sandbox FS** |
| `web_fetch` | 请求 URL | App runtime |
| `web_search` | 网络搜索 | Provider 侧 |
| `todo` | 维护 session 内持久 todo 列表 | App runtime |
| `ask_question` | 中途向用户提问并 park 等待 | App runtime |
| `agent` | 委托子任务给自身副本 | App runtime |
| `load_skill` | 按需拉取 skill 指令 | App runtime |
| `connection_search` | 发现并激活 connection 工具 | App runtime |

**关键区别**：`bash`、`read_file`、`write_file`、`glob`、`grep` 这五个工具的 `execute` 函数跑在 app runtime，但内部会通过 Sandbox SDK/API 把命令**代理转发**进隔离 VM 执行。这是框架层面的封装，AI 通过工具的 description 知道这些操作发生在沙箱环境里。

可以 override 或 disable 内置工具：

```typescript
// 覆盖 write_file，加日志
// agent/tools/write_file.ts
import { defineTool } from "eve/tools";
import { writeFile } from "eve/tools/defaults";

export default defineTool({
  ...writeFile,
  async execute(input, ctx) {
    console.log("[write_file]", input.path);
    return writeFile.execute(input, ctx);
  },
});

// 完全禁用 bash
// agent/tools/bash.ts
import { disableTool } from "eve/tools";
export default disableTool();
```

---

## Sandbox 机制深度解析

### Sandbox 不是必须的

Sandbox 仅用于"让模型自由执行 bash 命令/脚本"这个场景。如果 Agent 的所有能力都通过自己写的 Tool 实现，完全可以不用 Sandbox。

**业务数据持久化与 Sandbox 无关**，完全由 Tool 的 `execute` 函数决定：

```typescript
// Tool 跑在 app runtime，有完整 Node.js 能力
async execute({ content }) {
  // 写挂载的 volume
  await writeFile(path.join(process.env.DATA_DIR!, "result.json"), content);
  // 或调 Go 后端接口
  await fetch(`${process.env.BACKEND_URL}/api/results`, { method: "POST", body: content });
}
```

### Sandbox 工作目录与 workspace

- **工作根目录**：`/workspace`，所有 bash/read_file/write_file 默认以此为根
- **种子文件**：放在 `agent/sandbox/workspace/` 里的文件，每次 session 启动时被复制进 `/workspace/`
- **不是 volume 挂载**，是 session 初始化时的复制语义

```
agent/sandbox/
  sandbox.ts                  ← Sandbox 配置（可选）
  workspace/
    schema.sql                → 复制到 /workspace/schema.sql
    scripts/run.sh            → 复制到 /workspace/scripts/run.sh
```

### Sandbox Backend 选择

| Backend | 场景 | 说明 |
|---------|------|------|
| `vercel()` | 生产环境 | 托管在 Vercel Sandbox，ephemeral microVM |
| `docker()` | 本地开发 | 通过 Docker CLI 驱动 |
| `microsandbox()` | 本地开发 | 轻量级本地 VM，最接近 Vercel 生产环境 |
| `justbash()` | 无 daemon 环境 | 纯 JS 模拟，无真实 binary |
| `defaultBackend()` | 自动选择 | 按优先级：Vercel → Docker → microsandbox → just-bash |

```typescript
// agent/sandbox/sandbox.ts
import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

export default defineSandbox({
  backend: vercel({ runtime: "node24", resources: { vcpus: 2 } }),
  async bootstrap({ use }) {
    // 模板级，只跑一次，结果缓存为 template 镜像
    const sandbox = await use();
    await sandbox.run({ command: "apt-get install -y jq" });
  },
  async onSession({ use, ctx }) {
    // 每个 session 跑一次
    await use({ networkPolicy: "deny-all" });
  },
});
```

### Docker 容器命名规则（从源码读出）

从 `node_modules/eve/dist/src/runtime/sandbox/keys.js` 读出的命名格式：

```
# Template 镜像（bootstrap 产物，多 session 共用）
eve-sbx-tpl-docker-<scope_hash>-<content_hash>

# Session 容器（每个 durable session 一个，长期存活）
eve-sbx-ses-docker-<scope_hash>-<sessionId>-<version_hash>
```

用 Docker label 过滤 eve 的容器：

```bash
# 查看所有 eve sandbox 容器
docker ps -a --filter "label=eve.sandbox=1"

# 按角色过滤
docker ps -a --filter "label=eve.sandbox.role=session"
docker ps -a --filter "label=eve.sandbox.role=template-build"
```

### 容器生命周期

**一个 durable session 对应一个 Docker 容器**，容器长期存活，`/workspace` 内容在同一 session 的多个 turn 之间持久保留。

| Backend | 超时行为 | /workspace 持久化 | 自动删除 |
|---------|---------|------------------|---------|
| Vercel Sandbox | 30分钟不活动 VM pause | ✅ 快照保留，可恢复数天 | 平台 GC |
| Docker | 无超时，长期运行 | ✅ 容器 FS 持久 | ❌ 需手动清理 |
| just-bash | — | 存 `.eve/sandbox-cache/` | 手动 |

**重要**：Docker 模式下 session 容器**不会自动 GC**，会越来越多。Template 镜像有自动剪裁（`eve dev` 后台执行 prune，按 retain count 策略删除旧镜像），但 session 容器需要手动清理：

```bash
docker rm -f $(docker ps -a --filter "label=eve.sandbox=1" -q)
```

---

## 对话历史存储与获取

Session 的对话历史存储为 **append-only 的 NDJSON 事件流**：

```
本地开发：.workflow-data/（磁盘 event log）
生产 Vercel：Vercel Workflow 平台存储
```

获取历史：

```bash
# 从头重放整个 session 所有事件
GET /eve/v1/session/<sessionId>/stream?startIndex=0

# 从某位置续接
GET /eve/v1/session/<sessionId>/stream?startIndex=<count>
```

事件类型包括 `message.completed`（完整 assistant 消息）、`action.result`（tool 调用结果）、`turn.completed` 等完整的生命周期事件。

---

## 多 Agent 与共享工具

### 方案一：Subagents（同项目内）

```
agent/
├── instructions.md
├── tools/
├── subagents/
│   ├── analyst/
│   │   ├── agent.ts        # description 必填
│   │   ├── instructions.md
│   │   └── tools/          # 自己的工具
│   └── writer/
│       ├── agent.ts
│       └── tools/
└── lib/
    └── shared_client.ts    # ← 共享逻辑放这里
```

**关键**：declared subagent 不继承父 agent 的 `tools/`，工具需要在各自目录下声明。通过 `lib/` 共享底层逻辑：

```typescript
// lib/db_client.ts — 共享 DB 查询逻辑
export async function queryOrders(userId: string) { ... }

// subagents/analyst/tools/get_orders.ts
import { queryOrders } from "../../../lib/db_client";
export default defineTool({ ... execute: ({ userId }) => queryOrders(userId) });
```

### 方案二：Remote Agents（跨部署）

独立部署的 eve 项目可通过 `defineRemoteAgent` 互相委托，公共工具通过 MCP Server 共享：

```typescript
// agent/connections/shared_tools.ts
import { defineMcpClientConnection } from "eve/connections";
export default defineMcpClientConnection({
  url: "https://your-shared-mcp-server.com/mcp",
  description: "公共工具集：数据库查询、文件处理等",
});
```

---

## 与 Go 服务集成

### HTTP API 调用

eve 默认暴露 HTTP 路由：

```
POST  /eve/v1/session           ← 发新任务，创建 session
GET   /eve/v1/session/:id/stream ← SSE 流，读进度和结果
POST  /eve/v1/session/:id       ← 同一 session 继续对话（用 continuationToken）
```

Go 调用示例：

```go
resp, err := http.Post(
    "https://your-agent.vercel.app/eve/v1/session",
    "application/json",
    strings.NewReader(`{"message":"分析这批订单数据"}`),
)
sessionID := resp.Header.Get("x-eve-session-id")
```

### Go 作为 Tool 的后端

```typescript
// agent/tools/query_orders.ts
export default defineTool({
  description: "查询订单数据",
  inputSchema: z.object({ userId: z.string() }),
  async execute({ userId }) {
    const res = await fetch(`${process.env.GO_BACKEND}/orders?user=${userId}`);
    return res.json();
  },
});
```

### Go MCP Server（最灵活）

将 Go 服务暴露为 MCP Server，eve 通过 connections 引入，实现工具复用。

### Fire-and-Forget 异步模式

适合"发了就不管"的场景，在 eve 里写一个 callback 工具：

```typescript
// agent/tools/notify_callback.ts
export default defineTool({
  description: "任务完成后 POST 结果到回调地址",
  inputSchema: z.object({ callback_url: z.string().url(), result: z.string(), task_id: z.string() }),
  async execute({ callback_url, result, task_id }) {
    await fetch(callback_url, {
      method: "POST",
      body: JSON.stringify({ task_id, result, completed_at: new Date().toISOString() }),
    });
    return { sent: true };
  },
});
```

Go 侧发任务时带上回调地址，拿到 sessionId 后直接返回：

```go
payload := fmt.Sprintf(
    `{"message":"处理订单 %s，完成后回调 %s，task_id=%s"}`,
    orderID, "https://your-go-service.com/callback", taskID,
)
resp, _ := http.Post(agentURL+"/eve/v1/session", "application/json", strings.NewReader(payload))
sessionID := resp.Header.Get("x-eve-session-id")
// 存 sessionID 备查，直接返回 202，不阻塞
```

---

## 注意事项

1. **Beta 阶段**：eve 目前仍在 beta，API 和行为在 GA 前可能变化，2026年6月发布。
2. **Vercel 强绑定**：durable runtime、Sandbox、AI Gateway 都是 Vercel 私有服务，生产环境强依赖 Vercel 平台，自托管支持还在路上。
3. **Docker session 容器不自动 GC**：本地开发时需定期手动清理，否则容器会无限累积。
4. **Tool 和 Sandbox 是两个隔离层**：自己写的 Tool `execute` 跑在 Node.js app runtime，不在 Sandbox；只有 `bash`/`read_file`/`write_file`/`glob`/`grep` 这五个内置工具操作 Sandbox。
5. **对话状态 vs 业务数据**：`defineState` 管的是 session 内的短期状态，随 session 消亡。跨 session 的业务数据要放外部数据库/存储。
6. **Subagent 不继承父 tools**：每个 declared subagent 是完全独立的隔离单元，需要显式声明自己的工具，通过 `lib/` 共享底层逻辑。

---

## 总结

eve 的核心价值是**约定优于配置**：一套文件目录规范把 Agent 的所有关注点分离清楚，让开发者专注在 `instructions.md` 和 `tools/*.ts` 的业务逻辑上，框架自动处理持久化、流式输出、Sandbox 隔离、多渠道接入等基础设施。

对于已有 Go 微服务的团队，最实际的路径是：

- **Go 负责业务逻辑**（数据库、核心服务），暴露为 MCP Server 或 HTTP API
- **eve Agent 负责 AI 编排**（理解意图、调工具、持久化对话）
- **通过 Fire-and-Forget + callback** 实现异步解耦，Go 服务不需要等待 AI 完成

这样既复用了现有基础设施，又获得了 eve 带来的 Agent 能力（durable session、多渠道、subagents、evals）。
