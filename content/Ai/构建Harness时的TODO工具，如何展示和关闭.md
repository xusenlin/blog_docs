```json
{
  "date": "2026.03.20 22:00",
  "tags": ["AI编程", "Agent", "Harness"],
  "description": "在构建 AI Agent 的 Harness 层时，如何通过 TodoWrite 工具让 AI 先列计划再干活，包含工具定义、调用示例和 UI 展示机制。"
}
```

# 给 AI 加一个 TodoWrite 工具

## 为什么需要 TodoWrite

Harness 是包裹在 LLM 外面的一层控制逻辑——不替 AI 做决定，但帮它不跑偏。TodoWrite 就是 Harness 层的"规划"能力：AI 做复杂任务时容易重复做、跳步、干到一半忘了要干嘛，给它一个待办清单，先列步骤再动手。

## 三件事

### 1. TodoManager —— 管状态

每个任务有三种状态：

- `pending` —— 还没做
- `in_progress` —— 正在做（同一时间只能有一个）
- `done` —— 做完了

AI 每次调用 todo 工具，传进来的是**完整的新列表**，直接覆盖旧的，不会增量追加。

JS 实现：

```javascript
class TodoManager {
  constructor() {
    this.items = [];
  }

  update(items) {
    const validated = [];
    let inProgressCount = 0;

    for (const item of items) {
      const status = item.status || "pending";
      if (status === "in_progress") inProgressCount++;
      validated.push({ id: item.id, text: item.text, status });
    }

    if (inProgressCount > 1) {
      throw new Error("Only one task can be in_progress");
    }

    this.items = validated;
    return this.render();
  }

  render() {
    const statusMap = { pending: "[ ]", in_progress: "[>]", done: "[x]" };
    return this.items.map(i => `${statusMap[i.status]} ${i.text}`).join("\n");
  }
}
```

### 2. AI 怎么知道该调用 todo

靠定义工具时写的 `description`。里面写了什么时候该用、什么时候不该用，还附带一堆正例和反例。

关键：**AI 不是靠猜的，是你提前写好说明书告诉它的。**

### 3. 参数格式怎么让 AI 知道

注册工具时用 JSON Schema 描述参数结构。比如 todo 的 `items` 是数组，每个元素有 `id`、`text`、`status`。AI 读了这个 schema 就知道该传什么。

工具注册：

```javascript
const TODO = new TodoManager();

const TOOL_HANDLERS = {
  // ...其他工具...
  todo: (args) => TODO.update(args.items),
};
```

工具的 JSON Schema 定义：

```javascript
const todoTool = {
  name: "todo",
  description: "管理和更新待办任务列表，遇到多步任务时优先调用",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "任务编号" },
            text: { type: "string", description: "任务描述" },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "done"],
            },
          },
          required: ["id", "text"],
        },
      },
    },
    required: ["items"],
  },
};
```

## AI 实际调用长什么样

用户说"帮我重构这个文件"，AI 自己拼出的调用：

```json
{
  "tool": "todo",
  "items": [
    { "id": "1", "text": "添加类型注解", "status": "pending" },
    { "id": "2", "text": "添加文档字符串", "status": "in_progress" },
    { "id": "3", "text": "添加 main guard", "status": "pending" }
  ]
}
```

做完第二步后，AI 再次调用，覆盖更新：

```json
{
  "tool": "todo",
  "items": [
    { "id": "1", "text": "添加类型注解", "status": "pending" },
    { "id": "2", "text": "添加文档字符串", "status": "done" },
    { "id": "3", "text": "添加 main guard", "status": "in_progress" }
  ]
}
```

全部做完：

```json
{
  "tool": "todo",
  "items": [
    { "id": "1", "text": "添加类型注解", "status": "done" },
    { "id": "2", "text": "添加文档字符串", "status": "done" },
    { "id": "3", "text": "添加 main guard", "status": "done" }
  ]
}
```

## Claude Code 的 TodoWrite description 是怎么写的

Claude Code 的工具描述写得特别细，核心靠**大量正例和反例**来教 AI 什么时候该用、什么时候不该用。

**什么时候该用：**

1. 复杂多步任务（3 步以上）
2. 非琐碎的任务
3. 用户主动要求列待办
4. 用户一次给了多个任务
5. 收到新指令后立刻记下来
6. 开始干活前标 in_progress
7. 完成后标 done，发现新子任务也加上

**什么时候不用：**

1. 只有一个简单任务
2. 任务很琐碎
3. 不到 3 步就能搞定
4. 纯聊天或纯回答问题

**任务格式要求每个任务写两样东西：**

- `content` —— 任务是什么（如"修复认证 bug"）
- `activeForm` —— 正在做时的展示形式（如"正在修复认证 bug"）

**重点：Claude Code 不是靠一条规则引导 AI 的，而是靠一堆例子教出来的。** 这比写一堆规则有效得多。

## UI 面板的生命周期

很多人以为面板是 AI 控制开关的，其实不是：

- **AI 调用 todo 工具** → 面板展示
- **AI 不再调用工具、给出最终回复（对话结束）** → 面板收起
- **面板消失 ≠ 数据丢失**，对话历史里有所有 todo 调用记录

所以不需要专门做"关闭计划"工具，面板的生命周期跟着对话轮次走。

### 典型场景

```
用户: "重构这5个文件"
AI: 调用 todo → 面板出现，5 个任务
AI: 做完第 1、2 个
AI: 第 3 个遇到问题，输出文字问用户
→ 面板收起，但 todo 还剩 3 个没做完
用户: "保留新版本"
AI: 看到上文的 todo 记忆，继续调用 todo → 面板再次出现
AI: 做完剩下的
```

### UI 实现思路

```javascript
let todoPanel = null;

// AI 调用工具时 → 展示面板
function onToolCall(toolName, args) {
  if (toolName === "todo") {
    todoPanel = args.items;      // 每次调用覆盖更新
    renderTodoPanel();
  }
}

// 对话轮次结束时 → 收起面板
function onTurnEnd() {
  todoPanel.collapsed = true;
  renderTodoPanel();
}
```

面板的显隐跟 todo 任务是否完成无关，只跟对话轮次有关。工具调用过程中面板一直挂着，AI 不再调用工具、给出最终回复后面板收起。下次 AI 再调用 todo，面板又会出现，数据是全新的覆盖。

## Nag Reminder —— 催 AI 更新清单

AI 有时候会忘记自己列的计划，干着干着就跑偏了。解法是加一个计数器：**如果 AI 连续 3 轮都没调用过 todo 工具**，系统就在下一轮对话里偷偷塞一句话提醒它。

```javascript
if (roundsSinceTodo >= 3 && messages.length > 0) {
  const last = messages[messages.length - 1];
  if (last.role === "user" && Array.isArray(last.content)) {
    last.content.unshift({
      type: "text",
      text: "<reminder>Update your todos.</reminder>",
    });
  }
}
```

原理很简单：
- `roundsSinceTodo` 记录 AI 从上次调用 todo 以来过了多少轮
- 每轮 AI 调用了 todo → 计数器归零
- 每轮 AI 没调用 todo → 计数器 +1
- 达到 3 轮 → 把 `<reminder>` 塞进用户的最新消息里

为什么塞进 `user` 的消息？因为 AI 最关注的就是用户的输入，从这里注入提醒它最容易注意到。

Nag Reminder 制造的是**问责压力**——你不更新计划，系统就追着你问。配合 "同时只能有一个 in_progress" 的规则，效果是：AI 既被迫聚焦当前任务，又被迫定期回顾整体进度。

## 设计精髓

三个东西各管各的：

| 谁 | 管什么 |
|---|---|
| 工具 | 管数据（todo 列表的状态） |
| UI | 管展示（面板什么时候画出来） |
| 对话 | 管记忆（进度不会丢，AI 能看到历史） |

不互相依赖，所以简单且稳。
