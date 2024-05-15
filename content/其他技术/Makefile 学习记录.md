```json
{
 "date": "2024.05.13 21:00",
  "tags": ["make","makefile","marewood"]
}
```

`make` 是一个常用的构建工具，用于自动化构建和编译程序。通过一个叫做 `Makefile` 的文本文件，`make` 工具可以根据文件之间的依赖关系自动执行编译、链接等操作，以生成最终的可执行文件或其他输出文件。`Makefile`中包含了一系列规则，规定了如何根据源文件的修改情况来更新目标文件。

`Makefile` 是一个包含了一系列规则的文本文件，这些规则描述了项目中不同文件之间的依赖关系以及如何生成最终的目标文件。`Makefile` 中的规则通常由以下几部分组成：

1. 目标（Target）：描述了一个输出文件（通常是可执行文件或中间文件）的名称。
2. 依赖（Dependencies）：描述了生成目标文件所需要依赖的文件或其他目标。
3. 命令（Commands）：描述了如何生成目标文件的具体命令。

通过运行 `make` 命令并指定一个 `Makefile` 文件，`make` 工具会根据 `Makefile` 中的规则来判断哪些文件需要重新编译，然后自动执行相应的命令，以确保项目的最终目标文件是最新的。

总的来说，`make` 和 `Makefile` 联合起来提供了一种自动化构建和编译项目的方法，使得开发者可以更高效地管理复杂的软件项目。



## Makefile 示例

```makefile
# 定义可用的 Node 版本
BASE_IMAGES := node:16-alpine node:18-alpine node:20-alpine node:22-alpine golang:1.21-alpine
# Docker Hub 用户名
DOCKER_USERNAME := xusenlin
# 项目名称
PROJECT_NAME := marewood
# 项目版本
PROJECT_VERSION := 1.0.3
# 构建的镜像
#node 16 因为没有pnpm,所以需要手动构建
BUILD_NODE_IMAGE := 18  20  22

# 获取项目全部基础镜像
pull:
	@for image in $(BASE_IMAGES); do \
		echo "\nPulling base image for Node $$image..."; \
		docker pull $$image; \
	done

# mac和 linux的 sed 命令有差异，需要注意,目前在mac下测试ok.

build:
	@for nodeVersion in $(BUILD_NODE_IMAGE); do \
        imageName=ghcr.io/$(DOCKER_USERNAME)/$(PROJECT_NAME):$(PROJECT_VERSION)-node$$nodeVersion; \
		echo "\nBuilding Docker image for $$imageName..."; \
		sed -i "" "s/FROM node:[0-9][0-9]-alpine AS marewood/FROM node:$$nodeVersion-alpine AS marewood/g" Dockerfile; \
		sudo docker build -t $$imageName .; \
    done

check:
	sudo docker run -d --name marewood -p 8088:8088 -v ~/docker/marewood:/marewood/resources ghcr.io/xusenlin/marewood:$(PROJECT_VERSION)-node22

.PHONY: pull build check
```

一条规则的格式为`目标文件: 依赖文件1 依赖文件2 ...`

例如需要执行build目标文件运行 `make build`就好了。为什么叫目标文件呢？因为make起初就是拿来生成各种文件的，所以定义了build它真的会去检查是否有这个文件，所以我们需要.PHONY来声明它是一个伪目标。例如`.PHONY: pull build check`表示pull、build、check 都是伪目标，代表一种操作。每一个目标文件(操作)都可能依赖其他目标文件(或者操作)，例如`build:  pull`表示build操作需要依赖pull操作。



 make使用文件的创建和修改时间来判断是否应该更新一个目标文件。例如

```makefile
a.text:b.text
	生成a.text文件命令
```

当执行a.text时，会去检查是否有b.text文件，如果有a.text文件，但是b.text文件修改时间比a.text晚，也就是虽然有a.text文件，但是依赖已经变了，会重新生成b.text文件。

但是伪目标依赖其他伪目标时，`make` 不会考虑伪目标的更新问题，因为伪目标并不代表实际的文件。相反，`make` 只会执行伪目标所定义的命令，而不会检查它们是否需要更新。如果希望在执行伪目标之前检查某些条件或其他目标是否需要更新，你可以在伪目标的命令中手动添加相应的检查逻辑。例如：

```makefile
.PHONY: build clean

# 伪目标 build 依赖于另一个伪目标 prebuild
build: prebuild
    echo "Building..."

# 伪目标 prebuild 执行一些条件检查
prebuild:
    # 检查某些条件是否满足，比如文件是否存在等
    # 如果条件不满足，则执行另外的操作
    # 这里只是一个简单的示例，你可以根据实际需求添加更多逻辑
    if [ ! -f some_file.txt ]; then \
        echo "some_file.txt does not exist, performing setup..."; \
        # 执行一些设置操作，比如下载文件、创建目录等
        touch some_file.txt; \
    fi

```

`make`针对每条命令，都会创建一个独立的Shell环境，如果新起一行，类似`cd ..`这样的命令，并不会影响当前目录。解决办法是把多条命令以`;`分隔，写到一行。

例如下面两个示例是不一样的效果:

```makefile
ok:
	pwd;
	cd ..;
	pwd;
```

输出：

```
pwd;
/Users/xusenlin/Git/Github/marewood
cd ..;
pwd;
/Users/xusenlin/Git/Github/marewood
```

```makefile
ok:
	pwd;cd ..;pwd;
```

输出：

```
pwd;cd ..;pwd;
/Users/xusenlin/Git/Github/marewood
/Users/xusenlin/Git/Github

```

可以看见make 会把命令本身打印出来，如果不想把命令本身打印出来可以在执行make 命令时添加参数，`make ok -s`或者在命令前面添加`@`符号。

```makefile
ok:
	@pwd;cd ..;pwd;
```

也可以使用`\`把一行语句拆成多行，便于浏览：

```makefile
ok:
	@pwd; \
	cd ..; \
	pwd;

```

⚠️：当使用\拆成多行时，命令本质上还是一行，所以添加@时需要注意，只在开头添加就好了。

另一种执行多条命令的语法是用`&&`，它的好处是当某条命令失败时，后续命令不会继续执行：

```makefile
ok:
	@cd .. && pwd
```



`@for version in $(NODE_VERSIONS); do` 和 `$(foreach version, $(NODE_VERSIONS)` 都可以用于在 Makefile 中进行循环操作，但它们的语法和用法略有不同。

1. `@for version in $(NODE_VERSIONS); do` 使用了 Bash 的 `for` 循环语法，在 Makefile 中使用了 `@` 符号来抑制 Make 工具输出执行命令的信息。这种方式更接近于 Bash 脚本的写法，相对比较直观。

   ```makefile
   build:
       @for version in $(NODE_VERSIONS); do \
           echo "Building Docker image for Node $$version"; \
           # 这里可以执行具体的命令，例如构建 Docker 镜像等 \
       done
   ```

2. `$(foreach version, $(NODE_VERSIONS)` 是 Makefile 中的内置函数 `foreach`，它的语法比较类似于函数调用，其中第一个参数是迭代变量名，第二个参数是迭代的列表。这种方式更符合 Makefile 的语法习惯，且可以更灵活地在 Makefile 中操作。

   ```makefile
   build:
       @$(foreach version, $(NODE_VERSIONS), \
           echo "Building Docker image for Node $(version)"; \
           # 这里可以执行具体的命令，例如构建 Docker 镜像等 \
       )
   ```

总的来说，两种方式在功能上是等效的，都可以用于实现对列表的遍历操作。选择哪种方式主要取决于个人偏好和项目需求，以及与团队的一致性考量。

需要注意的是，在makefile中使用$(BUILD_NODE_IMAGE)来表示一个变量，但是如果是shell语法里面就注意需要使用$$val了



`make`在执行命令时，会检查每一条命令的返回值，如果返回错误（非0值），就会中断执行。

```makefile
ok:
	rm ok.txt;
	echo "ok"

```

当ok.txt不存在时：
```
rm ok.txt;
rm: ok.txt: No such file or directory
make: *** [ok] Error 1
```

上面`echo "ok"`未被执行，但是我们可以命令前面添加`-`忽略报错信息，继续执行。

```makefile
ok:
	-rm ok.txt;
	echo "ok"
```

