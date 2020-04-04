```json
{
  "date": "2020.03.15 19:30",
  "tags": ["MareWood","部署工具"],
  "description":"👏👏👏MareWood 开源了。MareWood 是一个轻量级的前端部署工具，使用了 GOLANG、GIN、GORM、SQLITE、JWT、REACE、MATERIAL-UI 开发， 不同于 Jenkins 的大而全，它很简单且只针对前端，你可以很灵活的配置各种部署环境。 如果你愿意，线上发布也可以是点击一下按钮这么简单的事情,当然也可以配置 WEBHOOK，提交 GIT 代码既自动发布。"
}
```



这件事还得从一只蝙蝠说起...（省略2万字）。然后，大家都开启了远程办公，后端家里网也没有穿透，每次调试 BUG 就要打包给后端或者不停的去运行 Linux 命令去部署不同的环境，可能一会后端、前端、测试小伙伴就会叫你打包，其中有一天，我做的工作最多的就是打包了，哈哈哈。

当然，我们也有 Jenkins ，但是对于前端来说不太友好，因为需要插件，使用也不那么直观，部署好了也找不到访问的网址，每次都需要后端帮忙新建项目。因此，我决定开发一个针对前端的部署工具，界面足够漂亮，安装足够简单，使用足够方便。

为了简单干净，技术栈使用了 GOLANG、GIN、GORM、SQLITE、JWT、REACE、MATERIAL-UI 

有了工具之后，每次我们提交代码，后端和测试都可以自行选择环境打包查看调试项目。

造不造轮子无所谓，主要在这个过程中体验到了用心做一个产品的成就感和学到了很多知识，有时候上床睡觉了，但是灵感来了会忍不住起床敲代码验证并记录。😂

![Snackbar](http://xusenlin.com/assets/images/MareWood.png)

## 设计思路

我设计了三张表，分别是

仓库

```go
type Repository struct {
	gorm.Model
	Name         string `binding:"required,min=2,max=20"`
	Desc         string `gorm:"type:varchar(1000)"`
	Url          string `binding:"url"`      //仓库的地址
	UserName     string                      //仓库是私有的话需要填写
	Password     string                      //仓库是私有的话需要填写
	Status       int                         //此仓库是否已经将代码克隆过来
	JobStatus    int                         //有任务正在打包，其他任务无法执行
	DependTools  string `binding:"required"` //依赖工具选择
	TerminalInfo string `gorm:"type:varchar(1000)"`
}
```

分类

```go
type Category struct {
	gorm.Model
	Name        string `binding:"required,min=2,max=20"`
	JobQuantity int    `gorm:"default:0"`
	Desc        string `gorm:"type:varchar(1000)"`
}
```

任务

```go
type Job struct {
	gorm.Model
	Name          string `binding:"required,min=2,max=20"`
	Desc          string `gorm:"type:varchar(1000)",binding:"required,min=2,max=999"`
	Status        int    `gorm:"default:0"`        //任务状态
	Branch        string `gorm:"default:'master'"` //部署分支默认master，用户在部署之前随时可以修改
	Url           string                           //访问目录，只有状态成功才返回
	RunQuantity   int `gorm:"default:0"`
	CategoryId    int `gorm:"index",binding:"required"`
	WebHookUrl    string
	RepositoryId  int    `gorm:"index",binding:"required"`
	BuildDir      string `binding:"required"` //打包的目录,默认是dist
	BuildCommand  string `binding:"required"` //打包命令，npm run build 可以读取package.json供选择
	Password      string                      //任务加密
	TerminalInfo  string `gorm:"type:varchar(1000)"`
	SuccessScript string `gorm:"type:varchar(1000)"` //打包成功运行的脚本，多个用 ; 隔开
}
```

一开始并不是这些字段，在做的过程中不停的改了很多次，也删除了很多东西。

仓库管理其实就是将仓库克隆过来通过仓库ID来管理代码。每次任务运行的时候会去更新代码安装js依赖并切换分支然后打包，并将打包的代码通过任务ID管理并提供访问。一句话好像就总结完了，但是在写的过程中考虑了很多东西。如，同一个仓库需要打包多套环境，切换分支的时候如何锁定仓库、打包出错怎么反馈给用户、依赖在什么时候安装，安装失败了如何处理、不同的任务切换分支的时候如何处理新的代码、安装依赖的时候使用什么工具等

反正就是边想边做，也画了很多草稿。

其实最让我头疼的就是目录结构和包的职责，因为不小心就循环引用包了，特别是 helper 包，他提供一些常用的方法，刚开始我会在这个包里引用其他自己定义的包，其实不应该这样做，这些工具函数不应该依赖其他自定义的包，他应该是职责单一独立无依赖的，如果需要依赖自定义的包，那么应该考虑放到相应的服务里面。

然后我是个前端，以前写过一点 Laravel ，所以后端的目录有点像之前的结构 ，并且重构了很多次。

前端代码组织也做了很多次调整，UI界面的调整也很多，不停的去寻找最好的解决方式吧，同时也还有很多不足的地方，也欢迎大家提出问题一起交流，后续也会添加更多工具，陆续的将一些好创意添加进去。

还有一个感触比较深的就是把简单的问题复杂化很简单，把复杂的问题简单化很难。

## 角色权限

开始的时候就只做了上面的核心功能，已经可以使用了，但是在公司推广开了之后，发现用户和权限模块也是非常重要的，于是就添加了用户模块和权限的简单设计。

角色目前分为超级管理员、管理员、开发者、项目记者。权限如下：

- 项目记者 - 只能查看所有内容，并且可以访问打包好的前端项目
- 开发者 - 拥有创建仓库、分类、任务和拉代码、切换分支、运行打包、删除依赖权限
- 管理员 - 可以删除仓库、分类、任务
- 超级管理员 -可以管理用户（提升和降级角色，删除用户）



注：等级高的角色拥有低级角色的全部权限。用户注册默认成为项目记者，如果注册的名字是 Admin 会自动成为超级管理员，注册名字不可重复。  