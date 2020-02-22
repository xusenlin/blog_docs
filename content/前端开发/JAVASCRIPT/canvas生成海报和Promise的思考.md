```json
{
  "date": "2020.02.22 20:00",
  "tags": ["CANVAS","Promise"],
  "description":"记得上一篇关于canvas的文章是介绍一些基础的canvas知识点和一些简单的Api,然后配合动画画出漂亮的半圆进度动画。这次，我想要在一张海报上添加一些元素，这些元素包含了多张小图和不同的文案，其实就是合成一张海报，里面包含了用户头像，二维码和不同的文案。然后涉及到了多张图片异步加载的等待，从而让我注意到了Promise链式调用的一些细节😄"
}
```


## 画海报

如果要在Canvas将所有图片画在一起，那么我们得保证所有图片都加载完毕之后才开始，可以使用Promise.all来完成全部图片的异步加载。那么就需要一个方法来将图片通过URl加载出来。

```javascript
const buildImgInstance = (url) => {
  let image = new Image();
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url ;
  return new Promise((resolve, reject) => {
    image.onload = () => {
      resolve(image);
    };
    image.onabort = e => {
      reject(e);
    };
    image.onerror = e => {
      reject(e);
    }
  });
};
```

因此接下来可以使用Promise.all来保证多张图片加载完成。

```javascript
export default function drawImages(r) {
  let imageInstances = [buildImgInstance(r.backgroundUrl)];
  for (let i=0;i<r.images.length;i++){
    imageInstances.push(buildImgInstance(r.images[i].url));
  }
  return new Promise((resolve, reject) => {
    Promise.all(imageInstances).then(Instances => {
      const canvas = document.createElement('canvas');
      let bgWidth = r.hasOwnProperty('width') ? r.width : Instances[0].width;
      let bgHeight = r.hasOwnProperty('height') ? r.height : Instances[0].height;
      canvas.width = bgWidth;
      canvas.height = bgHeight;
      canvas.backgroundColor = "rgb(255, 255, 255)";
      const context = canvas.getContext('2d');
      context.drawImage(Instances[0], 0, 0, bgWidth, bgHeight);
      for (let i= 1;i<Instances.length;i++){
        let imgAttr = r.images[i-1];
        let width = imgAttr.hasOwnProperty('width') ? imgAttr.width : Instances[i].width;
        let height = imgAttr.hasOwnProperty('height') ? imgAttr.height : Instances[i].height;
        context.drawImage(Instances[i], imgAttr.x, imgAttr.y, width , height );
      }
      for (let i= 0;i<r.texts.length;i++){
        context.save();
        if(r.texts[i].hasOwnProperty('attr')){
          for (let a in r.texts[i].attr) {
            context[a] = r.texts[i].attr[a];
          }
        }
        context.fillText(r.texts[i].title,r.texts[i].x,r.texts[i].y);
        context.restore();
      }
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    }).catch(err=>{
      reject(err)
    });
  });
}
```

这是封装好的一个方法，我们配合传入的参数来看


```javascript
{
   width:750,
   height:100,
   backgroundUrl:"https://img.url",
   images:[{url:"https://img.url",x:1010,y:120,width:10,height:55},{url:"https://img.url",x:50,y:0},{url:"https://img.url",x:100,y:3000}],
   texts:[{title:"文案",x:1010,y:2010,attr:{font:"100px Helvetica"}}]
}
```

将参数传进去，方法会将里面全部的图片通过异步去加载，当所有图片加载完成的时候，就会将images和texts里面的图片和文案按照规定往背景图上面贴，然后返回一个Promise对象，只要任何一张图片加载失败，就能触发catch方法。参数里面针对图片的宽高都可以省略，如果省略，将使用图片的实际宽高来绘制。

注意的是，所有图片都得允许跨域。


## promise链式调用


然后，我们来看看一个和上面无关的问题。


Promise 的链式调用。也就是 promise().then().then().catch() 的形式，然后如何在某一个 then() 里面 跳出 Promise。

Promise中，只要返回了一个 promise 对象，如果 promise 对象不是 Rejected 或 Fulfilled 状态，then 方法就会继续调用。利用这个特性，可以处理多个异步逻辑。但有时候某个 then 方法的执行结果可能会决定是否需要执行下一个 then，这个时候就需跳出 promise，主要思想就是使用 reject 来中止 promise 的 then 继续执行。

回顾下实例化的 promise 对象有以下三个状态：

- “has-resolution” - Fulfilled。resolve(成功)时，此时会调用 onFulfilled

- “has-rejection” - Rejected。reject(失败)时，此时会调用 onRejected

- “unresolved” - Pending。既不是resolve也不是reject的状态，也就是promise对象刚被创建后的初始化状态等

```javascript
let p1 = new Promise((resolve, reject) => {
        setTimeout(resolve, 10, "p1->resolve");
        setTimeout(reject, 1000, "p1->reject");
      });

      p1.then(r => {
        console.log("1.then", r);
        return new Promise((resolve, reject) => {
          setTimeout(resolve, 1100, "p2->resolve");
          setTimeout(reject, 100, "p2->reject(err)");
        });
      })
        .then(r => {
          console.log("2.then", r);
        })
        .catch(r => {
          console.log("catch", r);
        });
```


- promise 的 then 方法里面可以继续返回一个新的 promise 对象
- 下一个 then 方法的参数是上一个 promise 对象的 resolve 参数
- catch 方法的参数是其之前某个 promise 对象的 rejecte 参数
- 一旦某个 then 方法里面的 promise 状态改变为了 rejected，则promise 方法连会跳过后面的 then 直接执行 catch
- catch 方法里面依旧可以返回一个新的 promise 对象



不难看出，如果要跳出链式的Then 可以在then里调用reject即可。

```javascript
return Promise.reject("逻辑上触发 catch")
```