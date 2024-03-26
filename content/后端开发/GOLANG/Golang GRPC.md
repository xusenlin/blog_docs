```json
{
  "date": "2024.03.25 20:00",
  "tags": ["GRPC","微服务"],
  "description":"对于我来说，我更喜欢GRPC的点是：1.得益于Protobuf，在不同语言之间使用强类型定义数据结构的统一。2.通过 Protobuf文件，不仅可以生成主流语言的接口相关代码还可以通过第三方工具，例如buf生成各种语言的类型定义，也就是前端可以直接拿到 typescript文件。3.传输数据流byte,也就是多个服务之间可以相互推文件流和其他数据流。"
}
```



## RPC&&GRPC

RPC（Remote Procedure Call）是一种用于实现远程通信的技术，允许一个计算机程序调用另一个地址空间（通常是另一台机器上）的子程序。RPC使得开发者可以编写分布式应用程序，就像编写本地应用程序一样。RPC的实现有很多种，其中 gRPC 是一种较为流行的 RPC 框架之一。

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

## 安装

需要安装proto核心工具 `https://github.com/protocolbuffers/protobuf/releases`。在安装go相关的插件：`go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`，`go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest`

## 生成GO代码

`protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative helloworld.proto`

## 一般流程

1. 首先定义好proto(服务的传输数据类型和方法)
2. 通过工具生成代码(接口和相关注册函数等)
3. 编写代码实现接口并调用相关方法启动服务

##  Protobuf文件

### 示例

```protobuf
syntax = "proto3";

//option go_package = "path;name";
//path 表示生成的go文件的存放地址，会自动生成目录的。
//name 表示生成的go文件所属的包名
option go_package="./;v1";
// 定义包名
package v1;

// 定义Greeter服务
service Greeter {
  // 定义SayHello方法，接受HelloRequest消息， 并返回HelloReply消息
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

// 定义HelloRequest消息
message HelloRequest {
  // name字段
  string name = 1;
}

// 定义HelloReply消息
message HelloReply {
  // message字段
  string message = 1;
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

备份，待续。