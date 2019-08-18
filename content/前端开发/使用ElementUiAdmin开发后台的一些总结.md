```json
{
  "date": "2019.07.04 15:00",
  "tags": ["VUE","总结"]
}
```





使用自己开源的ElementUiAdmin做了很多管理后台系统，总结一些非常棒的地方。当然，一个成熟的后台管理系统不只是这些。


## 目录
- 列表分页 
- 全局字典设计
- Api代码生成和分类
- 面包屑和路由分类
- 字段验证


![ElementUiAdmin](http://xusenlin.com/assets/ElementUIAdmin/ElementUiAdmin.png)

在此之前，我们有一些常用的工具函数
```javascript
export function fillerLeft(obj,row = {}) {

    for (let key in obj) {
        if(row.hasOwnProperty(key) && row[key] !== null && row[key] !== undefined){
            obj[key] = row[key]
        }
    }
    
}

export function resetArgs(args,def = {}) {
    for (let key in args) {
        if(def.hasOwnProperty(key)){
            args[key] = def[key]
        }else {
            if (Array.isArray(args[key])) args[key] = [];
            if ('string' == typeof args[key]) args[key] = '';
            if ('number' == typeof args[key]) args[key] = null;
            if ('boolean' == typeof args[key]) args[key] = false;
        }
    }
}

```
### 列表分页
我们有7个这样的后台管理系统，可以看见其中有大量的分页列表，它包含了分页参数的查询和重置、表格的数据和增删查改、分页的显示和交互。对此，我使用GOLANG写了一个代码生成的工具，可以传入一些参数生成这种模板。项目一开始，我就使用工具生成了所有的模块的分页列表（一个大的菜单是一个模块的话，到最后，这个系统大概会有16、7个模块）
```
工具：https://github.com/xusenlin/ElementUIAdminTool
```
这种思路非常重要，我们在接手一个系统或者一个功能的时候，先从整体的框架或者整体的逻辑先理顺（可以写一些伪代码），再去填充具体的细节，如果是顺着写，你会发现在比较复杂逻辑的时候容易绕进去。

来看看其中生成的mixin文件，他被命名为page.js，负责分页相关的数据和方法。

```javascript
import {listPage} from '@/api/studyService/evaluation.js'
import {resetArgs} from '@/utils/index.js'
import {cloneDeep} from 'lodash'
export default {
    data() {
        return {
            requestFunc:listPage,
            searchParams: {
                id:'',
                name: '',
                sellType: '',
                discountType: '',
                updateId: '',
            },
            tableData: []
        }
    },
    methods: {
        returnData(pageList){
            this.tableData = pageList.list
        },
        clearSearchParams(){
            resetArgs(this.searchParams);
            this.refresh();
        },
        refresh(){
            this.$refs.pagination.Refresh()
        },
        filterParams(Params){
            let p = cloneDeep(Params);
            p.operateTagIdList = p.operateTagIdList.map(r=>{return r.id})
            return p
        }
    },
}


```

requestFunc是一个AxiosPromise请求函数，会被配置到分页组件上。searchParams是这个分页相关的请求参数，也会被配置到分页组件上，但是我们不会去关心pageSize、pageNum、total这些参数，因为在请求的时候分页组件会自动为我们带上，请求回来会自动为我们设置total。tableData就是表格的数据，他的值是通过分页组件触发returnData函数得到的。clearSearchParams函数是绑定到重置按钮上的，当然，有时候重置的时候我们并不希望重置所有的参数，可以通过resetArgs函数的第二个参数来设置默认值，比如，这个分页api希望我们永远带上一个id去访问，我们可以这样

```javascript
 resetArgs(this.searchParams,{id:55});
```
重置参数之后我们需要调一下分页组件的刷新方法来获取数据，refresh()除了刷新还被绑定到了查询按钮上。触发一次都会使用当前参数请求回来之后触发我们的returnData函数。

filterParams函数也是分配在组件上，用来过滤我们的参数，一般情况下可以不去使用，像上面的id也可以在这里添加。

之所以使用vue的mixins是希望把分页列表相关的东西分离出去，我们的vue主文件只关心表格的增删查改。




### 全局字典设计

在一个完整的后台管理系统中，肯定避免不了很多地方使用字典，即下拉选项，它可能出现在任何一个页面上，我们难道要每个地方都去导入Api请求赋值吗？很显然我们需要一个全局的函数initKeyMap，它被定义在utils目录。
```javascript
export function initKeyMap(keyObj) {

    if(Object.keys(keyObj).length != 0){
        getKeyMap(Object.keys(keyObj)).then(r =>{
            fillerLeft(keyObj,r)
        }).catch(_=>{})
    }
    
}
```
getKeyMap函数被定义在Api目录，他返回的是一个AxiosPromise。我们把此函数挂载到vue原型上之后就可以随意使用

```javascript
data() {
    return {
        keyMap:{
            useFlag:[],
            postType: [],
            ...
        }
    }
},
created() {
    this.$initKeyMap(this.keyMap);
},
```
在任何地方调用this.$initKeyMap()即可自动请求并赋值。

###  Api代码生成和分类
当项目越来越大的时候，Api是不能放在一起的，每一个文件夹代表一个分类或者模块，里面有多个js文件去细分页面之类的。但是，我们做了很好的分类却几乎没有写过api代码，都是通过js来生成的。



```javascript
var ApiList = document.querySelectorAll('.opblock-summary');

var ApiStr = `
import request from '@/utils/request.js'
import {gatewayPrefix} from './config.js'
`;
var MethodNameS = []
var JsKeyword = ['break','else', 'new', 'var', 'case', 'finally', 'return', 'void', 'catch', 'for', 'switch', 'while', 'continue', 'function', 'this', 'with', 'default', 'if ', 'throw', 'delete', 'in', 'try', 'do', 'instranceof', 'typeof', 'abstract', 'enum', 'int', 'short', 'boolean', 'export', 'interface', 'static', 'byte', 'extends', 'long', 'super', 'char', 'final', 'native', 'synchronized', 'class', 'float', 'package', 'throws', 'const', 'goto', 'private', 'transient', 'debugger', 'implements', 'protected', 'volatile', 'double', 'import', 'public']
var Num = 1

ApiList.forEach(r => {
    let path = r.querySelector('.opblock-summary-path a span').innerText;
    let pathArr = path.split('/');
    let isPostMethod = r.querySelector('.opblock-summary-method').innerText == "POST";
    Num = 1

    let methodName = MethodNameUnique(pathArr[pathArr.length - 1]);
    MethodNameS.push(methodName);

    ApiStr += `


/**
 * ${r.querySelector('.opblock-summary-description').innerText}
 * @param params
 * @returns {AxiosPromise}
 */
export function ${methodName}(params) {
    return request({
        url: gatewayPrefix + '${path.replace('/api', '')}',
        method: '${isPostMethod ? "post" : 'get'}',
        ${isPostMethod ? "data" : 'params'}: params
    })
}

`

});
ApiStr += `


//全部方法
//${MethodNameS.join('、')}
`

function MethodNameUnique(name) {
    if (MethodNameS.indexOf(name) != -1 || JsKeyword.indexOf(name) != -1) {
        Num++;
        return MethodNameUnique(name + Num)
    }
    return name
}

console.warn('===========================================================================');
console.log(ApiStr);
console.warn('===========================================================================');

```

这段js其实是我突发奇想写的。--

我们后台的api文档使用的是swagger-ui ，将上面的代码复制粘贴到swagger-ui页面的控制台，就会为我们打印出一个个模块的api代码。像下面这样


```javascript
import request from '@/utils/request.js'
import {gatewayPrefix} from './config.js'


/**
 * 课程/课程包移除
 * @param params
 * @returns {AxiosPromise}
 */
export function course(params) {
    return request({
        url: gatewayPrefix + '/article/delete/course',
        method: 'post',
        data: params
    })
}


/**
 * 获取文章详细
 * @param params
 * @returns {AxiosPromise}
 */
export function detail(params) {
    return request({
        url: gatewayPrefix + '/article/detail',
        method: 'post',
        data: params
    })
}
```

所有的代码非常统一，读起来甚至还像诗一样，哈哈。



### 面包屑和路由分类

面包屑使用了vue-route 的matched来简单实现。但是，由于我们一般的后台二级以后的路由都要展示在主layout上，那怎么实现三级以后的路由不在二级路由的里展示就变得至关重要了，这里有一个小技巧，可以通过一个Empty来实现。至于路由的分类，应该一个模块一个对应的js文件。

### 字段验证

系统有很多填写的字段需要验证，这些规则如果都去一条一条的写，那无疑是一大块一大块的代码块，非常繁琐。我们可以把公共的验证放到一起


```javascript

export const RegPhone = /^(0|86|17951)?(13[0-9]|15[012356789]|166|17[3678]|18[0-9]|14[57])[0-9]{8}$/;

export const PhoneIsCheck =  {pattern: RegPhone, message: '请输入正确的手机号码', trigger: 'blur'};

export const Number = { type:'number', message: '只能填写数字', trigger: 'blur'};

export const String = { type:'string',  message: '只能填写字符串', trigger: 'blur'};

export const Required = {required: true, message: '填写不能为空', trigger: 'blur'};

export const Boolean = {required: true, message: '请选择选项', trigger: 'change'};

export const Array = { type:'array',  message: '请选择选项', trigger: 'change'};

export const Date = { type:'date',  message: '请选择日期', trigger: 'change'};

export const Email = { type:'email',  message: '请输入正确的邮箱', trigger: 'blur'};

export const Float2 = { pattern: /^(([1-9][0-9]*)|(([0]\.\d{1,2}|[1-9][0-9]*\.\d{1,2})))$/ ,message: '只能填写数字并且最多两位小数', trigger: 'blur'};

export const Float2Max100 = { pattern: /^\d\.([1-9]{1,2}|[0-9][1-9])$|^[1-9]\d{0,1}(\.\d{1,2}){0,1}$|^100(\.0{1,2}){0,1}$/ ,message: '只能填写数字并且最大数是100不能超个两位小数', trigger: 'blur'};

export const Url = { pattern:/^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i , message: '请输入正确的链接地址' ,trigger: 'blur'};



//常用组合
export const RequiredAndNumber = [Required,Number];
export const RequiredAndBoolean = [Required,Boolean];
export const RequiredAndEmail = [Required,Email];
export const RequiredAndDate = [Required,Date];
export const RequiredAndArray = [Required,Array];
export const RequiredAndPhone = [Required,PhoneIsCheck];
export const RequiredAndFloat2 = [Required,Float2];
export const RequiredAndFloat2Max100 = [Required,Float2Max100];
export const RequiredAndUrl = [Required,Url];



export function FillerRieldRules(fields = [],obj) {
    let newValidateRules = {}
    fields.forEach(field=>{
        newValidateRules[field] = obj
    })
    return newValidateRules;
}
```

使用
```javascript
import {Required,RequiredAndNumber,RequiredAndDate,RequiredAndArray,FillerRieldRules,RequiredAndPhone} from '@/utils/commonValidateRules.js'
import {Float2,RequiredAndFloat2} from '@/utils/commonValidateRules.js'
rules: {
...FillerRieldRules(['name','sellType','onlineTime','operateCourseContent'],Required),
...FillerRieldRules(['sellPrice','effectiveDays'],RequiredAndNumber),
        myOperateTagList: RequiredAndArray,
        other:[{ type:'date',  message: '请选择日期', trigger: 'change'}],
...FillerRieldRules(['sellPrice','effectiveDays'],{ type:'date',  message: '请选择日期', trigger: 'change'}),
},

```


最后，编程的愉悦性很重要，只有这样，才能写出好的代码。哈哈。