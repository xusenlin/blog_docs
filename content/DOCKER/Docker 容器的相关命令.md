```json
{
  "date": "2018.05.04 15:00",
  "tags": ["DOCKER"]
}
```



## 1.为什么使用容器？

在linux和mac上，对于lamp web应用，开发阶段和部署阶段的环境不统一，导致需要重新配置各种环境，编译安装各种插件，非常繁琐，如果同一台服务器需要多个版本的php需要小心的处理冲突，有的时候处理依赖等，可以花费你一天时间甚至更多，这一切简直就是噩梦。但是docker可以让我更简单高效的完成上面的事情。


## 2.CENTOS安装DOCKER

```shell
    $ sudo yum install -y yum-utils

    $ sudo yum-config-manager \
        --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo

    $ sudo yum makecache fast

    $ sudo yum -y install docker-ce

    ## start up docker
    $ sudo systemctl enable docker

    $ sudo systemctl start docker

    # Add user to docker group
    $ sudo usermod -aG docker $USER

```

## 3.安装Docker Compose


#### 推荐Docker Compose 官方Gtihub仓库安装方式，请先选择一个版本。
```shell
    $ curl -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose

    $ chmod +x /usr/local/bin/docker-compose
```

## 4.相关DOCKER命令
拉起docker hub 上的镜像

    docker pull <名称> <版本> （默认会pull最新版本）

下面这句命令代表通过hitalos/laravel镜像创建一个容器并启动，如果本地不存在镜像则会pull docker hub 镜像。
同时你的这个容器如果没有做什么事的话会马上停止，

    docker run --name <container_name> -d -v $PWD:/var/www -p 80:80 hitalos/laravel


查看当前正在运行的容器，添加 -a参数会显示已经停止的容器

    docker ps

启动容器

    docker start 容器id


重启容器

    docker restart 容器id

进入启动容器的终端

    docker exec -it containerID /bin/bash 

查看容器信息 ip地址

    docker inspect --format '{{ .NetworkSettings.IPAddress }}' db


启动mysql

    docker run --name mysql -p 3306:3306 -v $PWD/mysql-data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=12345678  -d mysql



## 5.其他CENTOS命令

安装git

    yum install git

进入mysql,多个实例时-P 指定端口参数无效,还需要多指定ip -h 127.0.0.1 

    mysql -uroot -P3307 -p -h127.0.0.1

 安装vim

    apt-get update && apt-get -yq install vim

查看mac的端口是否被监听。

    netstat -anp tcp | grep 8080

 查看centos的端口是否被监听。

    netstat -ntlp




我的mysql容器一直连接不了，弄了很久，原来。。。

#### 因为我的有一个laravel的PHP容器外挂目录在data（里面是laravel项目）然后我的MySQL容器外挂目录在这个data目录下的MySQLdata目录，好像冲突了，现在我把MySQL的外挂目前搞到其他地方就能连接了。太高兴了。




## 6.CentOS下Composer的安装

下载composer.phar 

    curl -sS https://getcomposer.org/installer | php

把composer.phar移动到环境下让其变成可执行 

    mv composer.phar /usr/local/bin/composer

测试

    composer -V 

输出：Composer version 1.0-dev (e64470c987fdd6bff03b85eed823eb4b865a4152) 2015-05-28 14:52:12