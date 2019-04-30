package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
)

var (
	Dir string
	Keyword string
)

func init()  {
	flag.StringVar(&Dir, "d", "", "views下的目录文件名，不存在会新建")
	flag.StringVar(&Keyword, "k", "", "关键字，目录名字，class名字")
}

func main() {
	flag.Parse()

	currentDir, _ := os.Getwd()

	if ! strings.Contains(currentDir, "buildTemplate") {
		fmt.Println("请将此工具放置在src->utils->buildTemplate目录下")
		return
	}


	if len(Keyword) == 0 || len(Dir) == 0{
		fmt.Println("缺少参数，请使用 -h 查看帮助！")
		return
	}

	if ! IsDir("./template"){
		fmt.Println("缺少template目录")
		return
	}
	viewsDir := "../../views"
	if ! IsDir(viewsDir){
		fmt.Println("缺少views目录")
		return
	}
	viewsDir1 := viewsDir +"/" + Dir
	if ! IsDir(viewsDir1){
		err := os.Mkdir(viewsDir1, os.ModePerm)
		if err != nil {
			fmt.Println("生成"+ Dir +"目录失败！")
			return
		}
		fmt.Println("生成"+ viewsDir1 +"目录！")

	}
	if  IsDir(viewsDir1 + "/" + Keyword ){
		fmt.Println( Keyword+"目录已经存在")
		return
	}else {
		err := os.Mkdir(viewsDir1 + "/" + Keyword, os.ModePerm)
		if err != nil {
			fmt.Println("生成"+ viewsDir1 + "/" + Keyword +"目录失败！")
			return
		}
		fmt.Println("生成"+ viewsDir1 + "/" + Keyword +"目录！")
	}

	targetDir := viewsDir1 + "/" + Keyword
	fmt.Println("复制处理代码中.....")
	BuildDir(targetDir)

	css,_ := ioutil.ReadFile("./template/css/style.scss")
	newCss := strings.ReplaceAll(string(css),"keyword",Keyword)
	_ = ioutil.WriteFile(targetDir+"/css/style.scss",[]byte(newCss),os.ModePerm)

	vue,_ := ioutil.ReadFile("./template/Index.vue")
	newVue := strings.ReplaceAll(string(vue),"keyword",Keyword)
	_ = ioutil.WriteFile(targetDir+"/Index.vue",[]byte(newVue),os.ModePerm)

	pageMixin,_ := ioutil.ReadFile("./template/mixin/page.js")
	//strings.ReplaceAll(string(vue),"keyword",Keyword)
	_ = ioutil.WriteFile(targetDir+"/mixin/page.js",pageMixin,os.ModePerm)

	fmt.Println("已完成代码生成")

}


func IsDir(path string) bool {
	s, err := os.Stat(path)
	if err != nil {
		return false
	}
	return s.IsDir()
}

func BuildDir(targetDir string) {
	_ = os.Mkdir(targetDir + "/css", os.ModePerm)
 	_ = os.Mkdir(targetDir + "/mixin", os.ModePerm)
	_ = os.Mkdir(targetDir + "/img", os.ModePerm)
	return
}