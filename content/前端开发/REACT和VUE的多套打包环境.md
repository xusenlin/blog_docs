```json
{
  "date": "2019.09.12 20:00",
  "tags": ["前端环境"],
  "description":"本地、开发、开发测试、线上测试、预发布、正式发布环境，这么多的环境除了请求的URL不同，还有配置也不同。除此之外，为了方便开发H5页面，我们需要在除了正式环境外全部加入移动端调试工具，难道我们每次打包都去修改配置然后运行npm run build吗？🤣"
}
```


> 一开始，我是不会相信我的项目会有这么多的环境。但是在前后端一起重构了我们公司核心项目的时候，涉及到了给后端同事的验证api的打包，给数据迁移小组验证数据的打包、给测试验证功能的打包、验证微信支付的预发布打包、正式的打包。并且，由于预发布和正式使用的公众号不一致的配置以及微信分享非正式标识等等，都需要根据不同的环境做出不同的选择，如果人为的修改，随时可能会遗漏导致出错。


#### vue-cli 3 和 create-react-app 都支持向前端环境添加变量，我们从命令入手，在package.json添加如下命令：


- VUE

```javascript
"scripts": {
    "dev": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "build:dev": "vue-cli-service build  --mode dev",
    "build:devtest": "vue-cli-service build  --mode devtest",
    "build:test": "vue-cli-service build --mode test",
    "build:release": "vue-cli-service build --mode release"
  }
```


- REACT

```javascript
"scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "build:dev": "env-cmd -f .env.dev npm run build",
    "build:devtest": "env-cmd -f .env.devtest npm run build",
    "build:test": "env-cmd -f .env.test npm run build",
    "build:release": "env-cmd -f .env.release npm run build",
  }
```

#### 对应的在根目录添加 .env.dev 、 .env.devtest 、 .env.release 、 .env.test 在文件里面写入对应的变量。

- VUE

```javascript
NODE_ENV = 'production'
VUE_APP_MODE = 'buildDev'
```
```javascript
NODE_ENV = 'production'
VUE_APP_MODE = 'buildDevTest'
```
```javascript
NODE_ENV = 'production'
VUE_APP_MODE = 'release'
```
```javascript
NODE_ENV = 'production'
VUE_APP_MODE = 'buildTest'
```


- REACT

```javascript
REACT_APP_MODE = 'buildDev'
REACT_APP_MODE = 'buildDevTest'
REACT_APP_MODE = 'release'
REACT_APP_MODE = 'buildTest'
```

> REACT 需要安装 env-cmd


当我们使用不同的打包命令打包文件的时候，相应的变量名就可以在js环境拿到。


```javascript
process.env.NODE_ENV
process.env.VUE_APP_MODE
process.env.REACT_APP_MODE;
```

我们就可以在config目录添加一个url文件


```javascript

const devApiUrl = 'http://192.168.48.192:9088';//本地开发环境
const buildDevApiUrl = 'http://192.168.48.192:9088';//打包开发环境
const buildDevTestApiUrl = 'http://192.168.48.192:9288';//打包开发测试环境
const buildTestApiUrl = 'http://192.168.48.192:9188';//打包测试环境
const buildReleaseApiUrl = 'https://hsjapidev.xxx.com';//打包预发布环境
const buildProApiUrl = 'https://hsjapi.xxx.com';//打包正式环境


let useApiUrl = devApiUrl,
    isRelease = false, //是否是线上发布版本
    nodeEnv = process.env.NODE_ENV,
    appMode = process.env.REACT_APP_MODE;


if('production' === nodeEnv){
    switch (appMode) {
        case 'buildDev':
            useApiUrl = buildDevApiUrl;
            break;
        case 'buildDevTest':
            useApiUrl = buildDevTestApiUrl;
            break;
        case 'buildTest':
            useApiUrl = buildTestApiUrl;
            break;
        case 'release':
            useApiUrl = buildReleaseApiUrl;
            break;
        default:
            isRelease = true;
            useApiUrl = buildProApiUrl;
            break;
    }
}

export { useApiUrl,isRelease }; 


```

除了这些我们都可以通过变量区分环境，比如在做移动端的时候我们可以在htmlWebpackPlugin的模板文件添加这行代码

```javascript

<% if(!("production" == process.env.NODE_ENV && undefined == process.env.VUE_APP_MOD)){ %>
      <script src="//cdn.jsdelivr.net/npm/eruda"></script>
      <script>eruda.init();</script>
    <% } %>

```

表示除了正式环境全部添加移动端eruda调试工具，非常方便定位问题。当然，我经常开发基于微信H5的vue应用，也做了非常多的事情来完善这些东西。感兴趣可以查看项目：https://github.com/xusenlin/vueMultiplePages