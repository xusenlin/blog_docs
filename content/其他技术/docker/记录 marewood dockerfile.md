```json
{
  "date": "2023.10.10  19:00",
  "tags": ["docker"],
  "description":"想着别人在部署我的项目时，可能对前端不熟悉，导致部署很麻烦，因此决定弄一个容器，加上现在 docker 支持多阶段编译，github 可以直接发布套餐包，正好实操一下顺便记录一些命令。"
}
```



## 编写 DockerFile

Docker 多阶段编译（multi-stage build）是一种在 Docker 中进行构建的技术，它可以帮助减小最终镜像的大小并提高构建速度。多阶段构建允许你在一个 Dockerfile 文件中定义多个构建阶段，每个阶段可以使用不同的基础镜像和构建步骤。

```dockerfile
# Build frontend dist.
FROM node:14-alpine AS frontend
WORKDIR /frontend-build

COPY ./public .


RUN yarn && yarn build

# Build backend exec file.
FROM golang:1.21-alpine AS backend
WORKDIR /backend-build

RUN apk add build-base

COPY . .

RUN CGO_ENABLED=1 go build -o MareWood ./MareWood.go


FROM node:16-alpine AS marewood
WORKDIR /marewood

RUN apk add git


COPY --from=backend /backend-build/MareWood /marewood
COPY --from=frontend /frontend-build/build /marewood/public/build


EXPOSE 8088
VOLUME  /marewood/resources

ENTRYPOINT ["/marewood/MareWood"]
```

本地编译

```
docker build -t ghcr.io/xusenlin/marewood:0.4 . 
```

这样我们通过前面两个阶段分别编译前端静态资源和后端可执行二进制文件，最后第三阶段使用一个干净的 node 基础镜像来运行 marewood ，因为我们 marewood 需要用到 git ,所以在第三阶段还需要把 git 安装好。最后编译出来的镜像只保留第三阶段的内容，大大减少了镜像大小。

## 登录 ghcr 并推送 Docker 镜像：

```shell
docker login ghcr.io -u USERNAME -p TOKEN 
docker push ghcr.io/xusenlin/marewood:0.4
```

后续在 GitHub 个人中心可以找到这个镜像，然后关联你的仓库就行了。



## 设置 Docker 时区

安装 tzdata 包，并将时区设置为 "UTC"。这样，在容器运行时，容器内的应用程序将使用 "UTC" 作为默认时区。

```plaintext
copyRUN apk add --no-cache tzdata
ENV TZ="UTC"
```



 ## 关于安装包命令 apk & apt-get

apk 是 Alpine Linux 发行版中的包管理工具，它用于安装、更新和管理软件包。Alpine Linux 是一个轻量级的 Linux 发行版，广泛用于容器化应用程序和嵌入式系统。

类似于 apk，apt-get 是 Debian 和 Ubuntu 发行版中的包管理工具。它也用于安装、更新和管理软件包。Debian 和 Ubuntu 是常见的 Linux 发行版，用于各种类型的应用程序和服务器。

这两个工具的作用类似，只是在不同的 Linux 发行版中使用不同的工具名称。在 Alpine Linux 中使用 apk，而在 Debian 和 Ubuntu 中使用 apt-get（以及其他 apt 相关命令）。

需要注意的是，使用这两个工具安装软件包时，语法和命令可能会有所不同。例如，在 Alpine Linux 中，使用 apk add <package> 安装软件包，而在 Debian 和 Ubuntu 中，使用 apt-get install <package> 安装软件包。所以在 Dockerfile 中，根据基础镜像的不同，你需要使用相应的包管理工具来安装软件包。
```
RUN apt-get update && apt-get install -y \
  bzr \
  cvs \
  git \
  mercurial \
  subversion
```
```
RUN apk add build-base
```

## 一些容器运行示例

```
docker run -d --name marewood -p 8088:8088 -v ~/.marewood:/marewood/resources ghcr.io/xusenlin/marewood:0.4
```

```
docker run --name mysql -p 3306:3306 -v ~/docker/mysql/conf:/etc/mysql/conf.d -v ~/docker/mysql/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=12345678 -d mysql:latest 
```
```
docker run --name phpmyadmin -d --link mysql:db -p 8080:80 phpmyadmin 
```