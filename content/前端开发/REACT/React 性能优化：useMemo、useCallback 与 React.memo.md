```json
{
  "date": "2026.03.10 10:00",
  "tags": ["React", "性能优化", "React Compiler", "前端"],
  "description": "从 React 默认渲染行为出发，逐一拆解 useMemo、useCallback、React.memo 的作用与用法，并介绍 React Compiler 如何自动完成这些优化，附完整代码示例。"
}
```

# 理解 React 性能优化：useMemo、useCallback 与 React.memo

## 背景

在使用脚手架初始化 React 项目时，会遇到一个选项：

```
Select a variant:
│  ○ TypeScript
│  ● TypeScript + React Compiler
```

**React Compiler** 是 React 19 引入的编译时自动优化工具，其核心能力是自动帮开发者做 `useMemo`、`useCallback`、`React.memo` 的性能优化。要理解它为什么有用，先要搞清楚这三个工具分别是什么。

---

## 核心概念：React 的默认渲染问题

React 的默认行为是：**只要父组件重新渲染，所有子组件也会跟着重新渲染**，哪怕子组件的 props 根本没有变化。

```jsx
function Parent() {
  const [count, setCount] = useState(0)

  // 每次 Parent 重新渲染，这个函数都会被重新创建（新引用）
  const handleClick = () => console.log("clicked")

  // 这个计算每次都会重跑
  const total = bigList.reduce((a, b) => a + b, 0)

  return (
    <>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <Child onClick={handleClick} total={total} />
    </>
  )
}
```

点击按钮 → `Parent` 重新渲染 → `Child` 也跟着白跑一遍，造成不必要的性能浪费。

---

## 三个优化工具详解

### 1. `React.memo` — 让子组件跳过不必要的渲染

`React.memo` 对组件本身做缓存。包裹后的组件只有在 props **真正发生变化**时才会重新渲染。

```jsx
// ❌ 没有 memo：只要父组件更新，Child 必定重新渲染
function Child({ name }) {
  return <div>{name}</div>
}

// ✅ 有 memo：只有 name 真正变化时，Child 才重新渲染
const Child = React.memo(function Child({ name }) {
  return <div>{name}</div>
})
```

**注意**：`React.memo` 做的是**浅比较**。如果 props 是对象或函数，每次父组件渲染都会产生新引用，memo 仍然会失效。

---

### 2. `useCallback` — 稳定函数引用

`useCallback` 缓存函数本身的引用，只有依赖数组中的值变化时才重新创建函数。

```jsx
function Parent() {
  const [count, setCount] = useState(0)

  // ❌ 每次渲染都是全新的函数，引用不同
  // 导致 memo 失效（Child 以为 props 变了）
  const handleClick = () => console.log("clicked")

  // ✅ 函数被缓存，引用稳定，不会让 Child 误判 props 变化
  const handleClick = useCallback(() => {
    console.log("clicked")
  }, []) // 依赖数组：只有数组里的值变化，才重新创建函数

  return <Child onClick={handleClick} />
}
```

**核心用途**：配合 `React.memo` 使用。如果只用 `React.memo` 而不用 `useCallback`，父组件传下去的函数每次都是新引用，memo 照样失效。

---

### 3. `useMemo` — 缓存昂贵的计算结果

`useMemo` 缓存计算结果，只有依赖变化时才重新计算。

```jsx
function Parent({ list }) {
  // ❌ 每次渲染都重新计算，list 没变也跑
  const total = list.reduce((sum, n) => sum + n, 0)

  // ✅ list 不变 → 直接用上次的结果，不重算
  const total = useMemo(() => {
    return list.reduce((sum, n) => sum + n, 0)
  }, [list]) // 依赖数组：list 变了才重新算

  return <div>Total: {total}</div>
}
```

**适用场景**：排序、过滤大数组、复杂的数据转换等计算开销较大的操作。

---

## 三者对比总结

| 工具 | 缓存的是 | 什么时候用 |
|------|----------|------------|
| `React.memo` | **组件渲染结果** | 子组件 props 不常变时 |
| `useCallback` | **函数引用** | 函数要传给 memo 子组件时 |
| `useMemo` | **计算结果** | 有昂贵计算（排序、过滤大数组）时 |

---

## React Compiler 的作用

手写优化时，你需要：

```jsx
const handleClick = useCallback(() => { ... }, [dep1])
const result = useMemo(() => compute(data), [data])
const Child = React.memo(Child)
```

**React Compiler** 在编译阶段自动分析代码，帮你加上这些优化，你只需要写普通代码：

```jsx
const handleClick = () => { ... }
const result = compute(data)
function Child({ name }) { ... }
```

效果完全一样，但代码更干净，也不用担心漏写依赖数组。

---

## 踩坑 & 注意事项

1. **三个工具需要配合使用**：单独用 `React.memo` 而不稳定函数引用，优化无效。
2. **不要滥用**：不是所有组件都需要 memo，过度优化本身也有开销（依赖比较的成本）。
3. **`useMemo` 不是万能的**：轻量计算用 useMemo 反而更慢，只在计算真的耗时时才用。
4. **React Compiler 仍在演进**：如果项目要求兼容旧版 React 或追求极致稳定，选普通 TypeScript 方案更稳妥。

---

## 总结

- `React.memo`、`useCallback`、`useMemo` 三者都是为了**减少不必要的重新渲染**，需要配合使用才能发挥效果。
- **React Compiler** 是对这三个工具的自动化替代，新项目推荐开启，可以写更简洁的代码同时享受同等优化效果。
- 理解默认渲染行为是优化的前提：父组件渲染 → 子组件默认跟着渲染，优化的目标就是打破这个默认链路。
