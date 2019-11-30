```json
{
  "date": "2019.11.28 20:00",
  "tags": ["caddy","服务器"],
  "description":"caddy 是一个使用Golang编写的像 Apache, nginx, 或 lighttpd 的web服务器，一个小小的二进制文件即可部署，默认支持 https，支持自动签发 Let’s Encrypt 证书,丰富的插件系统，可以快速配置缓存、CORS、自动拉取 Git 仓库、Markdown 支持、ip/地区过滤等十分强大的功能"
}
```

# Caddy 特性

- HTTP/2 全自动支持HTTP/2协议，无需任何配置。
- Auto HTTPS Caddy 使用 Let’s Encrypt 让你的站点全自动变成全站HTTPS，无需任何配置。当然你想使用自己的证书也是可以的。
- Multi-core 因为caddy是golang写的，所以当然可以合理使用多核啦。
- IPv6 完全支持IPv6环境.
- WebSockets Caddy 对WebSockets有很好的支持.
- Markdown 自动把md转成 HTML ，当然，我后续要给大家介绍更强大的hugo来干这个事情.
- Logging Caddy 对log格式的定义很容易，更好的满足你日志收集的需求。
- Easy Deployment 得益于go的特性，caddy只是一个小小的二进制文件，没有依赖，很好部署。


# 配置

Caddy的本机配置语言是JSON，但是用手编写JSON可能很乏味且容易出错。因此，对于大多数用户而言，Caddyfile是配置Caddy的第一选择，因为Caddyfile的学习速度非常快，易于理解，并且对开发人员而言非常有效。

Caddyfile的表现力不如Caddy的本地JSON，因此无法描述所有可能的Caddy配置。但是，它被设计为适合约95％以上的用例。某些奇怪的Web应用程序或其他极端情况可能需要直接使用Caddy JSON，但是您仍可以使用配置适配器（例如Caddyfile）作为起点。Caddy的配置是地球上最灵活的配置，即使Caddyfile不能表达所有可能性。

v2 Caddyfile与v1不向后兼容。因此，您无法携带v1 Caddyfile并期望它在v2中正常运行而无需更改（尽管有些偶然会兼容）。


你可以使用adapt命令将你的Caddyfile输出为JSON

```
$ caddy adapt --config .\Caddyfile
```




如果Caddyfile位于其他位置或具有不同的名称可以通过 -conf 指定，默认会在当前目录下找到Caddyfile文件

```
$ caddy -conf C:\path\to\Caddyfile
```

# 开始使用

### 启动caddy,关闭窗口将强制停止Caddy

```
$ caddy start
	[--config <path>]
	[--adapter <name>]
```



### 启动caddy,在“守护程序”模式下运行Caddy

```
$ caddy run
	[--config <path>]
	[--adapter <name>]
	[--environ]
```

### 停止caddy

```
$ caddy stop [--address <interface>]
```

### Caddyfile的第一行始终是要服务的站点的地址。例如：

```
:8080
encode gzip
file_server
```

### 如果需要解析php的话

```
:8080
encode gzip
php_fastcgi php-fpm:9000
file_server
```

### 具有自动TLS和运行状况检查的8080端口上的HTTP Golang服务器的反向代理

```
localhost:8086

reverse_proxy / {
	to localhost:8080
	transport http {
		read_buffer 4096
	}
}
```

### 也可以通过命令来执行反向代理

```
$ caddy reverse-proxy
	--from <addr>
	--to <addr>
```

### 或者

```
$ caddy reverse-proxy --from localhost:2015 --to https://example.com
```

### 使用单个Caddyfile配置多个站点时，每个站点需要使用大括号来分隔它们的配置👇

```
mysite1.com {
  root /www/mysite2.com
  encode gzip
  file_server
}

mysite2.com {
  root /www/mysite2.com
  encode gzip
  file_server
}
```

### 快速启动文件服务器



```
$ caddy file-server
	[--domain <example.com>]
	[--path <path>]
	[--listen <addr>]
	[--browse]
```

启动快速但可用于生产环境的静态文件服务器。默认情况下，当前目录将是站点的根目录，但是您可以使用它--path来覆盖它。--listen接受侦听器地址；默认值为:2015。如果--domain指定，则仅从该域名提供文件，如果Caddy符合证书的条件，则Caddy将尝试通过HTTPS提供文件，因此请确保正确配置DNS。如果--browse使用，则对没有索引文件的目录的请求将显示文件列表。


目前caddy网上的大部分教程都是1.x的，所以得注意区分。


待续...