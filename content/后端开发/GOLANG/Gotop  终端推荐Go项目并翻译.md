```json
{
  "date": "2024.05.06 20:00",
  "tags": ["gotop","go项目"],
  "description":"最近写了一个小工具，就是在终端获取最近火热的golang项目，并使用chatGpt翻译仓库介绍。"
}
```



### 基于掘金Api获取最近火热go项目

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/sashabaranov/go-openai"
	"net/http"
	"sync"
)

type Repo struct {
	ID            string `json:"id"`
	URL           string `json:"url"`
	Username      string `json:"username"`
	RepoName      string `json:"reponame"`
	Description   string `json:"description"`
	Lang          string `json:"lang"`
	LangColor     string `json:"langColor"`
	DetailPageURL string `json:"detailPageUrl"`
	StarCount     int    `json:"starCount"`
	ForkCount     int    `json:"forkCount"`
}

type Response struct {
	Code int    `json:"code"`
	Data []Repo `json:"data"`
}

var mutex sync.Mutex

func main() {
	url := "https://e.juejin.cn/resources/github"

	var period string
	var limit int

	flag.IntVar(&limit, "l", 20, "limit")
	flag.StringVar(&period, "p", "month", "month、week、day")
	flag.Parse()

	p := fmt.Sprintf(`{"category":"trending","period":"%v","lang":"go","offset":0,"limit":%v}`, period, limit)

	fmt.Println("start ...")

	requestBody := bytes.NewBuffer([]byte(p))

	// 发起 POST 请求
	resp, err := http.Post(url, "application/json", requestBody)
	if err != nil {
		fmt.Println("Post request failed:", err)
		return
	}
	defer resp.Body.Close()

	var response Response
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		fmt.Println("Failed to decode JSON:", err)
		return
	}
	ai := NewClient()

	waitGroup := sync.WaitGroup{}
	for _, repo := range response.Data {
		waitGroup.Add(1)
		go func(repo Repo, ai *openai.Client) {
			defer waitGroup.Done()
			TranslateOutput(repo, ai)
		}(repo, ai)
	}
	waitGroup.Wait()
}

func TranslateOutput(repo Repo, ai *openai.Client) {
	req := openai.ChatCompletionRequest{
		Model:     openai.GPT3Dot5Turbo,
		MaxTokens: 2048,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleUser,
				Content: fmt.Sprintf("请根据我提供的内容，如果是英文，请翻译成中文，如果是中文则保持原样。：我提供的内容是：【%s】。输出翻译内容即可，不需要多余的内容。", repo.Description),
			},
		},
		Stream: false,
	}
	resp, err := ai.CreateChatCompletion(context.Background(), req)
	if err != nil {
		fmt.Printf("ChatCompletion error: %v\n", err.Error())
		return
	}
	mutex.Lock()
	defer mutex.Unlock()
	fmt.Println("仓库:", repo.Username, "/", repo.RepoName, "\t Star", repo.StarCount, "\tFork", repo.ForkCount)
	fmt.Println("翻译：", resp.Choices[0].Message.Content)
	fmt.Println("描述：", repo.Description)
	fmt.Println("===================================================")

}

func NewClient() *openai.Client {

	config := openai.DefaultConfig("sk-xxxxxxxxxxxxxxxxxxxx")
	config.BaseURL = "https://api.openai.com/v1"

	return openai.NewClientWithConfig(config)
}

```

编译并重命名为gotop,移动到**~/go/bin**。在终端键入gotop就能得到最近热门go项目啦。😊
