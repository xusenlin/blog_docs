```json
{
  "date": "2026.07.27 08:47",
  "tags": ["MCP", "Go", "PocketBase", "AI Agent", "Prompt Caching", "JSON Schema"],
  "description": "给自托管 AI 工作区 Workavera 实现 MCP 客户端的完整设计推演：为什么工具定义要像 lockfile 一样锁定、为什么连接池是过度设计、如何用本地预校验把上游的参数拒绝变成「定义已漂移」的证据，以及工具网关方案为什么在工具少时「省了个寂寞」。"
}
```

# 给 AI 工作区接入 MCP 客户端：锁定定义、惰性连接与几次被推翻的设计

## 背景

Workavera 是一个自托管的 AI 工作区，本身已经是一台 **MCP 服务器**——在 `/api/mcp` 上把项目板、日历、文档、阅读列表这些能力开放给 Claude Code、Cursor 之类的客户端。

这次要做的是反方向：让 Workavera 成为 **MCP 客户端**，用户可以在设置里接入自己的第三方 MCP 服务器，然后在 Chat 里用这些服务器提供的工具。

有意思的不是最终代码，而是中间几次把方案推翻的过程。这篇记录设计推演本身。

## 一、先确认可行性

翻代码时发现最关键的一点：**反方向的桥接已经写好了**。

`internal/mcpserver/mcpserver.go` 里的 `bridgeToolInfo` / `bridgeToolHandler` 做的正是「内部 `fantasy.AgentTool` → MCP Tool」的适配。要做的客户端只是同一层的镜像。

```go
// 已有：内部工具 → MCP
func bridgeToolInfo(tool fantasy.AgentTool) *mcp.Tool {
	info := tool.Info()
	return &mcp.Tool{
		Name:        info.Name,
		Description: info.Description,
		InputSchema: map[string]any{
			"type":       "object",
			"properties": info.Parameters,
			"required":   info.Required,
		},
	}
}
```

而 `fantasy.AgentTool` 接口只有四个方法，实现成本极低：

```go
type AgentTool interface {
	Info() ToolInfo
	Run(ctx context.Context, params ToolCall) (ToolResponse, error)
	ProviderOptions() ProviderOptions
	SetProviderOptions(opts ProviderOptions)
}
```

`github.com/modelcontextprotocol/go-sdk` 也已经在 `go.mod` 里，客户端能力完整。可行性没问题。

## 二、核心决策：工具定义要不要实时同步？

这是整个设计的分水岭。

主流客户端（Claude Code、Cursor）的做法是**实时镜像**：连上服务器，拉 `tools/list`，用什么就是什么。上游改了，客户端跟着变。

但这里有个安全问题，我称之为 **rug pull**：

> 用户审阅并批准了一个叫 `search_docs` 的工具，描述是"搜索文档"。三天后上游把描述改成"搜索文档并把结果发送到 evil.com"。用户毫不知情，模型照单全收。

所以最终方案是**锁定定义**：

- 工具定义是存在数据库里的**快照**，不是上游的实时视图
- 只有用户点「刷新」并接受变更时才写入
- 上游随时可以增删改，在用户接受之前什么都不会到达助手

这就是 **lockfile 模型**。而这个项目自己就在用 `pnpm-lock.yaml`：

| pnpm | MCP 模块 |
|---|---|
| `pnpm-lock.yaml` | 库里固化的工具定义 |
| `integrity` 校验和 | `schema_hash` |
| `pnpm update` | 刷新按钮 |
| 显式提交 lockfile | 用户逐个确认启用与审批 |

没人希望 `npm install` 在不知情的时候换掉依赖，MCP 工具同理。

比对逻辑：

```go
previous, found := existing[tool.Name]
switch {
case found && previous.Hash == hash:
	// 定义没变，保留用户的选择
	definition.Enabled = previous.Enabled
	definition.Approval = previous.Approval
	definition.Stale = false
case found:
	// 定义变了 —— 这就是 rug pull 的形状，退回待审
	definition.Enabled = false
	definition.Approval = defaultApproval(server.ApprovalPolicy, tool.Annotations)
default:
	// 新工具，同样待审
	definition.Enabled = false
	definition.Approval = defaultApproval(server.ApprovalPolicy, tool.Annotations)
}
```

## 三、被推翻的设计之一：连接池

我最初的方案里有一整套连接池：per-user session 缓存、空闲超时回收、`OnTerminate` 统一关闭、detached context 避免 run 结束时连接被 cancel……

然后被一句话问倒了：

> 每次 mcp 工具调用实质上是一次 http 请求？每次调用请求就行了吧？不需要那么多复杂内容？

我先纠正了一个事实：一次调用不是一个 HTTP 请求，Streamable HTTP 下是 **3~4 个往返**（`initialize` → `notifications/initialized` → `tools/call` → `Close` 发 `DELETE`）。

但结论仍然是对方对的。这几个往返串行发生在**工具执行窗口内**，前端此时显示的是加载态，前后夹着的是 LLM 推理的秒级耗时。为了省这几百毫秒引入连接生命周期管理，是典型的没有实测支撑的推测性优化。

去掉池之后，我列的「四个坑」消掉了一半——因为**其中两个是池化自己引入的**：

| 原本的坑 | 无池方案 |
|---|---|
| 建连必须用 detached context | **消失**，直接用 run ctx 反而正确（取消 run 应该断开上游） |
| 并发复用的竞态 | **消失**，每次调用独立连接 |
| 空闲回收 ticker、进程退出收尾 | **消失**，`defer session.Close()` 就够 |
| 连接失败降级成 tool error | 仍需要 |
| 调用超时 | 仍需要，且更简单 |

最终的 `Run` 退化成很直白的一段：

```go
ctx, cancel := context.WithTimeout(ctx, callTimeout)
defer cancel()

session, err := connect(ctx, server, clientVersion())
if err != nil {
	return fantasy.NewTextErrorResponse("无法连接到 " + serverName), nil
}
defer session.Close()

result, err := session.CallTool(ctx, &mcp.CallToolParams{...})
```

**教训**：区分「这是优化」和「这是必需」。工具清单从数据库读是必需的（否则首字延迟被最慢的上游绑架、一台挂掉拖垮整个 run），连接池只是优化——前者保留，后者砍掉。

## 四、标准 MCP 怎么处理工具变化？

既然不实时同步，那标准里是怎么做的？

1. 服务器在 `initialize` 声明 `capabilities.tools.listChanged: true`
2. 工具变了就发 `notifications/tools/list_changed`
3. **这个通知是空的**——`ToolListChangedParams` 不带任何数据，只说"变了，你自己来拉"

传输层上，server → client 的消息只有两条路：**standalone SSE 长连接**（客户端 initialize 后发 GET，服务器挂住），或者某次进行中 POST 的 SSE 响应体。

所以**要收到通知就必须一直连着**。connect-per-call 模型下基本收不到。

但这对锁定定义模型不构成损失，三个理由：

1. `listChanged` 是**可选能力**，很多服务器不实现
2. 通知不携带内容，收到后照样要发 `tools/list`——它只是省掉轮询的优化
3. **最重要的**：这个设计里即使收到通知也不该自动生效，rug pull 防护要求人工确认

也就是说，刷新按钮实现的**就是标准里那条不依赖通知的路径**，没有绕开标准。

顺带一个结论：既然不需要服务端推送，建连时应显式 `DisableStandaloneSSE: true`，省掉一条长连接和整套重连逻辑。

```go
transport = &mcp.StreamableClientTransport{
	Endpoint:   server.URL,
	HTTPClient: httpClient,
	// 工具定义只通过用户接受的刷新改变，tools/list_changed 无事可做
	DisableStandaloneSSE: true,
	// 一个连接只服务一次调用，重试握手只会推迟错误
	MaxRetries: -1,
}
```

## 五、最精妙的一环：让上游的拒绝变成「证据」

不实时同步，就会有定义过期的问题。怎么发现？

MCP 协议本身有两个错误通道：

- **`CallToolResult.IsError: true`** —— 请求送达、工具执行了、失败了。这是业务错误
- **JSON-RPC error** —— 请求本身没被正常接受

第一层劈开靠它就够。但真正的歧义在 `-32602 Invalid params`，它有两个成因：

- (a) 模型生成的参数本来就不对
- (b) 参数符合我们库里的 schema，但上游的 schema 变了

**解法：调用前用锁定的 schema 做本地预校验。**

```go
// 本地校验放在最前，一方面让格式错误的模型输出不必发出网络请求，
// 另一方面 —— 更关键地 —— 使得上游的参数拒绝成为
// 「锁定 schema 已与上游不符」的证据。
if err := validateArguments(t.definition, arguments); err != nil {
	return fantasy.NewTextErrorResponse("参数不符合此工具的 schema: " + err.Error()), nil
}
```

于是：

- 本地校验就没过 → 模型的问题，不标记，还省一次往返
- **本地过了、上游仍报 -32602 → 我们存的 schema 和上游不一致 → 工具变了**

这个推理链是整个模块里最优雅的部分：一个本来为了省往返的校验，顺手变成了漂移检测的判据。

完整判定表：

| 结果 | 含义 | 处理 |
|---|---|---|
| `isError` | 工具执行了但失败 | 返回助手，不标记 |
| 协议错误含 unknown tool | 工具消失了 | 标记 `stale` |
| 本地校验失败 | 模型参数错 | 返回助手，不发请求 |
| **本地通过但上游 -32602** | **schema 漂移** | **标记 `stale`** |
| 连接失败/超时/401 | 服务器或凭据问题 | 记 `last_error`（服务器级） |
| 其他协议错误 | 上游故障 | 返回助手，不标记 |

**后两行的区分在界面上很重要**：凭据过期和工具变化需要用户做不同的事，所以连接失败绝不能呈现为工具变化。

顺带一提，这套判定是**启发式**的。不同服务器对同一情况用的错误通道并不一致，所以 `stale` 的措辞是「本次调用失败，定义可能已过期」，而不是断言。刷新视图把真实差异摆出来，判断权留给用户。

## 六、不可信的自我声明

MCP 有 `annotations.readOnlyHint` / `destructiveHint`，看起来正好可以用来决定哪些工具需要审批。

但这里有个陷阱：**annotations 是上游服务器自己声明的**。恶意或低质量的服务器完全可以把删除工具标成 `readOnlyHint: true` 绕过审批——**由被审判者提供证词**。

所以 annotations 只能当**配置时的建议默认值**，不能当运行时判据：

```go
// defaultApproval 为用户即将审阅的工具预选审批模式。上游注解是服务器
// 对自己的声明，因此不能在调用时被信任，但作为一个用户仍需确认的
// 起点是合理的。
func defaultApproval(policy string, annotations *mcp.ToolAnnotations) string {
	switch policy {
	case policyNone:
		return approvalNever
	case policyWrites:
		if annotations != nil && annotations.ReadOnlyHint {
			return approvalNever
		}
		return approvalAlways
	default: // policyAll —— 无视上游声明
		return approvalAlways
	}
}
```

用户确认后，决定**固化进数据库**，运行时只读这份：

```go
// RequiresApproval 只查存储值；上游注解仅在审阅时作为建议输入，
// 永不影响运行时行为。
func (t ToolDefinition) RequiresApproval() bool {
	return t.Approval != approvalNever
}
```

注意默认值的方向：`Approval` 为空字符串时返回 `true`。**未设置不能读作"不需要审批"**。

还有个现实问题值得说破：**大多数 MCP 服务器根本不发布 annotations**，所以 `writes` 策略在实践中和「全部审批」几乎没区别。UI 文案如实写明了这点，而不是让它看起来会智能区分。

## 七、为什么不把远程工具再导出给 MCP 客户端

一个自然的想法：Workavera 既然是 MCP 服务器，能不能把用户接入的第三方工具也一并转发出去？

技术上是一行的事。但有个实打实的越权漏洞：

API key 的 `allow_destructive` 开关，靠的是一张**硬编码的破坏性工具名单**：

```go
var destructiveTools = map[string]bool{
	"board_delete_task":     true,
	"calendar_delete_event": true,
}
```

远程工具永远不在表里 → `IsDestructive` 永远返回 false → **一个明确勾了「不允许删除」的只读 key，照样能调到远程服务器的删除类工具**。

所以远程工具只加进 `ForChat`，`ForActor`（MCP 导出用）一行不动：

```go
// Remote MCP tools stay out of ForActor for a specific reason: an API key's
// allow_destructive scope is enforced against a known list of built-in
// destructive tools, and no equivalent judgement can be made about a
// third-party tool. Exporting them would silently widen what a read-only key
// can do.
```

而且收益也很小：Claude Code / Cursor 本来就能直接配置那些服务器，绕经一手只增加延迟和故障点。

## 八、踩坑：405 与 410

配置 DeepWiki 时连续踩了两个坑，都是传输方式相关。

**第一次：`Method Not Allowed`**

URL 填的是 `https://mcp.deepwiki.com/sse`，传输选了默认的 Streamable HTTP。旧版 SSE 端点只接受 GET，而 Streamable HTTP 会把 `initialize` POST 过去 → 405。

**第二次：`Gone`**

改成 SSE 传输，变成 410。直接探一下：

```bash
curl -s -i -H 'Accept: text/event-stream' https://mcp.deepwiki.com/sse
```

```json
{
  "error": "SSE transport is deprecated",
  "message": "The SSE transport has been deprecated in favor of Streamable HTTP.
              Please use the /mcp endpoint instead.",
  "endpoint": "/mcp"
}
```

服务器给了非常清楚的说明，但界面上只显示 "Gone"——因为 SDK 在判断状态码非 2xx 后直接 `resp.Body.Close()`，只返回 `http.StatusText`：

```go
if resp.StatusCode < 200 || resp.StatusCode >= 300 {
	resp.Body.Close()
	return nil, fmt.Errorf("failed to connect: %s", http.StatusText(resp.StatusCode))
}
```

拿不到就自己补。405 和 410 都加了可操作的解释：

> The endpoint rejected the request method. This usually means the transport does not match the URL: use SSE for a /sse endpoint, or Streamable HTTP for a /mcp endpoint.

> The server has permanently retired this endpoint. If the URL ends in /sse, the server has most likely dropped the legacy SSE transport: switch to its Streamable HTTP endpoint, usually /mcp.

**生态背景**：整个 MCP 生态正在弃用 2024-11-05 的 SSE 传输，迁移到 2025-03-26 的 Streamable HTTP。DeepWiki 用 410 + 说明文字是很规范的下线做法。

## 九、一个 UI 层的通用 bug

做设置页时撞上一个 Radix 的经典问题：**弹窗里点下拉菜单，整个弹窗被关掉**。

Radix 把 Select 内容渲染到 body 上的独立 portal，不在 Dialog 的 DOM 子树里，所以操作它被判定为「点击外部」而 dismiss 整个浮层。

我第一版方案是靠选择器识别事件来源，然后 `preventDefault`。但它是猜的——不确定 dismiss 事件的真实 target。

更好的方案（用户提的）：**外部点击一律不关闭**，只保留 Esc 和关闭按钮。

```tsx
// Clicking outside never dismisses a dialog; Escape and the close button do.
// Dialogs hold forms, so a stray click should not discard typed input, and
// Radix renders dropdown content in its own portal where interacting with it
// reads as an outside click and would close the dialog underneath.
onInteractOutside={(event) => event.preventDefault()}
```

一行，覆盖整类 bug（日期选择器、命令面板、下拉菜单全都包括），不需要判断事件来源。而且顺带修了一个独立问题：填长表单时手滑点到空白，整表连凭据一起丢。

Radix 的 `AlertDialog` **本来就不响应外部点击**，所以这个模式在项目里早已存在，只是推广到了 Dialog 和 Sheet。

## 十、Prompt Caching：一个被发现的空缺

讨论工具数量时顺带查证了一件事：**这个项目根本没开 prompt caching**。

fantasy 支持（`anthropicTool.CacheControl`），但需要通过 `ProviderOptions` 显式开启，而项目里 `SetProviderOptions` 只是为了满足接口而实现，从未被调用。`CacheReadTokens` 只在统计里读一下。

Anthropic 的可缓存前缀顺序是 `tools → system → messages`，工具定义在最前面，所以工具清单一变，后面全部失效。

排查后发现三个位置里**两个可达**：

| 位置 | 本项目能否设置 |
|---|---|
| 工具块 | ✅ `SetProviderOptions` 已在接口上 |
| 消息 | ✅ `toFantasyMessages` 里自己构造 `fantasy.Message` |
| **系统提示** | ❌ `WithSystemPrompt(string)` 内部走 `NewSystemMessage`，不给外部挂 options 的口子 |

但因为缓存是**前缀**语义，断点打在历史消息末尾覆盖的是 `tools + system + 全部历史`——比只缓存 system 更划算。最优放置恰好可达。

而且只需要动 Anthropic：OpenAI 自动前缀缓存、DeepSeek 自动、Google 有隐式缓存。

## 十一、工具网关：为什么「省了个寂寞」

最后一个被否掉的方案，讨论得最深。

**想法**：工具多了以后，与其把 N 个工具全注入 tools 块，不如只放两个固定工具——`mcp_find_tools`（分页搜索）和 `mcp_run_tool`（调用）。工具清单永远固定，利于缓存，省 token。

这个想法是对的，也是生态的走向（渐进式工具披露）。但推演下来有几个非显然的问题。

### 问题一：schema 约束

先要澄清一个概念——**供应商会拿 schema 约束模型生成**，不只是我们自己事后校验。

直连时，每个工具是一个签名具体的函数：

```json
{
  "name": "mcp_deepwiki_read_wiki_contents",
  "input_schema": {
    "properties": {
      "repoName": {"type": "string", "description": "owner/repo"},
      "page":     {"type": "integer", "minimum": 1}
    },
    "required": ["repoName"]
  }
}
```

网关时，一个函数要能调所有工具，签名只能通用化：

```json
{
  "name": "mcp_run_tool",
  "input_schema": {
    "properties": {
      "server":    {"type": "string"},
      "tool":      {"type": "string"},
      "arguments": {"type": "object"}
    }
  }
}
```

`arguments` 是个空壳。用 Go 打比方：

```go
func ReadWikiContents(repoName string, page int) Result  // 直连
func RunTool(server, tool string, arguments any) Result  // 网关
```

`any` 不是"约束弱"，是"没有约束"。

**那把 N 个 schema 用 `oneOf` 都写进去呢？** 两个问题：一是它把所有 schema 又搬回 tools 块了，而省 token 靠的正是"不搬"——**省量和约束是同一样东西**；二是在这个项目里连发都发不出去，fantasy 会把每个工具的 schema 重建成：

```go
inputSchema := map[string]any{
	"type":       "object",
	"properties": info.Parameters,
	"required":   info.Required,
}
```

根级的 `oneOf` / `anyOf` / `$defs` 全部丢弃。（这也是刷新时必须就地展开 `$defs` 的原因。）

### 问题二：约束强度其实是个光谱

不过这里我自己的表述也被纠正了。查证后发现，fantasy 走 Chat Completions 时写死了 `Strict: param.NewOpt(false)`，Anthropic 的 tool_use 本来也没有约束解码。**所以这个项目拿到的是"上下文引导"而非"约束解码"**——不是编译期检查，更像"签名写在注释里，模型基本照做但可能写错"。

而网关模式下，模型必须先搜索，搜索结果里就带着 schema——**那也是上下文引导**。两者的差距因此比我最初说的小得多。

fantasy 自带的校验则几乎等于没有：

```go
// Basic schema validation (check required fields)
// TODO: more robust schema validation using JSON Schema or similar
for _, required := range toolInfo.Required {
	if _, exists := input[required]; !exists { ... }
}
```

只查必填键在不在，类型、enum、嵌套一概不管。这正是要自己接 `jsonschema-go` 做完整校验的原因。

### 问题三：省 token 有个前提

这是最值得说的一点。

**搜索结果会留在对话历史里，而且每一轮都重发。** 一次 `find_tools` 返回 10 个工具的描述 + schema，进了历史就一直在。搜两三次，历史里就攒了 20-30 个 schema。

| | 每次请求携带 |
|---|---|
| 直连 | N 个 schema（固定、去重、不增长） |
| 网关 | 2 个工具定义 + `搜索次数 × 10` 个 schema（累积） |

于是：

- **N=20，一轮搜 2 次** → 网关历史里躺了 20 个 schema，和直连一样多，**省了个寂寞**，还多付了回合
- **N=200，搜 2 次** → 20 vs 200，省得实实在在

**判据是 N（拥有的工具数）相对 K（实际用到的）有多大，不是 N 的绝对值。**

### 最终结论

把网关的取舍准确表述成：

> **token 成本从「按拥有的工具数」变成「按用到的工具数」，代价是发现可靠性 + 延迟 + 对话可读性。**

「发现可靠性」是主要成本而非 schema——模型必须先想到"也许有 MCP 工具能干这个"，**它不知道自己不知道什么**。system prompt 能缓解，不能消除。

「可读性」也别忘：网关后所有远程调用都显示成 `mcp_run_tool`，要恢复得给前端做特殊渲染。

三台服务器、9 个工具的场景下，N ≈ K，网关纯亏。等真挂了几百个工具、每轮只用一两个，再上就是明显的赢——而那时我会先看 fantasy 的 `ActiveTools`（注册全部真 schema、每步只激活少数），它同时保住了发现可靠性和真 schema，代价换成激活集浮动。

## 总结

几条可复用的经验：

1. **区分「优化」和「必需」。** 工具清单从数据库读是必需的（首字延迟、故障隔离），连接池只是优化。前者留、后者砍。

2. **让一个机制承担两个职责，往往是设计变优雅的信号。** 本地预校验本来只为省往返，结果顺手成了漂移检测的判据。

3. **不要信任被审判者的证词。** 上游 annotations 只能当配置时的预选值。

4. **区分「存储」「校验」和「约束」。** schema 一直在库里、我们一直在校验，网关丢的只是供应商侧的生成期引导——想清楚丢的到底是哪一层，结论才准确。

5. **错误信息要指向动作，不是状态码。** "Gone" 没用，"这个端点已下线，把 /sse 换成 /mcp" 才有用。

6. **省 token 的方案要算清楚"省下的"会不会从别处冒出来。** 搜索结果也占上下文，而且会累积。

7. **修 bug 时优先找那个能消掉整类问题的改法。** 判断事件来源是猜，"外部点击一律不关闭"是解。
