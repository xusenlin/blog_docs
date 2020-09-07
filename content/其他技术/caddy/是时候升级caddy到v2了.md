```json
{
  "date": "2020.09.06 20:00",
  "tags": ["caddy","服务器"],
  "description":"之前写过一篇《个人项目使用caddy代替Apach和Nginx》的博文，最近使用caddy的时候发现它已经升级到v2版本了，全新的服务器体验，优雅的通过REST端点修改配置而无需停机或重启，默认使用TLS的Web服务器，不过大部分v1的配置不能直接用在v2这个版本上了。"
}
```

> 如果对caddy还不了解，也可以看看之前的文章，也许对你有帮助。https://xusenlin.com/article?key=T7q7QC



# Caddy 安装

1. 下载
```shell
curl -OL "https://github.com/caddyserver/caddy/releases/latest/download/caddy_2.1.1_linux_amd64.tar.gz"
```
> 如果想下载其他版本可以到 https://github.com/caddyserver/caddy/releases/latest/download 页面查看并替换对应平台的版本就好。

2. 解压
```shell
tar -zxvf caddy_2.1.1_linux_amd64.tar.gz
```

3. 移动到目录
```shell
sudo mv caddy /usr/bin/
```
> /usr/bin下面的都是系统预装的可执行程序，会随着系统升级而改变。
> /usr/local/bin目录是给用户放置自己的可执行程序的地方，推荐放在这里，不会被系统升级而覆盖同名文件。
> 如果两个目录下有相同的可执行程序，谁优先执行受到PATH环境变量的影响

4. 权限和组
```shell
sudo groupadd --system caddy
sudo useradd --system \
    --gid caddy \
    --create-home \
    --home-dir /var/lib/caddy \
    --shell /usr/sbin/nologin \
    --comment "Caddy web server" \
    caddy
```

到这一步就已经安装好了，可以通过 caddy version 测试下，然后直接运行 caddy start,注意80端开不要被占用了，这个命令会将 caddy 放入后台运行，稍后我们添加配置文件之后运行 caddy reload 就能加载新的配置了。


# 常见的Caddyfile模式配置


```
//Reverse proxy
example.com {
        encode zstd gzip
        reverse_proxy 127.0.0.1:8081
}

//Static file server
example.com {
		encode zstd gzip
        root * /home/hz/build
        file_server
}
//PHP AND Static file server
//   /blog/* 路径的请求才会被php_fastcgi处理
example.com {
		root * /var/www
		php_fastcgi /blog/* localhost:9000
		file_server
}
//Redirect subdomain
//将一级域名重定向到 www 二级域名
example.com {
	redir https://www.example.com{uri}
}
//移除 www
www.example.com {
	redir https://example.com{uri}
}


```

# 重写路径

```
example.com {
	rewrite /add     /add/
	rewrite /remove/ /remove
}

```
如果是有file_server指令，一般不需要自己处理，caddy自动在请求中添加或删除尾部斜杠。
当然也可以使用重定向的功能

```
example.com {
	redir  / add      / add / 
	redir  / remove /  / remove
}

```
不过这样不好的是客户端会重新发出请求，并为资源强制使用单个可接受的URI，不像上面那种是在内部完成的。

# Caddyfile 规则

上面是大部分常用的功能，基本能满足我自己的场景，但是如果要做到更多功能的话就要好好学习一下了，这部分对 Caddyfile 文件配置做一些提示

当只有一个站点块时，花括号（和缩进）是可选的。这是为了方便快速定义单个站点，例如：

```
localhost

reverse_proxy 127.0.0.1:9000
```

如果存在 {} ，打开的花括号{必须在其行的末尾，紧密的花括号}必须在自己的行上，如果一个请求与多个站点块匹配，则选择具有最特定匹配地址的站点块。请求不会层叠到其他站点块中。

# 指令

像上面的 reverse_proxy、file_server、encode 被caddy称为指令，支持的指令

```
acme_server	嵌入式ACME服务器
basicauth	实施HTTP基本身份验证
bind	自定义服务器的套接字地址
encode	编码（通常压缩）响应
file_server	从磁盘提供文件
handle	互斥的指令组
handle_errors	定义处理错误的路径
handle_path	类似于句柄，但去除路径前缀
header 设置或删除响应头
import	包含摘要或文件
log	启用访问/请求日志记录
php_fastcgi	通过FastCGI服务PHP网站
redir	向客户端发出HTTP重定向
request_header	处理请求标头
respond	向客户端写一个硬编码的响应
reverse_proxy	强大且可扩展的反向代理
rewrite	内部重写请求
root	设置网站根目录的路径
route	一组伪指令逐字地视为一个单位
templates	在响应上执行模板
tls	自定义TLS设置
try_files	根据文件的存在进行重写
uri	操作URI
```

具体使用可以查看官方文档 https://caddyserver.com/docs/caddyfile/directives

caddy 是golang开发的，如果还有其他特殊需求，可以自己添加模块编译。
看起来代码比较友好，具体使用可以跟着文档来实现
https://caddyserver.com/docs/extending-caddy
