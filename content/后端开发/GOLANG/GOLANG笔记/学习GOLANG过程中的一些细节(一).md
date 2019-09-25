```json
{
  "date": "2019.08.17 08:45",
  "tags": ["GOLAN基础"],
  "description":"在学习GOLANG的过程中会有一些容易忽略的小细节，希望把这些细节记录下来，以备后续翻阅复习。这部分是基础部分，主要是在语法上的一些细节，会继续更新。"
}
```





## 记录一些GOLANG容易忽略的小细节

####  := 必须确保至少有一个变量是用于声明的，即：

```go
var err
file,err := xxx
```

如果file在同级词法域被声明过，那么file和err都不能被:=声明，编译器会报no new variables on left side of :=。显然是不行的，因此至少有一个变量是可以用来声明的，如果变量是在外部词法域声明的，那么`:=`将会在当前词法域重新声明一个新的变量。也要注意err在这里其实只是赋值。



####  常量的值必须在编译阶段就确定的值，即：

```go
const Home = os.GetEnv("HOME") //错误写法，只能在运行阶段才能确定
const varVal = 4 + 7 //正确写法，在编译阶段能确认的值，
```

#### 值类型和引用类型

> 值类型

```GO
整型（int8,uint等）                 # 基础类型之数字类型
浮点型（float32，float64）          # 基础类型之数字类型
复数()                             # 基础类型之数字类型
布尔型（bool）                      # 基础类型
字符串（string）                    # 基础类型
数组                               # 复合类型 
结构体（struct）                    # 复合类型
```

> 引用类型

```go
指针
切片（slice）
字典（map）
函数
管道（chan）
接口（interface）
```

#### 关键字iota声明初始值为0，每行递增1,如果都在一行，则值都一样

```go
const (
	g = iota    	        //0
  h,i,j = iota,iota,iota 	       
  k 				        // 这一行会报错。
)
```



#### 自增自减不能用于表达式中，只能独立使用，即：

```go
a = i++           //错误用法
if i++ > 0 {}     //错误用法
i++               //正确用法
```

#### Switch 语句默认使用break

```go
switch num {
   case 1:        // case 中可以是表达式
      fmt.Println("111")
   case 2:
      fmt.Println("222")
   default:
      fmt.Println("000")
}
```

- Go保留了`break`，用来跳出switch语句，上述案例的分支中默认就书写了该关键字
- Go也提供`fallthrough`，代表不跳出switch，后面的语句无条件执行

