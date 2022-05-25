```json
{
  "date": "2022.05.25 21:00",
  "tags": ["R","基因","数据可视化"],
  "description":"由于缺少人手，最近开始尝试作为项目经理直接对接和推动项目了，一天又是画ER图又是画原型又是要开发的，虽然会忙一点，但是对自己成长还是很有利的，比较麻烦的是怎么去协调大家一起推进项目吧，由于不同部门，大家的知识结构也不一样，因此需要去不停的沟通，理解需求方的需求，并将别人的想法和自己的想法构建出一个产品出来。我们有很多的研究信息，它包含了大量临床、基因、组学数据，组学又有基因突变、甲基化、基因融合等一堆数据，需要构建一个可视化的分析平台，里面有很多的分析图表，而且画图的部分是R语言写的，自己从来没有了解过 R ,因此怎么去调用 R 脚本算是这个项目的一个小坎坷，所以打算记录一下。"
}
```



由于缺少人手，最近开始尝试作为项目经理直接对接和推动项目了，一天又是画ER图又是画原型又是要开发的，虽然会忙一点，但是对自己成长还是很有利的，比较麻烦的是怎么去协调大家一起推进项目吧，由于不同部门，大家的知识结构也不一样，因此需要去不停的沟通，理解需求方的需求，并将别人的想法和自己的想法构建出一个产品出来。我们有很多的研究信息，它包含了大量临床、基因、组学数据，组学又有基因突变、甲基化、基因融合等一堆数据，需要构建一个可视化的分析平台，里面有很多的分析图表，而且画图的部分是R语言写的，自己从来没有了解过 R ,因此怎么去调用 R 脚本算是这个项目的一个小坎坷，所以打算记录一下。



这里提一下原型工具，刚开始使用figma，觉得非常棒，主要它的市场里面有我最喜欢的element-plus和mui（react Material-UI）设计资源,尤其是mui，简直不要太精美，可以说用美轮美奂来形容都不为过，每次看见Material-UI总是想开发点东西，哈哈。但是后面画了几个页面之后发现figma要收费升级才能添加更多的页面，升级还要信用卡付费（没有），再加上国内有时候访问特别慢于是就试试mastergo,发现它两其实差不多，就是资源太少了，不过它支持从figma导入资源，然后就先用着了。

针对 JAVA 调用 R 脚本一开始的想法是 JAVA 根据用户的筛选条件查到的数据，JAVA 运行 R 脚本时通过命令行参数将数据传递给 R 画图。

比如样本和基因突变等信息的 json 是这样的。

```json
{
	"ID":["P0001","P0002","P0003","P0004","P0005","P0006","P0007","P0008","P0009"],
	"Mut_TP53":[1,1,0,0,0,0,1,0,1],
	"OS_IND":[1,0,1,0,1,0,1,1,0],
	"OS":[12,23,45,21,21,33,8,6,9]
}

```

那么在运行的时候通过命令行参数传递

```json
Rscript demo.R 参数一  参数二
```

在 R 里面就可以接收到参数

```R
Args <- commandArgs(T)
Arg1<- Args[1]
Arg2 <- Args[2]
```

但是这样有一个明显的问题就是数据量很多的时候，而且这种方式也只能一个值一个值的传递，因此打算使用 JAVA 生成 用户id命名的JSON 文件，通过参数告诉 R 去读取文件。

```
Rscript demo.R 2.5 /Users/xusenlin/demo.json
```

读起并解析

```R
library("rjson")
Args <- commandArgs(T)
threshold <- Args[1]
jasonfilePath <- Args[2]
as.data.frame(fromJSON(file = jasonfilePath))->prognosis
variable<-prognosis[,-which(colnames(prognosis) %in% c('ID','OS','OS_IND'))]
library(survival)
if(length(unique(variable))>4){
  variable<-variable>threshold
}
pv<-1-pchisq(survdiff(Surv(OS, OS_IND) ~ variable,data=prognosis)$chisq,1)
sf<-survfit(Surv(OS,OS_IND)~variable,data=prognosis)
# jpeg('survivalplot.jpeg')

png(tf1 <- tempfile(fileext = ".png")); 

plot(sf,lwd=2,col=2:3,mark.time=T,xlab='Survival in month(s)',ylab='Survival rate')
text(40,.90,paste('p=',signif(pv,2),sep=''))
legend('bottomleft',as.character(unique(variable)),lwd=2,col=1:length(variable))
dev.off()

library(RCurl)
base64 <- base64Encode(readBin(tf1, "raw", file.info(tf1)[1, "size"]), "txt")

cat(sprintf('data:image/jpg;base64,%s',base64))
#输出base64img数据给到java
```

这样确实已经解决我们的难题了，不好的地方就是会频繁写入json读取json，那为什么不用 R 自己起一个服务，然后通过请求调用呢？搜了一下，果然方案可行，发现了`plumber`包，使用```nstall.packages("plumber")```安装好，提供好对应的路由文件，将所有画图的算法一一对应到响应的路由下接口，这样真的很香。

web.R

```R
library(plumber)
# 'plumber.R' is the location of the file shown above
pr("api.R") %>%
pr_run(port=8000)
```

api.R

```R
#* 生存分析  两组或多组对比
#* @param threshold
#* @param data
#* @post /test
function(threshold, data) {
  ...
}
```
