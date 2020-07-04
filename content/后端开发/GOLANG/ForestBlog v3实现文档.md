```json
{
  "date": "2020.06.01 20:50",
  "tags": ["文档","ForestBlog"]
}
```

用了周末的时间重构了 ForestBlog ，因为 ForestBlog 是初学 GO 写的，有很多不合理的地方，比如路径都是中文，浏览器转码后不美观、每次都要读取 json 缓存文件，效率并不是很高等。那么，为什么单独写一篇文章来记录呢？因为在开发中，时间一长，就会完全忘记之前写的是什么东西，如果重构部分功能，就要去读代码，然后把逻辑理清楚，如果有文档的话就不需要花费更多的时间。

严格上来说这个应用并不是真正意义上的 MVC 结构，主要是里面的 M 层并不真的负责在数据库中存取数据，因为应用没有数据库，只是把数据保存在了 models 包的全局变量中，但是从模型持有所有的数据、状态和程序逻辑这里去理解的话，也可以称之为 MVC 。

## 初始化

```go
func init() {
   models.CompiledContent()//克隆或者更新文章、递归生成文章、导航、短链 Map、加载模板
}
```

整个应用最关键的函数，它做了最核心的事，我们一条一条来看。

### 1.初始化配置

初始化配置是在 main 包中执行  models.CompiledContent() 时由于引入 config 包，所以 config 包初始化会加载配置的 JSON 文件并解析到 config 的全局变量中，**因此，其他地方调用并不会执行这一步操作**

### 2.克隆或者更新文档并检查

如果本地没有文档库就会克隆一份，如果已经存在则会执行 Git Pull 更新文档，成功之后再检查文件夹是否合规

### 3.并行解析导航、html模板、文章

- 加载 extra_nav 文件夹的文章，并使用里面的 title 作为导航，没有默认文件名，通过 date 排序。
- 加载 html 模板，为了代码美观并添加相应的方法。
- 递归加载 content 里面的所有文章并解析，通过 date 排序

最后一步比较重要，里面涉及到了短链算法，具体查看http://xusenlin.com/article?key=tMB5e2

同时为了快速找到文章添加了变量 ArticleShortUrlMap ，用来保证文章 shortUrl 唯一和快速定位文章，shortUrl 是使用文章标题来生成的，除了使用摘要算法会有一定几率key重复外，文章标题一样也会重复，所以用 ArticleShortUrlMap 来保证 key 的唯一性，那么这里为什么不使用路径加文章名来生成 key 呢？？这样就不会重复了啊。但是这样的话，如果有一天你调整了分类，那么以前的 url 在也定位不了当初那篇文章了，只使用标题来生成 key 的话，只要文章标题不修改，随便你怎么玩。

```go
sort.Sort(articles)
for i := len(articles) - 1; i >= 0; i-- {
		article := articles[i]
		keyword := utils.GenerateShortUrl(article.Title, func(url, keyword string) bool {
			//保证 keyword 唯一
			_, ok := shortUrlMap[keyword]
			return !ok
		})
		articles[i].ShortUrl = keyword
		shortUrlMap[keyword] = article.Path
}
```

这段代码是生成文章其中生成key的地方，当我递归加载并解析所有文章之后，通过 date 字段排序好了文章，为什么要倒序生成文章的 key 呢？ 因为如果有相同的文章标题，倒序会将最老的文章优先生成shortUrl，保证和之前的 shortUrl 一样。如果不使用倒序，随着文章的添加，如果出现重复的标题，就会导致以前的文章生成的 key 产生变化，那么已经发出去的 URL 将无法在定位到文章。

## WebHooks

文章更新触发 webhooks执行 models.CompiledContent() 函数。

### 关于图片

我们在编写一篇文章的时候，可以在当前新建文件夹 images，并在里面放置图片。然后通过语法 ```![](./images/1.png)```这样的话在本地能正确显示图片，当更新到博客，路径会变成 (你的域名/images/1.png)。后续做了处理，在递归文章的时候发现图片就会查看网站根目录下的images是否存在当前图片，如果没有则会复制并生产一张图片。这样，不管本地还是线上都能展示图片了。

最后还有很多细节上的东西，不在一一说明。