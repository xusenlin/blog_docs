package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"
)

func main() {
	routes, _ := ioutil.ReadFile("./index.js")
	routesString := string(routes)
	keyword := "@/views/contentManage/"
	fmt.Println(strings.Contains(routesString,keyword))

	keywordIndex := strings.Index(routesString,keyword)

	insterStr := `,
			{
				path: '1111111111',
				name: 'Post',
				meta: {
					title: '文章管理',
					keepAlive: true
				},
				component: resolve =>require(['@/views/contentManage/Index.vue'], resolve),
			}`

	insterIndex := keywordIndex+strings.Index(routesString[keywordIndex:],"}")+1
	fille := routesString[:insterIndex] + insterStr + routesString[insterIndex:]

	_= ioutil.WriteFile("./xxx.js",[]byte(fille),os.ModePerm)

}
