```json
{
  "date": "2026.04.24 22:30",
  "tags": ["React", "Hooks", "闭包", "useCallback", "useRef"],
  "description": "通过重构 Chat 页面的真实代码，深入理解 React 闭包模型下 stale closure 问题的成因，以及 useCallback、useRef、useEffect 依赖数组如何协同工作来保证正确性和稳定性。"
}
```

# React 闭包陷阱：从一次真实重构理解 stale closure 与 useCallback/useRef

## 背景

在重构一个 Wails + React 的 Chat 页面时，遇到了一个典型问题：切换对话后，当前 Agent 没有更新。顺着这个 bug 往下挖，发现整个 ChatDetail 组件的数据流都存在 stale closure 隐患——异步回调里读到的 `id`、`conversation` 可能是旧值。

这篇文章就用这次重构的真实代码，把 React 闭包模型下的几个核心概念梳理清楚：**闭包为什么会 stale、useCallback 的依赖数组到底在控制什么、useRef 为什么能逃逸闭包、以及什么时候不用 useCallback 反而更好**。

## 核心概念

### 1. React 组件就是函数，每次渲染都是新的闭包

React 组件本质上就是一个函数，`props` 和 `state` 变了 → **整个函数重新执行**，产生新的闭包：

```tsx
function ChatDetail() {
  const { id } = useParams();        // 新渲染 → 新的 id
  const [sending, setSending] = ...;  // 新渲染 → 新的 sending

  // 同步代码：每次渲染都是新闭包，读到最新值 ✅
  console.log(id);

  // JSX：同步执行，读到最新值 ✅
  return <div>{id}</div>
}
```

**JSX 不会有 stale closure 问题**，因为它是同步渲染的——每次组件函数执行时，`id`/`props` 就是当前渲染的最新值，渲染完就产出虚拟 DOM，不存在"异步回来读旧值"的情况。

### 2. Stale Closure：异步回调里的时间差

问题出在**异步回调**。当回调被创建后，它捕获的是创建那一刻的变量快照。等异步操作完成时，变量可能已经变了：

```ts
function ChatDetail() {
  const { id } = useParams(); // id = "abc"

  const loadMessages = async () => {
    // 闭包捕获 id = "abc"
    const msgs = await MessageService.GetByConversationID(id); // 网络请求 2 秒
    setMessages(msgs);
  };
}
```

时间线：

```
t=0  id="abc"，loadMessages 启动（捕获 id="abc"），发起网络请求
t=1  用户点击切换，id="xyz"，组件重渲染，产生新的 loadMessages（捕获 id="xyz"）
t=2  t=0 的网络请求返回 → setMessages(旧的 "abc" 的消息) ← 覆盖了当前状态！
```

**这就是 stale closure：异步回调执行时，闭包里的值已经过时了。**

### 3. useCallback 的依赖数组：决定函数何时重建

`useCallback` 的第二个参数（依赖数组）决定了函数何时重建：

| 写法 | 重建时机 | 闭包里的值 |
|------|---------|-----------|
| `useCallback(fn, [id])` | `id` 变了才重建 | 最新 ✅ |
| `useCallback(fn, [sending])` | `sending` 变了才重建，`id` 变了**不重建** | `id` 可能是旧值 ❌ |
| `useCallback(fn, [])` | 永远不重建 | 永远是第一次渲染的值 ❌ |
| 不用 `useCallback` | 每次渲染都重建 | 最新 ✅ |

所以有人会说：那我直接把 `id` 加到依赖数组不就行了？

```ts
const loadMessages = useCallback(async () => {
  const msgs = await MessageService.GetByConversationID(id);
  setMessages(msgs);
}, [id]); // id 变了就重建 ✅
```

**能解决 stale closure，但会引来另一个问题：级联重建。**

### 4. 级联重建：加了依赖导致的连锁反应

用实际代码的链路来看：

```ts
// id 变了 → loadMessages 重建
const loadMessages = useCallback(async () => {
  console.log(id);
}, [id]);

// loadMessages 变了 → handleStreamComplete 重建
const handleStreamComplete = useCallback(async () => {
  await loadMessages();
}, [loadMessages]);

// handleStreamComplete 变了 → useStreamSubscription 内部：
//   如果没用 ref，handleStreamEvent 要依赖 onComplete
//   handleStreamEvent 变了 → subscribe 重建
//   subscribe 变了 → handleSend 重建
//   一层传一层，id 变一次，整条链全部重建
```

两个后果：

1. **子组件无意义重渲染** — `ChatInput` 收到新的 `onSend` prop，每次都重渲染
2. **流订阅被打断** — `subscribe` 重建意味着 `Events.On` 注册的事件处理器变了，正在进行的流可能收不到事件

**这才是 `useRef` 出场的原因。**

## 实现过程

### useRef：闭包的逃逸口

`useRef` 返回的是一个**可变引用对象**，在整个组件生命周期中是同一个对象。`.current` 可以随时读写，不受闭包限制：

```ts
const idRef = useRef(id);
idRef.current = id; // 每次渲染同步更新

const loadMessages = useCallback(async () => {
  const currentId = idRef.current; // 从 ref 读，永远最新
  const msgs = await MessageService.GetByConversationID(currentId);
  setMessages(msgs);
}, []); // 空依赖也没关系，函数引用永远稳定
```

**本质**：`idRef` 把普通值手动包成了类似 Vue `ref()` 的响应式引用——读 `.current` 永远拿到最新值，不需要依赖数组驱动重建。

### onCompleteRef / onErrorRef：打断循环依赖

在 `useStreamSubscription` 中，还有一个经典的 ref 用法——打断循环依赖：

```ts
// 如果 onComplete 直接作为 handleStreamEvent 的依赖：
// onComplete 变了 → handleStreamEvent 重建 → subscribe 重建 → 无限循环

// 用 ref 打断链：
const onCompleteRef = useRef(onComplete);
onCompleteRef.current = onComplete; // 每次渲染更新指向

const handleStreamEvent = useCallback((event) => {
  // 不依赖 onComplete，通过 ref 调用最新版本
  setStreamState((prev) => {
    switch (data.type) {
      case "complete":
        setTimeout(() => {
          onCompleteRef.current(); // ← 调用到最新回调
          unsubscribe();
        }, 0);
        return prev;
    }
  });
}, [unsubscribe]); // 不依赖 onComplete，不会触发级联重建
```

### useChatStore.getState()：Zustand 的逃逸方式

在 `handleSend` 中读取 `conversation.agent_id`，也可以不用 ref：

```ts
const handleSend = useCallback(async (message, modelId, thinkingLevel) => {
  // 不从闭包读 conversation（可能过时）
  // 直接从 store 读最新值
  const agentID = useChatStore.getState().currentConversation?.agent_id || "";
  // ...
}, [subscribe, loadMessages]); // 不需要依赖 conversation
```

`useChatStore.getState()` 是 Zustand 提供的同步 API，不走 React 闭包，直接读 store 最新状态。

### useEffect + idRef 各司其职

代码里两者同时使用，解决不同的问题：

```ts
// useEffect 负责"id 变了，重新加载"——时机控制
useEffect(() => {
  if (id) loadCurrentConversation(id);
  loadMessages();
}, [id]);

// idRef 负责"异步回调里读到正确的 id"——值准确性
const idRef = useRef(id);
idRef.current = id;
```

**`useEffect` 解决"什么时候执行"，`idRef` 解决"执行时读到什么值"。**

## 踩坑 & 注意事项

### 1. 不用 useCallback 行不行？

不用 `useCallback`，每次渲染都是新函数，闭包里确实是最新的值。但：

- **普通组件**：影响不大，React diff 最终会发现 DOM 没变
- **memo 组件**：函数引用变了 → memo 失效 → 白渲染
- **事件监听/订阅**：**致命**——注册的是旧函数，流事件来了调用旧闭包，stale closure 又回来了

```ts
// 每次 render 都是新 handleStreamEvent
const handleStreamEvent = (event) => { ... };

// subscribe 注册了某个版本
Events.On(`chat:stream:${messageID}`, handleStreamEvent);

// 下次渲染，新的 handleStreamEvent 被创建
// 但 Events.On 注册的还是旧的那个！
```

### 2. Agent 不更新的 Bug 根因

切换对话时，`loadCurrentConversation` 先 `set({ currentConversation: conv })`，再异步加载 agent，这之间 `currentAgent` 还是旧的：

```ts
// 修复前：agent 在旧值停留，直到异步请求完成
const conv = await ConversationService.GetByID(id);
set({ currentConversation: conv }); // agent 还是上一个对话的！

// 修复后：同时清空 agent，避免闪烁
set({ currentConversation: conv, currentAgent: null });
```

### 3. setTimeout 在 setState 回调里的用法

在 `handleStreamEvent` 中，`complete`/`error` 事件需要在 `setStreamState` 的回调里触发异步清理，但 `setState` 回调里不应该有副作用。所以用 `setTimeout(fn, 0)` 把副作用推迟到 setState 之外执行：

```ts
setStreamState((prev) => {
  switch (data.type) {
    case "complete":
      // 不能在这里直接调用 onComplete()，会有副作用
      setTimeout(() => {
        onCompleteRef.current();
        unsubscribe();
      }, 0);
      return prev;
  }
});
```

## 总结

| 概念 | 解决什么问题 | 代码里的例子 |
|------|------------|-------------|
| 闭包 | 函数记住创建时的变量 | `loadMessages` 里读 `id` |
| Stale Closure | 异步回调读到旧值 | 切换对话后读到旧 `id` |
| useCallback 依赖数组 | 控制函数何时重建 | `[id]` vs `[]` vs 不用 |
| useRef (idRef) | 异步回调里读到最新值 | `idRef.current` 代替 `id` |
| useRef (onCompleteRef) | 打断依赖链避免级联重建 | 流回调里调用最新 `onComplete` |
| store.getState() | 绕过闭包直接读最新状态 | `useChatStore.getState()` |

**一句话总结**：React 闭包模型下，同步代码用 `id`/`props` 没问题，异步回调用 `useRef` 读最新值。`useCallback` 的依赖数组决定函数何时重建，不是所有变量都要加进去——`useRef` 是逃逸口，让函数引用稳定的同时还能读到最新值。

对比 Vue 的响应式系统（基于 Proxy），`ref()` / `reactive()` 天然追踪依赖，闭包里读到的永远是最新的，不需要 `useCallback`/`useRef` 这些心智负担。但理解 React 的这套机制，对写出正确的异步逻辑至关重要。
