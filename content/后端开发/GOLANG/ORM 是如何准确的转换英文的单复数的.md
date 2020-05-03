```json
{
  "date": "2020.05.03 15:30",
  "tags": ["ORM","单复数"],
  "description":"在英文中，单词的单复数变形是一个非常让人头大的事情，我们常用的一些规则如大部分名词后面加 s,以 s,x,ch,sh 结尾的名词加 es，以辅音字母 + y 结尾的名词把 y 变 i 再加 es 等等，除此之外还有不可数名词，不规则的变形等等，那么多规则，orm 是如何准确无误的进行单复数转换的呢？"
}
```



记得以前使用 Laravel 的时候， Laravel 的 Eloquent ORM 会默认使用复数表名，你以为它只是简单的在单词后面添加 s 吗？事情往往并不象我们想象的那么简单。

可以看看文件

```
\vendor\laravel\framework\src\Illuminate\Support\Pluralizer.php
```

大部分名词后面加 s,以 s,x,ch,sh 结尾的名词加 es，以辅音字母 + y 结尾的名词把 y 变 i 再加 es 等等（此处省略 N 多规则），除此之外还有不可数名词，不规则的变形等等，难道就不能统统加 s 吗？肯定是不行的，那样的话有的单词读起来就会特别奇怪。

最近在开发 MareWood ,于是特别好奇 GORM 是如何做的，来看看源码一探究竟吧。

在此之前，我们先看看一部分不可数名词和常见的不规则变形

## 不可数名词

```go
var uncountableInflections = []string{"equipment", "information", "rice", "money", "species", "series", "fish", "sheep", "jeans", "police", "evidence"}
```

## 不规则变形

```go
var irregularInflections = IrregularSlice{
	{"person", "people"},
	{"man", "men"},
	{"child", "children"},
	{"sex", "sexes"},
	{"move", "moves"},
	{"mombie", "mombies"},
}
```

上面的不可数名词和不规则变形肯定是比较简单了，遇见不可数名词的时候原样输出就好，遇见不规则变形的时候，按照这个 irregularInflections 输出就好，然后再来看看有规则的情况。

## 单数转复数规则

```go
var pluralInflections = RegularSlice{
	{"([a-z])$", "${1}s"},
	{"s$", "s"},
	{"^(ax|test)is$", "${1}es"},
	{"(octop|vir)us$", "${1}i"},
	{"(octop|vir)i$", "${1}i"},
	{"(alias|status)$", "${1}es"},
	{"(bu)s$", "${1}ses"},
	{"(buffal|tomat)o$", "${1}oes"},
	{"([ti])um$", "${1}a"},
	{"([ti])a$", "${1}a"},
	{"sis$", "ses"},
	{"(?:([^f])fe|([lr])f)$", "${1}${2}ves"},
	{"(hive)$", "${1}s"},
	{"([^aeiouy]|qu)y$", "${1}ies"},
	{"(x|ch|ss|sh)$", "${1}es"},
	{"(matr|vert|ind)(?:ix|ex)$", "${1}ices"},
	{"^(m|l)ouse$", "${1}ice"},
	{"^(m|l)ice$", "${1}ice"},
	{"^(ox)$", "${1}en"},
	{"^(oxen)$", "${1}"},
	{"(quiz)$", "${1}zes"},
}
```

## 复数转单数规则

```go
var singularInflections = RegularSlice{
	{"s$", ""},
	{"(ss)$", "${1}"},
	{"(n)ews$", "${1}ews"},
	{"([ti])a$", "${1}um"},
	{"((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$", "${1}sis"},
	{"(^analy)(sis|ses)$", "${1}sis"},
	{"([^f])ves$", "${1}fe"},
	{"(hive)s$", "${1}"},
	{"(tive)s$", "${1}"},
	{"([lr])ves$", "${1}f"},
	{"([^aeiouy]|qu)ies$", "${1}y"},
	{"(s)eries$", "${1}eries"},
	{"(m)ovies$", "${1}ovie"},
	{"(c)ookies$", "${1}ookie"},
	{"(x|ch|ss|sh)es$", "${1}"},
	{"^(m|l)ice$", "${1}ouse"},
	{"(bus)(es)?$", "${1}"},
	{"(o)es$", "${1}"},
	{"(shoe)s$", "${1}"},
	{"(cris|test)(is|es)$", "${1}is"},
	{"^(a)x[ie]s$", "${1}xis"},
	{"(octop|vir)(us|i)$", "${1}us"},
	{"(alias|status)(es)?$", "${1}"},
	{"^(ox)en", "${1}"},
	{"(vert|ind)ices$", "${1}ex"},
	{"(matr)ices$", "${1}ix"},
	{"(quiz)zes$", "${1}"},
	{"(database)s$", "${1}"},
}
```

pluralInflections 和 singularInflections 都是单复数变形的规则，在每个 Slice 里，左边是用来匹配的正则，右边是用来替换的模板，比如 pluralInflections 里的第一个 

```json
{"([a-z])$", "${1}s"}
```

表示匹配到字母 a 到 z 结尾的就添加 s ,当然了，这个优先级是最低的，我们后面会讲。

```json
{"(x|ch|ss|sh)$", "${1}es"},
```

这就是以 x,ch,ss,sh 结尾的名词加 es,这个优先级也并不是很高，需要明白的是不可数名词，不规则的变形优先级才是最高的，那么 GORM 是如何做的呢？

```go
var compiledPluralMaps []inflection
var compiledSingularMaps []inflection
```

这个就是 GORM 最关键的两个变量，compiledPluralMaps 它里面存放了所有单数转复数的规则，会优先将不可数名词和不规则的变形（它们的变形就是不做任何处理，原样输出） push 进去，然后在将 pluralInflections（单数转复数规则）**倒序** push 进 Map 里，compiledSingularMaps 同理，当然，这两个 map 添加规则的时候同时添加了首字母大写和全部大写字母的处理，

到这里，map 做好了之后，转换一个单词就去 map 里面找，找到就按照规则输出就行了。

这里已经说完了，其实比较重要的就是正则的学习了，感兴趣的可以去看看源码，它还支持添加自定义规则，添加不可数名词等等方法，不过每次添加都要重新生成这两个 Map。因此有一些可以优化的小细节，比如生成两个 map 的时候有一些循环可以合并，添加单数规则的时候可以不用重新生成复数规则 Map 等。当然，这些优化带来的性能微不足道。

