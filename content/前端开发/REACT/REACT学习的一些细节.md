```json
{
  "date": "2019.09.11 20:00",
  "tags": ["REACT基础"],
  "description":"之前不管是做后台应用还是H5都是使用的VUE,虽然也接触过REACT,但是用得却不多，我想，是时候用起来了"
}
```





## 记录一些REACT容易忽略的小细节


####  易于维护组件的设计要素

- 高内聚 指的是把逻辑紧密相关的内容放在一个组件中。用户界面无外
内容、交互行为和样式。传统上，内容由 HTML 表示，交互行放在
JavaScript 代码文件中，样式放在 CSS 文件中定义。这虽然满足一个功能
模块的需要，却要放在三个不同的文件中，这其实不满足高内聚的原则。
React 却不是这样，展示内容的 JSX、定义行为的 JavaScript 代码，甚至
义样式的 CSS，都可以放在一个 JavaScript 文件中，因为它们本来就是为
了实现一个目的而存在的，所以说 React 天生具有高内聚的特点。

- 低耦合 指的是不同组件之间的依赖关系要尽量弱化，也就是每个组件
尽量独立。保持整个系统的低耦合度，需要对系统中的功能有充分的认识
然后根据功能点划分模块，让不同的组件去实现不同的功能，这个功夫还在开发者身上，不过，React 组件的对外接口非常规范，方便开发者设计低耦合的系统。


#### 关于setState()

使用setState()更新State可能是异步的，出于性能考虑，React 可能会把多个 setState() 调用合并成一个调用。
因为 this.props 和 this.state 可能会异步更新，所以你不要依赖他们的值来更新下一个状态。即：调用了setState()之后，不要以为State更新了，马上用它来参与计算。


#### 某些情况没必要使用state

即react哲学的第三步，确定 UI state 的最小（且完整）表示

DRY: Don’t Repeat Yourself 

- 该数据可以由父组件通过 props 传递而来的
- 该数据随时间的推移而保持不变（可以直接定义在this上，像setInterval的标识）
- 该数据可以根据其他 state 或 props 计算出的值



####  组件的生命周期

- 装载过程（Mount），也就是把组件第一次在 DOM 树中渲染的过程；
   - constructor
   - getInitialState
   - getDefaultProps
   - componentWillMount
   - render
   - componentDidMount 
- 更新过程（Update），当组件被重新渲染的过程；
   - componentWillReceiveProps 
   - shouldComponentUpdate 
   - componentWillUpdate 
   - render 
   - componentDidUpdate
- 卸载过程（Unmount），组件从 DOM 中删除的过程。
   - componentWillUnmount


#### render

React组件的父类React.component除了render之外的方法都有默认实现，因此，一个React必须要有render函数，如果这个组件不想渲染任何Dom元素，可以返回null或者false。


#### componentWillReceiveProps

componentWillReceiveProps并不是 props 发生改变的时候才会被调用，实际上，只要是父组件的 render 函数被调用，在 rende函数里面被渲染的子组件就会经历更新过程，不管父组件传给子组件的 props 有没有改变，都会触发子组件的 componentWill-ReceiveProps函数。
注意，通过 this.setState 方法触发的更新过程不会调用这个函数，这是因为这个函数适合根据新的 props 值（也就是参数 nextProps ）来计算出是不是要更新内部状态 state。更新组件内部状态的方法是this.setState ，如果 this.setState 的调用导致 componentWillReceiveProps 再一次被调用，那就是一个死循环了。



#### 在JSX中最好不要直接把匿名函数赋值给onClick方法

虽然这样看起来非常简洁而且方便，其实并不是值得提倡的方法，因为每次渲染都会创造一个新的匿名方法对象，而且有可能引发子组件不必要的重新渲染。像下面这样：
```javascript
render() {
   return (
      <div style={style}>
         <button onClick={ () => this.forceUpdate() }>
            Click me to repaint!
         </button>
      </div>
   );
}
```

#### shouldComponentUpdate(nextProps,nextState)


render 和 shouldComponentUpdate 函数也是 React 生命周期函数中唯二两个要求有返回结果的函数。render 函数的返回结果将用于构造 DOM 对象，而 shouldComponent-Update 函数返回一个布尔值，告诉 React 库这个组件在这次更新过程中是否要继续。


#### componentWillUpdate 和 componentDidUpdate

如果组件的 shouldComponentUpdate 函数返回 true，React 接下来就会依次调用对应组件的 componentWillUpdate 、render 和 componentDidUpdate 函数。