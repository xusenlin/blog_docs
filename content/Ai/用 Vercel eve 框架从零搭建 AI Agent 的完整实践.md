```json
{
  "date": "2026.06.25 21:30",
  "tags": ["eve", "Vercel", "Agent", "Docker", "AI SDK", "MiMo"],
  "description": "从零用 Vercel eve 框架搭建 AI Agent 的完整实践：接入小米 MiMo 模型、配置 Docker 沙箱与模板镜像机制、编写自动发现的工具，涵盖 HTTP 协议、会话历史回放、docker commit 模板复用等底层细节。"
}
```

# 用 Vercel eve 框架从零搭建 AI Agent 的完整实践

## 背景

Vercel 推出了 **eve**——一个"像 Next.js 之于 Web 应用，但面向 Agent"的框架。它的核心理念是：**一个 agent 就是一个目录**。用 Markdown 写指令、TypeScript 写工具、部署即用。框架负责编译目录、串联持久化工作流、连接各渠道。

这次实践的目标是在本地用 eve 搭建一个能用的 agent，接入小米的 MiMo 大模型，并给它配备文档处理能力（markitdown 转换 + python-docx 生成）。过程中踩了不少坑，也深挖了 eve 的底层机制，记录下来方便后续学习。

---

## 核心概念：eve 的 9 层结构

eve 把一个 agent 拆成 9 个目录槽位，各司其职：

| 槽位 | 作用 |
|------|------|
| `instructions.md` | 单个 Markdown 文件即完整 agent，描述角色和行为（常驻系统提示） |
| `agent.ts` | 配置模型和运行时 |
| `skills/` | Markdown 流程手册，模型按需加载（progressive disclosure） |
| `tools/` | TypeScript 工具，**文件名即工具名，自动发现** |
| `sandbox/` | 每个 agent 自带的隔离沙箱环境 |
| `channels/` | 部署到 Slack/Discord/Web 等 |
| `connections/` | 处理 GitHub/Stripe 等外部服务鉴权 |
| `subagents/` | 委派专门工作给子 agent |
| `schedules/` | Cron 定时任务 |

最关键的一点：**工具是按文件位置自动发现的**。文档原文："Add the file and eve discovers it"——`agent/tools/xxx.ts` 文件名就是工具名，eve 自动把工具的 `description` + `inputSchema` 暴露给模型，**不需要在 instructions 里声明，也不需要注册**。

---

## 实现过程

### 1. 初始化项目

```bash
npx eve@latest init my-agent
```

生成的 `agent/agent.ts` 默认用 AI Gateway 路由的模型字符串：

```ts
import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-4.6",
});
```

### 2. 接入小米 MiMo 模型（踩坑重点）

小米 MiMo 提供的是 **Anthropic 兼容接口**，地址 `https://token-plan-cn.xiaomimimo.com/anthropic`，模型 id `mimo-v2.5-pro`。

文档确认 `defineAgent` 的 `model` 字段不只接受字符串，还能接受任何 **AI SDK 的 `LanguageModel` 实例**。所以方案是用 `@ai-sdk/anthropic` 的 `createAnthropic` 构造模型实例，覆盖 baseURL 直连小米，绕过 Vercel AI Gateway。

#### 版本兼容问题

项目用的是 `ai@7.0.0-beta.178`（v7 beta 线），依赖 `@ai-sdk/provider@4.0.0-beta`。稳定版 `@ai-sdk/anthropic@3.0.86` 基于 ai v6，不兼容。必须用 **canary 线** `@ai-sdk/anthropic@4.0.0-canary.66`，它依赖 `provider@4.0.0-canary` / `provider-utils@5.0.0-canary`，与 beta 线接口兼容。

```bash
npm install @ai-sdk/anthropic@4.0.0-canary.66
```

#### 第一个坑：404 Not Found

最初的配置：

```ts
const mimo = createAnthropic({
  baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic",
  apiKey: process.env.MIMO_API_KEY,
});
```

结果模型调用报 `AI_APICallError: Not Found`，statusCode 404。用隔离脚本测试时打印出实际请求 URL：

```
url: 'https://token-plan-cn.xiaomimimo.com/anthropic/messages'
```

而用 curl 直接打 `/anthropic/v1/messages` 是 200 成功的！

**根因**：`@ai-sdk/anthropic` 的 baseURL 拼接逻辑——它把请求发到了 `/anthropic/messages`（没有 `/v1`），但小米网关只认 `/anthropic/v1/messages`。

**修复**：baseURL 必须带 `/v1`，`@ai-sdk/anthropic` 会自动补 `/messages`：

```ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { defineAgent } from "eve";

const mimo = createAnthropic({
  baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic/v1",  // 注意带 /v1
  apiKey: process.env.MIMO_API_KEY,
});

export default defineAgent({
  model: mimo("mimo-v2.5-pro"),
  modelContextWindowTokens: 200_000,  // 自定义模型需手动指定上下文窗口
});
```

修复后 MiMo 回复：「你好！我是MiMo-v2.5-pro，由小米MiMo团队开发的大语言模型。」

#### 环境变量

`.env.local`（已被 `.gitignore` 的 `.env*` 忽略）：

```
MIMO_API_KEY=tp-xxxxx
```

`eve dev` 运行时会自动重载 env 文件，改完不用重启。

### 3. 运行 agent

```bash
npx eve dev
```

启动后监听 `http://127.0.0.1:2000/`，根路径返回的就是 eve 自带的 **web 聊天 UI**（`<title>eve</title>` 的单页应用，`placeholderAuth` 在 localhost 放行）。后台非 TTY 终端会提示 "Interactive UI disabled"，但 HTTP 服务正常。

### 4. Node 版本固定

eve 要求 Node 24，本地是 22。用 fnm 固定：

```bash
# agent1/.node-version
v24.14.0
```

fnm 的 `--use-on-cd` 钩子会在 `cd` 进目录时自动读取 `.node-version` 切换版本。前提是 `~/.zshrc` 里有 `eval "$(fnm env --use-on-cd)"`。

---

## HTTP 协议与会话历史

eve 的 HTTP 接口只有三个，采用 **event-sourcing + stream 回放** 设计，没有独立的"列表会话"或"取历史"接口：

| 方法 | 路径 | 作用 |
|------|------|------|
| `POST` | `/eve/v1/session` | 新建会话，返回 `sessionId` + `continuationToken` |
| `POST` | `/eve/v1/session/:sessionId` | 续接已有会话（**必须带 `continuationToken`**） |
| `GET` | `/eve/v1/session/:sessionId/stream?startIndex=0` | 回放该会话全部历史事件（NDJSON 流） |

### 取历史对话的关键

第 3 个接口不只是实时流——加上 `?startIndex=0` 重新订阅，会把该 session 从头到尾的所有事件**回放**出来。回放的 NDJSON 里关注两类事件拼出历史：

- `message.received` → 用户消息（`data.message`）
- `message.completed` → 助手最终回复（`data.message`）

### 多轮对话

续接已有会话发消息时，**必须带创建时返回的 `continuationToken`**，否则报 400 "Missing or empty 'continuationToken'"。实测多轮记忆正常：第一轮说"我叫小明"，第二轮问"我叫什么"能正确复述。

### 持久化位置

会话数据存在本地 `.workflow-data/`（被 `.gitignore` 忽略），是 Workflow SDK 的 event-sourcing 存储：`events/`、`runs/`、`steps/`、`streams/`。dev 重启后历史不丢。

### 限制

eve 没提供"列出所有会话"的接口——web UI 内部靠 cookie/localStorage 存当前 session id 来续接。需要会话列表功能得自己维护 sessionId 映射。

---

## 沙箱机制（最值得深挖的部分）

### 沙箱默认启用

实测验证：让 agent 在沙箱跑 bash 命令，它调用了内置 `bash` 工具，命令在隔离环境执行并返回结果。**不用写任何配置，开箱即用。**

沙箱是 agent 的隔离 bash 环境——文件系统根在 `/workspace` 的隔离容器，agent 在里面跑 shell 命令、读写文件，**不碰宿主机**。

### 后端优先级

后端按优先级自动选择：

1. **Vercel Sandbox**（部署到 Vercel，`VERCEL` 环境变量触发）
2. **Docker**（本地有 docker daemon）← 本地默认用这个
3. **microsandbox**（Apple Silicon Mac 或 KVM Linux）
4. **just-bash**（纯 JS 兜底，无真实二进制、无网络隔离）

本地装了 Docker，所以用 Docker 后端，基础镜像 `ghcr.io/vercel/eve:latest`。

### eve 怎么用 Docker 跑命令

**核心：eve 不用 Docker SDK，而是直接 spawn `docker` CLI 子进程。**

源码在 `docker-cli.js` 的 `createDockerCli()`：

```js
function resolveDockerExecutable() {
  let e = process.env.EVE_DOCKER_PATH?.trim();
  return e ? e : "docker";  // 可用 EVE_DOCKER_PATH 换成 podman
}

async run(args, opts) {
  let r = spawn(resolveDockerExecutable(), args, { stdio: ["pipe","pipe","pipe"] });
  // 收集 stdout/stderr，等退出
  return { exitCode, stdout, stderr };
}
```

- 检测 daemon：`docker version --format {{.Server.Version}}`
- 会话里跑命令：`docker exec <容器> bash -c '<命令>'`

### 镜像不存在时自动拉取

`ensureDockerBaseImage` 的逻辑——**先判断镜像在不在本地，不在就自动 pull**：

```js
async function ensureDockerBaseImage(cli, opts) {
  if (opts.pullPolicy === "always") {        // 总是拉
    await cli.run(["pull", opts.image]); return;
  }
  if (!await dockerImageExists(cli, opts.image)) {  // 本地没有
    if (opts.pullPolicy === "never") throw "请手动拉";
    await cli.run(["pull", opts.image]);     // 自动拉
  }
}

// 判断存在：docker image inspect，exit 0 即存在
async function dockerImageExists(cli, image) {
  return (await cli.run(["image","inspect","--format","{{.Id}}",image])).exitCode === 0;
}
```

| pullPolicy | 本地有镜像 | 本地无镜像 |
|-----------|----------|----------|
| `"always"` | 仍然拉 | 拉 |
| `"if-missing"`（默认） | 跳过 | **自动拉** |
| `"never"` | 跳过 | 报错 |

### 两阶段生命周期 + docker commit 模板复用

这是最精妙的设计，`.d.ts` 注释揭示了完整机制：

```
┌─ prewarm（模板构建，只跑一次）─────────────────────────────┐
│  1. ensureDockerBaseImage → 本地没镜像就 docker pull       │
│  2. startDockerContainer → 用基础镜像启动临时容器           │
│  3. runDockerBaseSetup  → mkdir -p /workspace，检查 bash   │
│  4. 跑 bootstrap         → pip install markitdown...       │
│  5. 写入 seed 文件（如果有 workspace/ 种子）               │
│  6. docker commit → 把容器提交成模板镜像                   │
│     仓库名: eve-sandbox-template:<optionsHash>             │
└────────────────────────────────────────────────────────────┘
                          ↓ 之后所有会话复用模板镜像
┌─ create（每个会话）────────────────────────────────────────┐
│  1. dockerImageExists 检查模板镜像在不在                   │
│  2. 用模板镜像 startDockerContainer 启动长驻容器            │
│  3. agent 的 bash 工具 → docker exec 在容器里跑命令         │
│  4. dispose 不删容器 → 重连即时（状态保留在 FS）           │
└────────────────────────────────────────────────────────────┘
```

**`docker commit` 能把容器的当前状态（文件系统改动）固化成新镜像**。eve 靠它实现模板复用：bootstrap 装的包被 commit 进模板镜像，后续会话从模板镜像启动，自带这些包，秒级启动。

实测机器上的镜像：

| 镜像 | 大小 | 说明 |
|------|------|------|
| `ghcr.io/vercel/eve:latest` | 652MB | 官方基础镜像（prewarm 起点） |
| `eve-sandbox-template:...` | 1GB | commit 出的模板镜像，多了 ~350MB（markitdown 等） |

### 沙箱镜像里有什么

官方文档**故意不公布**镜像软件清单和 Dockerfile，只说"这是 eve 的沙箱运行时镜像"。实测探查：

| 项目 | 实测结果 |
|------|---------|
| **OS** | Ubuntu 26.04 LTS (Resolute Raccoon) |
| **内核** | Linux 6.12.72-linuxkit (arm64) |
| **Node** | v24.17.0 + npm 11.13.0 |
| **Python** | 3.14.4 + pip 25.1.1 |
| **包管理** | apt-get 3.2.0 |

预装：git、jq、curl、unzip、tar、gzip、rg (ripgrep)、bash
**没装**：wget、make、gcc/g++、clang、ssh、rsync、ffmpeg、imagemagick、fd、go、rust、java

注意：Ubuntu 26.04 很新，Python 3.14 触发 PEP 668，所以 pip 装包要加 `--break-system-packages`。

### 自定义沙箱 bootstrap

在 `agent/sandbox.ts` 用 `defineSandbox` 配置：

```ts
import { defineSandbox } from "eve/sandbox";

export default defineSandbox({
  revalidationKey: () => "markitdown-v2",  // 改内容时改 key 触发重建
  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({
      command:
        'pip3 install --break-system-packages --no-cache-dir ' +
        '-i https://mirrors.aliyun.com/pypi/simple/ ' +
        '"markitdown[docx,pptx]==0.1.5" ' +
        '"markitdown[pdf]==0.1.5" ' +
        'weasyprint ' +
        'python-docx',
    });
  },
});
```

关键点：
- `bootstrap` 是**模板级**的，只在 prewarm 时跑一次，commit 后所有会话复用
- `backend` 省略，本地自动选 Docker，部署 Vercel 自动选 Vercel Sandbox
- **改 `revalidationKey` 是必须的**——不改的话 eve 复用旧模板快照，bootstrap 不会重跑

---

## 编写自动发现的工具

### 工具 1：convert_to_markdown（文档转 Markdown）

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "将文档转换为 Markdown。支持 Word(.docx)、PowerPoint(.pptx)、PDF(.pdf)、" +
    "Excel(.xlsx)、HTML、CSV、JSON、XML 等常见格式。传入文档的文件路径，返回转换后的 Markdown 文本。",
  inputSchema: z.object({
    filePath: z.string().describe("要转换的文档路径，相对路径基于 /workspace，也可用绝对路径。"),
  }),
  async execute(input, ctx) {
    const sandbox = await ctx.getSandbox();  // ← 在容器里执行
    const absPath = sandbox.resolvePath(input.filePath);
    const result = await sandbox.run({ command: `markitdown ${shellQuote(absPath)}` });
    return result.exitCode !== 0
      ? { ok: false, error: result.stderr?.trim() || `转换失败，退出码 ${result.exitCode}` }
      : { ok: true, markdown: result.stdout };
  },
});
```

### 工具 2：create_document（生成 docx）

```ts
export default defineTool({
  description:
    "生成 Word(.docx) 文档。传入文档标题和内容块（段落、列表、表格），" +
    "在沙箱中生成 docx 文件并返回文件路径。",
  inputSchema: z.object({
    title: z.string(),
    content: z.array(z.union([
      z.object({ type: z.literal("paragraph"), text: z.string() }),
      z.object({ type: z.literal("list"), items: z.array(z.string()) }),
      z.object({ type: z.literal("table"), headers: z.array(z.string()), rows: z.array(z.array(z.string())) }),
    ])),
    filePath: z.string().optional(),
  }),
  async execute(input, ctx) {
    const sandbox = await ctx.getSandbox();
    // 把内容序列化成 JSON 写入沙箱，再跑 python 脚本渲染
    // 避免命令行传大段 JSON 的转义问题
    ...
  },
});
```

---

## 踩坑 & 注意事项

### 1. MiMo baseURL 必须带 `/v1`

`@ai-sdk/anthropic` 默认拼 `/messages`，小米网关只认 `/anthropic/v1/messages`。baseURL 写 `.../anthropic` 会 404，必须写 `.../anthropic/v1`。

### 2. AI SDK 版本要对齐 beta/canary 线

`ai@7.0.0-beta` 必须配 `@ai-sdk/anthropic@4.0.0-canary`，稳定版 3.x 基于 ai v6 不兼容。

### 3. 自定义模型要设 modelContextWindowTokens

MiMo 没被 AI Gateway 收录，eve 查不到上下文窗口元数据，不手动指定 compaction 计算会出错。

### 4. 续接会话必须带 continuationToken

`POST /eve/v1/session/:sessionId` 不带 `continuationToken` 会 400。

### 5. bootstrap 改内容必须改 revalidationKey

不改 key 的话 eve 复用旧模板快照，bootstrap 不会重跑，新装的包不生效。

### 6. Python 3.14 要 --break-system-packages

沙箱是 Ubuntu 26.04 + Python 3.14，PEP 668 生效，系统级 pip 安装必须加 `--break-system-packages`。

### 7. 工具 description 是关键

工具自动注入后，**`description` 写得好不好决定 agent 何时调用**。要讲"能做什么、支持什么格式、传什么、返回什么"，不要暴露底层命令实现细节——AI 不关心你用 markitdown 还是别的，它只关心工具的作用。

### 8. 工具命令在容器里跑

工具里必须用 `ctx.getSandbox()` 拿沙箱 session 再 `sandbox.run()`，这样命令在容器里执行。如果用 `node:child_process` 直接 spawn，那是宿主机，错误做法。

---

## 总结

这次实践完整走通了 eve agent 的搭建流程，几个关键收获：

1. **eve 的设计哲学是"约定优于配置"**——目录结构即语义，文件名即工具名，自动发现免注册。这让搭 agent 像写几个文件一样简单。

2. **沙箱的 docker commit 模板机制很巧妙**——bootstrap 装的包被固化进模板镜像，所有会话复用，秒级启动。这是"装一次，处处可用"的关键。

3. **会话历史靠 stream 回放**——没有独立的 history 接口，`GET /session/:id/stream?startIndex=0` 既能实时流也能回放历史，event-sourcing 设计。

4. **工具的 description 是 AI 的路由依据**——写清楚"做什么、传什么、返回什么"，AI 就能自主决策调用，不需要 instructions 声明。

5. **接第三方模型看 baseURL 拼接**——Anthropic 兼容接口的关键是搞清楚 SDK 怎么拼路径，小米的必须带 `/v1`。

最终 agent 具备了文档处理闭环：`create_document` 生成 docx ↔ `convert_to_markdown` 解析文档，两个工具互逆配合。整个项目结构清晰，沙箱安全隔离，模型可插拔，是个不错的 agent 起手框架。
