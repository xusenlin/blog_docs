```json
{
  "date": "2024.03.25 20:00",
  "tags": ["GRPC","微服务"],
  "description":"对于我来说，我更喜欢GRPC的点是：1.得益于Protobuf，在不同语言之间使用强类型定义数据结构的统一。2.通过 Protobuf文件，不仅可以生成主流语言的接口相关代码还可以通过第三方工具，例如buf生成各种语言的类型定义，也就是前端可以直接拿到 typescript文件。3.传输数据流byte,也就是多个服务之间可以相互推文件流和其他数据流。当然，protobuf 是一种通用的数据序列化框架，不止GRPC,RPCX也能使用这种数据序列化框架。"
}
```

# Golang GRPC 学习

## RPC & GRPC 简介

RPC（Remote Procedure Call）是一种用于实现远程通信的技术，允许一个计算机程序调用另一个地址空间（通常是另一台机器上）的子程序。RPC使得开发者可以编写分布式应用程序，就像编写本地应用程序一样。RPC的实现有很多种，其中 gRPC 是一种较为流行的 RPC 框架之一。

GRPC ( http://www.grpc.io/ ) 是 Google 对 Protocol Buffers 的 RPC 实现。还有其他第三方 RPC 实现。其中一些实际上与 Protocol Buffers 服务定义（使用文件`.proto` 中定义的 `service`关键字）一起使用，而另一些则仅使用 Protocol Buffers 消息对象。

gRPC 是由Google开发的高性能、通用的开源 RPC 框架，基于HTTP/2标准设计。相比传统的RPC框架，gRPC具有更多的优势，主要体现在以下几个方面：

1. **IDL（Interface Definition Language）**: gRPC 使用 Protocol Buffers 作为接口定义语言，可以定义服务和消息结构，使得跨语言的服务定义更加简单和明确。
2. **多语言支持**: gRPC 支持多种语言，如C++, Java, Python, Go, Ruby, Node.js等，这使得不同语言之间的服务调用变得更加容易。
3. **HTTP/2**: gRPC 基于HTTP/2协议，支持双向流、头部压缩、多路复用等特性，提供了更高效的网络传输性能。
4. **支持流式数据**: gRPC 支持客户端和服务端之间的双向流式数据传输，使得开发者可以更灵活地处理数据流。
5. **拦截器（Interceptors）**: gRPC 支持拦截器，可以在请求处理的各个阶段插入自定义逻辑，实现日志、认证、监控等功能。

总的来说，gRPC相比传统的RPC框架更加高效、灵活，并且具有更多先进的特性，适合构建现代分布式系统。

对外，对用户，对浏览器使用http。对内部，对子服务，微服务使用GRPC。

*** 上面内容由ai生成，对于我来说，我更喜欢他的核心点是：***

1. 得益于Protobuf，在不同语言之间使用强类型定义数据结构的统一。
2. 通过 Protobuf文件，不仅可以生成主流语言的接口相关代码还可以通过第三方工具，例如buf生成各种语言的类型定义，也就是前端可以直接拿到 typescript文件。
3. 传输数据流byte,也就是多个服务之间可以相互推文件流和其他数据流。

## GRPC 通信模式

gRPC主要有4种请求和响应模式，分别是简单模式(Simple RPC)、服务端流式（Server-side streaming RPC）、客户端流式（Client-side streaming RPC）、和双向流式（Bidirectional streaming RPC）。

- 简单模式(Simple RPC)：客户端发起请求并等待服务端响应。
- 服务端流式（Server-side streaming RPC）：客户端发送请求到服务器，拿到一个流去读取返回的消息序列。 客户端读取返回的流，直到里面没有任何消息。（服务端发送流）
- 客户端流式（Client-side streaming RPC）：与服务端数据流模式相反，这次是客户端源源不断的向服务端发送数据流，而在发送结束后，由服务端返回一个响应。（客户端发送流）
- 双向流式（Bidirectional streaming RPC）：双方使用读写流去发送一个消息序列，两个流独立操作，双方可以同时发送和同时接收。

前面3种模式都是客户端发起的响应，第4种才是服务端主动推送？？？？

## 开发GRPC一般流程

1. 首先定义好proto(服务的传输数据类型和方法)
2. 通过工具生成代码(接口和相关注册函数等)
3. 编写代码实现接口并调用相关方法启动服务

## Protobuf

GRPC 通常情况下使用 Protocol Buffers（protobuf）作为默认的序列化框架，这使得 gRPC 在传输数据时更高效。Protocol Buffers 是一种轻量、高效且语言无关的数据序列化框架。

### protobuf文件示例

```protobuf
syntax = "proto3";

//option go_package = "path;name";
//path 表示生成的go文件的存放地址，会自动生成目录的。
//name 表示生成的go文件所属的包名
option go_package="./;v1";
// 定义包名
package helloWorld;

// 一个简单的问候服务
service Greeter {
  // SayHello方法，接受HelloRequest消息， 并返回HelloReply消息
  rpc SayHello (HelloRequest) returns (HelloReply) {}
  // SayHello方法，接受HelloRequest消息， 并返回HelloReply流消息
  rpc SayHelloStream (HelloRequest) returns (stream HelloReply) {}
}

// 定义Request消息
message HelloRequest {
  string id = 1;// id字段
  string name = 2;// name字段
}

// 定义Reply消息
message HelloReply {
  string id = 1;// message字段
  string fileType = 2;// fileType字段
  bytes  file = 3;// file字段
}
```

### 关于包名

Protobuf 使用package v1;来定义包名，也就是命名空间。包名扮演着组织代码结构、避免命名冲突、提高代码可读性和维护性等重要角色。

需要注意的是，这个包名是针对Protobuf文件的，和 golang 的目录包名需要区分开来，也就是说，在不同的目录里，golang 有相同的包名而不影响，而Protobuf在整个项目里，相同的包名就不能定义相同的message。由于定义的Protobuf的文件可以生成go的接口，因此可以通过option go_package来定义生成的go包名，例如：

```protobuf
//option go_package = "path;name";
//path 表示生成的go文件的存放地址，会自动生成目录的。
//name 表示生成的go文件所属的包名
option go_package="./;v1";
```

1. [protobuf  官方指南](https://protobuf.dev/programming-guides/style/) 里面有官方教程和风格指南。
2. [protobuf 代码仓库 - github.com](https://github.com/protocolbuffers/protobuf) c++实现
3. [golang protobuf 代码仓库 - github.com](https://github.com/golang/protobuf) go实现
4. [Protocol Buffer 插件列表 - github.com](https://github.com/protocolbuffers/protobuf/blob/master/docs/third_party.md)

### 生成Go代码

需要安装proto核心工具`https://github.com/protocolbuffers/protobuf/releases`。

go相关的插件：`go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`，`go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest`

protoc-gen-go 插件用于生成go结构体数据类型，如果定义了 rpc 服务，需要使用grpc，则需要安装protoc-gen-go-grpc来生成相关接口和服务函数。

`protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative helloworld.proto`

###  protobuf文档生成

https://github.com/pseudomuto/protoc-gen-doc

`protoc --doc_out=. --doc_opt=html,index.html ./*/*/*.proto` 可将对应目录的全部proto生成一个index.html

`protoc --doc_out=. --doc_opt=markdown,docs.md ./*/*/*.proto` 生成md文档

## 编写GRPC服务来传文件或者消息

我们就以上面的proto示例文件来编写一个服务端可以一次性响应文件或者流式响应文件的GRPC服务。当然，前面说了，GRPC支持4种通信模式，也就是说，客户端也可以一次性传输文件也可以流式传输文件，也可以一边流式传输文件一边响应流失文件，反正非常灵活。

### 1.生成go代码

使用命令`protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative helloworld.proto`可以得到两个代码文件

1. helloworld.pb.go
2. helloworld_grpc.pb.go

### 2.编写服务端

```go
package main

import (
	"context"
	helloV1 "grpc/api/hello/v1"
	"io"
	"log"
	"net"
	"os"
	"time"

	"google.golang.org/grpc"
)

type GreeterServer struct {
	helloV1.UnimplementedGreeterServer
}

func (s *GreeterServer) SayHello(ctx context.Context, req *helloV1.HelloRequest) (*helloV1.HelloReply, error) {
	file, err := os.ReadFile("./1.zip")
	if err != nil {
		return nil, err
	}
	return &helloV1.HelloReply{
		Id:       req.GetId() + req.GetName(),
		FileType: "zip",
		File:     file,
	}, nil
}

func (s *GreeterServer) SayHelloStream(req *helloV1.HelloRequest, reply helloV1.Greeter_SayHelloStreamServer) error {
	file, err := os.Open("./1.zip")
	if err != nil {
		return err
	}
	defer file.Close()

	buf := make([]byte, 100) //1k 1024
	for {
		n, err := file.Read(buf)
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		err = reply.Send(&helloV1.HelloReply{
			Id:       req.GetId() + req.GetName(),
			FileType: "zip",
			File:     buf[:n],
		})
		if err != nil {
			return err
		}
		time.Sleep(time.Second)
	}
	return nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	helloV1.RegisterGreeterServer(s, &GreeterServer{})

	log.Println("Starting gRPC server on :50051")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}


```

### 3.编写客户端代码

```go
package main

import (
	"context"
	"flag"
	"fmt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	helloV1 "grpc/api/hello/v1"
	"log"
	"os"
)

func main() {
	conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := helloV1.NewGreeterClient(conn)

	go func() {
		req, err := c.SayHello(context.Background(), &helloV1.HelloRequest{Name: "请求SayHello", Id: "2312"})
		if err != nil {
			fmt.Println(err)
			return
		}
		err = os.WriteFile("SayHello."+req.FileType, req.GetFile(), 0644)
		if err != nil {
			fmt.Println(err)
			return
		}
	}()
	stream, err := c.SayHelloStream(context.Background(), &helloV1.HelloRequest{Name: "请求SayHelloStream", Id: "123123"})
	if err != nil {
		fmt.Println(err)
		return
	}
	var fileData []byte
	fileName := ""
	for {
		r, err := stream.Recv()
		if err != nil {
			fmt.Println(err)
			break
		}
		fileName = "SayHelloStream." + r.FileType
		fileData = append(fileData, r.GetFile()...)
	}
	err = os.WriteFile(fileName, fileData, 0644)
	if err != nil {
		fmt.Println(err)
		return
	}
}

```

自此，我们已经可以使用GRPC自由的收发消息或文件了。

目前来看，4种方案都需要客户端发起，但是有流式，可以客户端发起一个流式请求，请求一旦建立，我们就可以通过chan随时给客户端发送文件或者消息了。



