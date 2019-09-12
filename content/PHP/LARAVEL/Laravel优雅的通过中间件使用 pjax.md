```json
{
  "date": "2017.03.08 14:53",
  "tags": ["LARAVEL"]
}
```


pjax是什么我就不解释了，我们来看看在laravel里面怎么使用。

**使用juqury插件jquery.pjax.js，它会把你指定的a标签进行跳转拦截，并添加点击事件，获取a标签链接向服务器发送带有头部标识的ajax请求，将获取的内容填充到你指定的容器。并对内容里面的js和css进行搬家，其实就是给你把js和css搬到头部去，（这里有bug，最好屏蔽掉。）**

因为浏览器不刷新，会产生更大的内存开销，之前加载的js new出来的对象没有释放再次加载会有重复的对象。在使用wangEditor编辑器就会出现这种提示,在45行：

```javascript
(function (window, $) {
    if (window.wangEditor) {
    // 重复引用
    alert('一个页面不能重复引用 wangEditor.js 或 wangEditor.min.js ！！！');
    return;
})()
```
 
**虽然有缺点，不过我强烈建议现代web都应该使用。体验超级棒！！！！！！**
在laravel中
首先，我们需要两个布局模板，一个是带有全部内容的模板，
还有一个空布局模板。然后我们可以在路由中间件哪里把所有的请求进行过滤或者称之为判断，判断是pjax请求就继承空布局，否则继承app布局。
设置pjax中间件。

```php
if ($request->pjax())$request->query->set('layout', 'layouts.pjax');
else $request->query->set('layout', 'layouts.app');
```
	 
在继承模板的地方使用
```php
  @extends(Request::instance()->layout)
```

ok。前端在进行相关设置就好了。
可以在app模板下面引入js。

```javascript

$(document).pjax('[pjax] a, a[pjax]', '#pjax-content');
$(document).on('pjax:start', function() {
  NProgress.start();
});
$(document).on('pjax:end', function() {
  NProgress.done();
});

```
			
现在，只要在a标签上添加pjax属性就实现了pjax，请注意，在资源下载的a标签上请不要使用pjax.