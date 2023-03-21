```json
{
  "date": "2023.03.21 22:00",
  "tags": ["SSE","WebSocket","分块传输编码"],
  "description":"在研究和开发chatGPT的过程中，发现了分块传输编码和SSE技术，加上之前使用过的WebSocket，因此记录一下这三种技术。分块传输编码可以在数据发送过程中将数据分成一个个小块来传输，从而达到流式传输的效果；SSE则是将数据注入到一个已经打开的HTTP连接中，实现了服务器向客户端推送数据的功能；而WebSocket则是一种基于TCP协议的双向通信协议，可以实现浏览器与服务器之间的实时交互。"
}
```



# 前言

在研究和开发chatGPT的过程中，发现了分块传输编码和SSE技术，加上之前使用过的WebSocket，因此记录一下这三种技术。分块传输编码可以在数据发送过程中将数据分成一个个小块来传输，从而达到流式传输的效果；SSE则是将数据注入到一个已经打开的HTTP连接中，实现了服务器向客户端推送数据的功能；而WebSocket则是一种基于TCP协议的双向通信协议，可以实现浏览器与服务器之间的实时交互。

自己也通过 ```Server-Sent Events``` 做了一个 chatGPT ，当然也可以使用 ```chunked transfer encoding``` 来做，可能还简单一些，因为直接发送问题逐步读起就行，后端不需要通过后续使用通道来传输。

demo 地址：https://github.com/xusenlin/chatGPT

# 分块传输编码（chunked transfer encoding）

## 简介

分块传输编码（chunked transfer encoding）是一种HTTP传输编码方式，它可以在传输数据时将数据分成一个一个的小块，然后逐个发送，以达到流式传输的效果。分块传输编码可以适用于需要传输的数据大小未知或较大的情况，同时也可以避免浏览器等客户端在请求过程中一直等待数据返回而导致的超时等问题。

分块传输编码的处理过程如下：

1. 服务器先发送一个十六进制数，表示本次发送的数据块大小；

2. 然后发送实际的数据，数据大小为上一步中指定的大小；

3. 循环以上两个步骤，直到传输完整个数据；

4. 最后发送一个大小为0的块，表示本次数据传输结束。

分块传输编码的作用主要有：

1. 可以避免传输数据时等待时间过长而导致浏览器等客户端出现超时；

2. 可以在数据传输过程中提供数据的即时性，特别是对于在线视频或音频等实时应用场景非常有用；

3. 可以对数据进行压缩或解压缩，以减小传输数据的大小。



## 服务端示例

```go
http.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("example.txt")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer f.Close()

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			t := scanner.Text()
			fmt.Println(t)
			fmt.Fprintln(w, t)
			w.(http.Flusher).Flush()
			time.Sleep(1 * time.Second)
		}
		if err := scanner.Err(); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	})
```

在HTTP中，response的主体部分是通过TCP连接传输的，只有当TCP连接关闭时，才会将response中的数据发送给客户端。但是，有些场景下，如数据量较大或者需要实时输出数据时，我们希望能够将response中的数据尽早地发送给客户端，而不是等到TCP连接关闭时才发送，这时就需要使用Flush()方法。Flush()方法将HTTP response中的数据推送到网络连接中，确保能够及时传输给客户端。它会将response数据发送给客户端的同时保持TCP连接的状态，以便后续数据能够继续通过该连接发送。

在node.js中，我们也可以使用```new ReadableStream()、new Response()``` 相关对象来实现这一过程。

## 客户端示例

```javascript
const readText = async ()=>{
  const decoder = new TextDecoder('utf-8');
  const res = await fetch("./test",{
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: '[]',
  })
  if (!res.body){
    return
  }
  const reader = res.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    //value 是一个 Uint8Array 数据
    console.log(decoder.decode(value))
    
  }
}
```

注意，客户端只能通过js相关接口来读起连续数据，如果是通过浏览器直接访问，那么需要等待所有数据全部返回才能成功！



# SSE（Server-Sent Events）

## 简介

SSE（Server-Sent Events）是一种基于HTTP协议的服务器向客户端推送数据的技术。它允许客户端获取实时数据，而无需像Websockets那样建立双向连接通道。SSE的作用是实现服务端向客户端的实时数据推送，以保证客户端能够获取最新的数据信息，从而能够更好地提供实时互动、在线游戏和动态实时通知等场景下的用户体验。

相对于 `分块传输编码` 技术来说，SSE客户端通过订阅的方式来连接，因此无法在订阅的时候发送数据。

相对于`WebSocket`技术来说，SSE不需要双向连接通道,也不需要升级协议，只需要使用单向的HTTP连接即可向客户端推送数据。这也意味着，SSE比WebSocket更加轻量级，对服务器的资源需求更低。SSE被客户端订阅后，SSE就能实现服务器向客户端陆续推送数据。

## 服务端示例

```go
func ReceiveHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	for {
		select {
		case msg := <-ResponseEventStream:
			fmt.Fprintf(w, "event: %v\ndata: %v\n\n", msg.Event, msg.Data)
			w.(http.Flusher).Flush()
		case _ = <-r.Context().Done():
			//处理订阅断开，比如用户刷新页面
			return
		}
	}
}
```

## 客户端示例

```javascript
let evtSource = new EventSource("./receive")
evtSource.onmessage = event => {
 //服务端发送message事件
  //注意，只有message事件会触发onmessage函数，其它事件只能通过下方监听的方式
};
evtSource.addEventListener("uuid", event => {
  //服务端发送uuid事件
})  
evtSource.onerror = (error) => {
  //服务端发送error事件
};
```

# WebSocket

## 简介

WebSocket 是一种基于 TCP 协议实现的全双工的通信协议，其在客户端与服务器之间建立持久化的连接，以便在任意时间点都可以发送双向通信。

相较于传统的 HTTP 协议，WebSocket 具备以下特点：

1. 实现了实时通信：在 WebSocket 连接建立之后，客户端和服务器之间可以随时双向发送数据，更加实现了实时通信。
2. 建立连接的成本低：在传统的 HTTP 协议中，每次请求都需要进行一次完整的连接过程，而 WebSocket 可以通过 HTTP 升级通道来建立连接，从而实现低延迟的通信。

WebSocket 在网页实时通信、在线游戏、实时监控等领域有着广泛的应用，其通过实现双向通信，为开发者提供了一种高效、实时的数据交互方案。

相对于 `分块传输编码` 和`SSE`技术来说，WebSocket 需要基于http协议来升级，并且一旦连接，服务器随时随地可以发送数据给客户端，客户端也可以随时发送数据给服务器。

## 服务端示例

升级协议

```go
//gin 路由方法
func WebsocketMsg(c *gin.Context) {
	ws, err := upGrader.Upgrade(c.Writer, c.Request, nil)
  //ws就是一个WebSocket connection.
  //可以将ws保存到map，当需要写入数据的时候使用ws.WriteJSON就能将信息发送给客户端
}
```

一般是需要配合通道来广播

```go
func BroadcastMessages() {
	for {
		msg := <-Broadcast
		msg.OnlineUsers = len(WsClients)
		for id, client := range WsClients {
			if !msg.NeedNotifySelf && msg.TriggerID == id {
				//如果不需要通知自己
				continue
			}
			err := client.WsConn.WriteJSON(msg)
			if err != nil {
				_ = client.WsConn.Close()
				delete(WsClients, id)
			}
		}
	}
}
```

## 客户端示例

```javascript
window.ws = new WebSocket(`ws://${host}/websocket?token=${token}`);
window.ws.onopen = () => {
  //
};
window.ws.onmessage = r => {
 //
};
window.ws.onerror = () => {
  ///
};
window.ws.onclose = () => {
 ///
};

```

如果需要具体案例可以查看，https://github.com/xusenlin/marewood

# 总结

分块传输编码（chunked transfer encoding）是一种HTTP传输编码方式，它可以在传输数据时将数据分成一个一个的小块，然后逐个发送，以达到流式传输的效果。它适用于需要传输的数据大小未知或较大的情况。这种技术可以提高数据传输效率，并且避免了客户端在等待数据返回时出现超时等问题。

Server-Sent Events (SSE) 是一种基于HTTP协议的技术，它允许服务器向客户端推送数据。与WebSocket不同，SSE只支持服务器向客户端单向通信。这种技术可以实现服务器主动推送信息给客户端，而不需要客户端频繁地发送请求来获取新信息。

WebSocket 是一种基于TCP协议的双向通信协议。它可以实现浏览器与服务器之间的实时交互，并且支持双向通信。这种技术可以实现快速、低延迟、高效率的双向通信，并且能够满足各类实时应用场景。

这三种技术都有各自的优势和适用场景。分块传输编码适用于流式传输大量数据；SSE适用于服务器向客户端推送数据；而WebSocket则更适用于需要双向通信和实时交互的场景。

