```json
{
 "date": "2023.01.15 21:00",
  "tags": ["git","wails","go-git"]
}
```



## 工具

可以通过 brew 安装 mac 下常用的 watch 和 tree 命令行工具，tree 可以通过字符的形式展示一个目录，watch 可以实时刷新对应的命令。

```
watch -n 0.5 tree .git
```

当对仓库操作越来越多的时候，objects目录会影响我们观看，可以使用下面命令排除objects目录

```
watch -n 0.5 tree .git -I "objects"
```

## 

## Git

Git 先是一个文件内容寻址管理系统，其次才是一个版本控制系统。当你使用 git add a.txt时。git 会开始追踪你的这个文件，并将  a.txt 里面的内容 hash 成 git 的 blob 对象存储在 objects 目录下，说到 git 的对象和目录我们先看看这部分。

Git 对象类型分为 tag、commit、tree、blob

- tree代表的是文件和目录结构
- blob用来存储文件内容
- commit 存储一次提交的信息，包含对应的tree，parent是谁，作者及message等信息
- tag 就是标签的意思。

Git 提供了一些工具查看它存储的内容

```
git cat-file -t 23b9. 查看一个对象的类型
git cat-file -p 23b9. 查看一个对象的内容
```

```
├── COMMIT_EDITMSG
├── HEAD 当前所在分支
├── config
├── description
├── hooks
├── index
├── info
│   └── exclude
├── logs
│   ├── HEAD
│   └── refs
│       └── heads
│           ├── main
│           ├── my-branch
│           ├── test
│           └── v1.1
├── objects  git 将目录结构、文件名、文件内容、tag、提交的信息全部 hash 放在这个目录
│   ├── 00
│   │   ├── 063ee2301436f3c184dbb4ad9c323bedd257c7
│   │   ├── 3660ccd454c80141407bed9e0728605aab8077
│   │   └── eebc020dc7a7be4df1224e39660bfb20439efc
│		├── ad
│   │   ├── 243af601bae4190a6dd603b700aa946c1910b2
│   │   └── e4e4ed2b6ec968201ab61338679f371d5d1180
│   ├── info
│   └── pack
├── packed-refs
└── refs  引用，tag 和 branch 的引用
    ├── heads  分支引用
    │   ├── main
    │   ├── my-branch
    │   ├── test
    │   └── v1.1
    └── tags tag引用
        ├── v1.0
        ├── v1.1
        ├── v1.2
        ├── v1.3
        └── v1.4
```

为什么不吧所有内容直接放objects目录下，而要取 hash 的前两位做成目录呢？这是因为有的操作系统对目录下的文件数量有要求。

同时，在同一目录下的文件并没有什么关联，只是恰好 hash 前两位相同而已。

对 Git 对象和目录有印象了之后我们接着上面使用 git add 一个文件之后，在 objects 目录得到一个

ea 文件夹下的 8f022358f628a253b545954077f89c5141a4fe 文件。使用 ```git cat-file -t ea8f``` 得到 blob ，也就是说，我们一个文件内容不管内容有多大，只要每一次 commit 时，内容没有变，那么他的 hash 还是一样的，commit 记录的快照指向的 hash对应的tree里对应的文件都是同一个，所以 git 切换分支和版本恢复超级快，它其实就是将快照检出到工作区，每次提交只会存储已经改变的文件。

Git 每次提交会将当前提交的用户、时间、备注、和上次提交的 commit 对象的 hash 生成一个新的  commit 对象，是不是有点像区块链？哈哈哈，所以 git 的数据也很安全，要伪造数据的成本是很高的，同时每个 commit  包含了上一次的commit  hash 。所有的 commit  就被链起来了，普通commit只有一个parent commit，而merge commit会有多个parent commit，取决于从多少个分支进行merge。

git标签分类 一种轻量级标签直接指向一个Commit类型的对象,一种带备注的标签，指向一个tag类型的对象



## 开发

一开始我打算了解git原理，然后使用go-git这个库来开发，避免依赖git, 但是在开发的过程中，我发现go-git在某些情况下的表现和git不太一样，比如切换分支时，暂存区还有另外一个分支刚提交的文件，后面了解了git 的--format参数，然后全部重构成解析git输出来提供软件的后端支持，结果--format这玩意也有坑。

比如坑：

- 如果分支和标签名字是test时，使用格式化字符串```%(refname:short)```居然是错的，给我输出了 tags/Test 和 heads/test 
- 如果用户提交的message里面含有```"```字符时，使用```--format='{"name":"%(refname:short)","refName":"%(refname)","type":"%(objecttype)","message":"%(subject)","hash":"%(objectname)","time":"%(creatordate:relative)"},'``` 会导致解析失败,后面自己设置字符串模版来解析了，就没有使用json了。

当然也有一些有意思的地方，比如预合并：

当用户要将两个分支合并时，我们需要提前知道是否有冲突，有几个冲突，没有冲突的话合并过来的分支提前当前分支几个提交等，这里通过git内部命令完成，我们使用 ```merge-base``` 来找到两个分支的 baseHash ，然后通过```merge-tree```输出合并情况，通过正则```\+[<>=]{7}\s\.our[\w\W]*?\+[<>=]{7}\s\.their``` 查看有几次冲突，然后通过命令查看两个分支相差几次提交```rev-list --left-right --count```



使用wails2还需要注意的是，当我们通过Bind（填入一个实例指针地址）属性暴露出去的是一个实例，后续在前端调用的包方法都是基于这个实例来的。

##  

## 总结

1. 当你需要了解一门技术的时候，你最好去使用它，这样总比查看教程更深刻。但是，这也会花费你更多的时间。对于我来说，尽量找到自己感兴趣和热爱的东西，即使花费了大量的时间，但也乐在其中。

2. 对于类似 wails2 这种技术，后台和前台（这里指某种后台绑定，golang、rust、nodejs等，以及webview前台），要在一开始就要想清楚后台和前台的职责，你的页面逻辑是否放在后台，比如我这里的仓库的数据，以及每个仓库的分支和tag等，如果放在后台，那就需要更多的前后台数据沟通，前台就会轻一些。而我则选择了将大部分逻辑放在前台，后台则只提供各种各样的功能。

