```json
{
  "date": "2026.03.29 14:00",
  "tags": ["Claude Code", "Agent", "任务系统", "DAG", "Tool Use"],
  "description": "解析 Claude Code 的任务管理演进历程：从 TodoWrite/TodoRead 到基于文件持久化的 Tasks 系统，以及 DAG（有向无环图）如何驱动任务依赖与并行调度，附完整 JSON 示例和核心判断逻辑代码。"
}
```

# Claude Code 任务系统深度解析：从 TodoWrite 到 DAG 依赖调度

## 背景

在阅读 [learn-claude-code s07-task-system](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s07-task-system.md) 时，文中描述了一种通过 JSON 文件、任务状态机和依赖图来构建持久化任务系统的 Harness 设计模式。

这引发了一个核心问题：**Claude Code 是否原生支持这些功能？** 本文记录了对这个问题的完整探讨，包括 Claude Code 的任务系统演进、工具机制原理和 DAG 调度逻辑。

---

## 核心概念

### 1. 什么是 Harness

s07 提出的设计思路是：**模型是 Agent，代码是 Harness**。Claude 负责推理决策，Harness 负责执行落地。任务系统就是 Harness 的一部分——把大目标拆成小任务，持久化到磁盘，按依赖关系驱动执行。

### 2. Claude Code 内置工具

**`TodoWrite`、`TaskCreate` 这些任务工具和 `Bash`、`Read`、`Write` 本质上没有区别，都是 Tool**。Claude Code 启动时会把所有内置工具注入到 system prompt：

```
可用工具：
- Bash        （执行命令）
- Read        （读文件）
- Write       （写文件）
- TodoWrite   （管理任务列表）  ← 和其他工具平级
- TaskCreate  （创建任务）
- Task        （派生子 agent）
```

Claude 决定"记录一个任务"时，就像决定"读一个文件"一样，发出 `tool_use` 调用：

```json
{
  "type": "tool_use",
  "name": "TodoWrite",
  "input": {
    "todos": [...]
  }
}
```

### 3. Todos 系统 vs Tasks 系统

2026 年 1 月，Anthropic 对 Claude Code 进行了重大升级，从 **Todos 系统** 演进到 **Tasks 系统**：

| 功能 | Todos（旧） | Tasks（现在） |
|---|---|---|
| 存储方式 | 内存中，会话结束即消失 | 文件（`.claude/tasks/`），持久化 |
| 跨会话 | ❌ | ✅ |
| 依赖图（depends_on） | ❌ | ✅ |
| 阻塞原因（blocked_by） | ❌ | ✅ |
| 优先级 | ❌ | ✅ |
| 跨 session 协作 | ❌ | ✅ |
| 版本控制友好 | ❌ | ✅（文件可以 git commit） |

值得注意的是，`TodoWrite` 并未被完全删除，而是和新的 Task 工具**并存**，可以通过 `CLAUDE_CODE_ENABLE_TASKS=false` 回退到旧行为。

---

## 实现过程

### 依赖关系从哪里来？

这是整个任务系统最关键的问题。答案是：**依赖关系由 Claude 自己的推理决定，不是某个外部分析系统**。

Claude 在第一次调用工具创建任务时，就已经把依赖关系"想好了"一起写进去：

```json
[
  {
    "id": "task-1",
    "title": "创建登录表单",
    "status": "pending",
    "depends_on": []
  },
  {
    "id": "task-2",
    "title": "添加表单验证",
    "status": "pending",
    "depends_on": ["task-1"]   // ← Claude 自己判断：必须在 task-1 之后
  },
  {
    "id": "task-3",
    "title": "创建注册表单",
    "status": "pending",
    "depends_on": []            // ← 和 task-1 无关，可以并行
  },
  {
    "id": "task-4",
    "title": "对接认证 API",
    "status": "blocked",
    "depends_on": ["task-2", "task-3"],
    "blocked_by": "等待后端提供 API 文档"  // ← 从用户上下文感知到的阻塞
  }
]
```

Claude 能判断依赖关系，靠的是：
- **训练中学到的软件工程常识** —— 知道"写测试"在"写代码"之后，"部署"在"测试通过"之后
- **对用户描述的理解** —— 用户说"等后端文档"，Claude 就知道有外部阻塞
- **System Prompt 的引导** —— Claude Code 的系统提示要求 Claude 创建任务时明确声明依赖关系

### DAG：有向无环图

**DAG（Directed Acyclic Graph，有向无环图）** 是任务依赖系统的底层数据结构：

- **有向** = 依赖关系有方向（A 必须在 B 之前）
- **无环** = 不能出现循环依赖（A→B→C→A 是非法的，会导致系统卡死）
- **图** = 任务之间的关系网络

DAG 的核心价值：**自动判断执行顺序，找出可并行的任务**。本质上只做一件事——回答"**现在谁可以动？**"

```
可执行 = 没有依赖  OR  所有依赖都已完成
```

### DAG 调度示例

以上面 4 个任务为例，逐轮演示调度过程：

**第一轮：**
```
task-1: depends_on = []              → 没有依赖 ✅ 可执行
task-2: depends_on = [task-1]        → task-1 是 pending ❌ 不可执行
task-3: depends_on = []              → 没有依赖 ✅ 可执行
task-4: depends_on = [task-2, task-3]→ 都没完成 ❌ 不可执行
```
→ **task-1 和 task-3 可以并行执行**

**task-1 完成、task-3 还在跑：**
```
task-2: depends_on = [task-1]  → task-1 completed ✅ 可执行
task-4: depends_on = [task-2, task-3] → task-3 还 in_progress ❌
```
→ **task-2 开始，与 task-3 并行**

**task-2 和 task-3 都完成：**
```
task-4: depends_on = [task-2, task-3] → 全部 completed ✅ 可执行
```
→ **task-4 现在可以执行**

### Harness 核心判断逻辑

```python
def can_start(task, all_tasks):
    return all(
        find(dep_id).status == "completed"
        for dep_id in task.depends_on
    )
    # depends_on 为空时，all() 对空列表返回 True → 直接可执行
```

这就是"没有依赖"和"所有依赖完成"统一成同一个判断的原因。Harness 本身不做任何智能推断，只是机械地执行这个规则。

### Agent SDK 监听 Todo 变化

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Optimize my React app performance and track progress with todos",
  options: { maxTurns: 15 }
})) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "tool_use" && block.name === "TodoWrite") {
        const todos = block.input.todos;
        todos.forEach((todo, index) => {
          const status =
            todo.status === "completed" ? "✅" :
            todo.status === "in_progress" ? "🔧" : "❌";
          console.log(`${index + 1}. ${status} ${todo.content}`);
        });
      }
    }
  }
}
```

---

## 关键结论

### 职责分工

| 角色 | 负责什么 |
|---|---|
| **Claude（模型）** | 推理决策：拆解任务、判断依赖关系、决定调用哪个工具 |
| **Harness（代码）** | 执行落地：检查依赖是否满足、持久化状态、调度下一个可执行任务 |

### s07 与 Claude Code 的关系

s07 的 Harness 设计模式描述的正是 Anthropic 自己在 Claude Code 中实现的方案。s07 是提前"预言"了官方的演进方向，现在 Claude Code 的 Tasks 系统已经原生支持了 s07 描述的全部功能：文件持久化、依赖图、阻塞状态、跨 session 协作。

### 并行是先后顺序的副产品

DAG 本身不关心串行还是并行，它只负责找出"当前可执行的任务集合"。至于这些任务是串行还是并行执行，由 Harness 决定——有多个 Agent 就并行分配，只有一个 Agent 就串行处理。

---

## 总结

Claude Code 的任务系统演进，本质上是将原来需要开发者自己搭建的 Harness（s07 的设计模式）内置到了工具链中。核心思路始终不变：

1. **Claude 负责推理**：理解任务语义、判断依赖关系
2. **工具负责执行**：TodoWrite/TaskCreate 都是普通 Tool，和 Bash/Read 平级
3. **DAG 负责调度**：通过"可执行条件"自动找出可并行的任务，驱动整个执行流程
