```json
{
  "date": "2021.03.17 18:00",
  "tags": ["chan","select","context"],
  "description":"最近有一个有趣的想法，我准备用 golang 构建一个本地软件，在实施过程中遇到了很多关于context的用法，然后发现有些东西并不理解，在学习context的过程中同时涉及到了select,因此在此记录下加深理解。"
}
```

# select

 select被设计来等待多个通道可读或者可写，它既可以是阻塞的也可以是非阻塞的，这取决于是否有default语句。类似于用于通信的 switch 语句，每个 case 必须是一个通信操作，要么是发送要么是接收。如果同时满足多个 case 则会随机执行一个可运行的 case，如果没有 case(包括没有 default case ) 可运行，它将阻塞，直到有 case 可运行。

```go
errCh := make(chan error, len(tasks))
wg := sync.WaitGroup{}
wg.Add(len(tasks))
for i := range tasks {
    go func() {
        defer wg.Done()
        if err := tasks[i].Run(); err != nil {
            errCh <- err
        }
    }()
}
wg.Wait()

select {
case err := <-errCh:
    return err
default:
    return nil
}
```
申请了一个带缓冲(非阻塞)的错误通道，当所有任务完成（wg.Wait()），errCh可能会有多个错误信号，运行到 select 时，如果能读到错误信号则返回错误，我们并不在乎有多少个错误，这里即使没有错误，程序也不会被阻塞，而会选择default返回nil。如果没有default语句同时也没有任何一个错误信号，那么程序将会被阻塞。


如果同时满足多个 case 则会随机执行一个可运行的 case 。
```go
func main() {
	ch := make(chan int)
	go func() {
		for range time.Tick(1 * time.Second) {
			ch <- 0
		}
	}()

	for {
		select {
		case <-ch:
			println("case1")
		case <-ch:
			println("case2")
		}
	}
}

```
输出：
```
$ go run main.go
case1
case2
case1
...
```

# context 上下文

使用golang提供一个web服务的时候，用户的每次请求，Handler会创建一个goroutine来为其提供服务。

```go
func main()  {
    http.HandleFunc("/", SayHello)

    log.Fatalln(http.ListenAndServe(":8080",nil))
}

func SayHello(writer http.ResponseWriter, request *http.Request)  {
    fmt.Println(&request)
    writer.Write([]byte("Hi"))
}
//========================================================
//$ curl http://localhost:8080/
//0xc0000b8030
//0xc000186008
//0xc000186018
```
而每个请求对应的Handler，我们又可能会启动额外的的goroutine进行数据查询或PRC调用等，如果在某次请求中我们启动了多个goroutine，当这个请求超时我们如何让其启动的多个goroutine也及时停止避免浪费资源呢？

我们知道go中的goroutine是没有父子概念的，每个goroutine是相互独立的。Go程序会为main()函数创建一个默认的主 goroutine，当主goroutine运行结束，其他 goroutine 也随之停止，但是其他的goroutine是相互独立没有任何关系的，即使你在某个循环体中创建了成千上万个goroutine，每个goroutine只有代码执行完毕才会退出。



那么context 是在多个Goroutine中对信号进行同步以减少计算资源的浪费。列如一次web请求可能会创建多个 Goroutine 来处理一次请求，而 context.Context 的作用是在不同 Goroutine 之间同步请求特定数据、取消信号以及处理请求的截止日期。

```go
func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	go handle(ctx, 500*time.Millisecond)
	select {
	case <-ctx.Done():
		fmt.Println("main", ctx.Err())
	}
}

func handle(ctx context.Context, duration time.Duration) {
	select {
	case <-ctx.Done():
		fmt.Println("handle", ctx.Err())
	case <-time.After(duration):
		fmt.Println("process request with", duration)
	}
}
```
分析一下这段程序，我们定义了一个一秒钟超时的 ctx。接下来主goroutine和handle方法都会被select阻塞，直到0.5秒时向handle的select发送一个信号，因此打印了 process request with 500ms，handle至此已经执行完毕，结束goroutine。   接着当ctx超时的时候可以从Done方法读取一个 Channel,因此程序中主goroutine的select接受到信号打印 main context deadline exceeded。

ctx 除了超时能在Done方法读取信号之外，当工作完成或者上下文被取消后关闭都能读取信号。

Done — 返回一个 Channel，这个 Channel 会在当前工作完成或者上下文被取消后关闭，多次调用 Done 方法会返回同一个 Channel；


如果我们把上面的程序500 修改为1500ms，整个程序都会因为上下文的过期而被中止

会打印
```
$ go run context.go
main context deadline exceeded
handle context deadline exceeded
```
但是有一定几率只看到第一条，因为主goroutine退出有可能来不及执行handle的打印，这里是context被cancel之后，所有select会同时收到消息并取消。


我们使用了两个api
```
context.Background()
context.WithTimeout()
```

context.Background() 一般用来创建 root(根) 上下文，context.WithTimeout()通个root上下文创建了一个具有超时功能的子上下文，即时间到了能从Done()方法读取取消信号，如果我们想中途手动取消我们可以手动调用context.WithTimeout()返回的第二个参数方法。如果不想要超时的上下文只想要可以手动关闭的上下文则可以通过context.WithCancel(context.Background()) 来创建。

现在，我们通过上面的例子知道了context的第一个作用，也是非常重要的作用，即取消信号以及处理请求的截止日期，上面说了除此之外还能在不同 Goroutine 之间同步请求特定数据。
demo

```go
root := context.Background()
c := context.WithValue(root,"k1",152)
c1 := context.WithValue(c,"k2","哈哈哈")
c2 := context.WithValue(c1,"k3",1.25)
c3 := context.WithValue(c2,"k4",1)
fmt.Println(c3.Value("k3"))
```
···
输出1.25 

在日常使用中，c1,c2,c3可能传到每一个函数或者Goroutine中，子 contex 能获取每个链上父 contex 的值。

最后看看各种都有的情况。

```go
ctx1 := context.Background()
ctx2, c1 := context.WithCancel(ctx1)
ctx3, c2 := context.WithTimeout(ctx2, time.Second*5)
ctx4, c3 := context.WithTimeout(ctx3, time.Second*3)
ctx5, c4 := context.WithTimeout(ctx3, time.Second*6)
ctx6 := context.WithValue(ctx5, "key", 123)
```
在这段代码中，如果ctx2被关闭，那么通过ctx2创建的子contex也会被关闭，ctx2的父contex则不会被影响。


某个contex被关闭主要是由下面事件触发的

- 截止时间到了
- cancel 函数被调用
- parent 的 Done 被 close