```json
{
  "date": "2019.08.01 22:00",
  "tags": ["CANVAS"]
}
```



在此之前，有一点需要特别注意，即canvas的width和height属性与canvas的style.width和style.height是两个完全不同的概念，
canvas的width和height属性表示的是画布的宽度和高度（默认300像素×150像素），画布的坐标轴也是对应这个属性的，而canvas的style.width和style.height是canvas在网页展示的大小。
同时，我们绘制的一些图在高分屏的手机上显示会非常模糊，我们可以使用两倍像素来绘制，然后用一倍像素展示出来，即：

```javascript
<canvas style="width: 123px;height: 123px" height="246" width="246"></canvas>
```

canvas只支持矩形一种原生的图形绘制,所有其他的图形的绘制都至少需要生成一条路径。canvas提供了三种方法绘制矩形：
```javascript
fillRect(x, y, width, height)
```
绘制一个填充的矩形
```javascript
strokeRect(x, y, width, height)
```
绘制一个矩形的边框
```javascript
clearRect(x, y, width, height)
```
清除指定矩形区域，让清除部分完全透明,以上的三个函数绘制之后会马上显现在canvas上，即时生效。

---

对于其他图形,我们使用路径生成的方法来绘制。图形的基本元素是路径。路径是通过不同颜色和宽度的线段或曲线相连形成的不同形状的点的集合。一个路径，甚至一个子路径，都是闭合的。
通过路径来绘制图形一般分为下面几步：


1. 首先，你需要创建路径起始点。
2. 然后你使用画图命令去画出路径。
3. 之后你把路径封闭。
4. 一旦路径生成，你就能通过描边或填充路径区域来渲染图形。
  
  
```javascript
context.save(); //保存当前上下文环境，比如当前设置了各种状态(画笔颜色，画笔粗细等等)，然后可以通过context.restore()恢复到当前设置
context.fillStyle = '#aa0';
context.strokeStyle = '#f00';
context.lineWidth = '10';
context.font="30px Arial";
//上面设置了一些状态
context.fillText("Hello Word ",50,50);
ctx.beginPath();
context.arc(100,100,50,0,2*Math.PI);
context.stroke();//通过线条来绘制图形轮廓。
context.fill();//通过填充路径的内容区域生成实心的图形。
context.restore();//恢复之前的保存状态，可以让下面的绘制不受刚才的设置影响，如果save是getContext("2d")之后保存的，那么restore()就是初始化设置状态。
```

上面可以看出save和restore可以保证样式属性只运用于该段canvas元素。
我们直接使用context.arc()函数来绘制圆型路径。如果要绘制不规则路径，可以使用下面函数

beginPath()//新建一条路径，生成之后，图形绘制命令被指向到路径上生成路径。
ctx.moveTo(0,0);//定义线条开始坐标
ctx.lineTo(200,100);//定义线条结束坐标
closePath()//闭合路径之后图形绘制命令又重新指向到上下文中。

![canvas](http://xusenlin.com/assets/images/canvas.png)

来实现一下这个进度圆

```javascript

const startAngle = 0.65;
const endAngle = 0.35;
const angle = (2 - startAngle + endAngle)/100;


export default function(canvasDom, percentVal,foreColor,bottomText) {

    let percent = Math.round(percentVal);

    let context = canvasDom.getContext("2d");
    let center_x = canvasDom.width / 2;
    let center_y = canvasDom.height / 2;
    let speed = 0;

    // 绘制背景圆圈
    function backgroundCircle(){
        context.save();
        context.beginPath();
        context.lineWidth = 14; //设置线宽
        let radius = center_x - context.lineWidth;
        context.lineCap = "round";
        context.strokeStyle = "rgba(255, 255, 255, 0.3)";
        context.arc(center_x, center_y, radius, Math.PI*startAngle, Math.PI*endAngle, false);
        context.stroke();
        // context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        // context.fill();
        context.closePath();
        context.restore();
    }

    //绘制运动圆环
    function foregroundCircle(n){
        context.save();
        context.strokeStyle = foreColor;
        context.lineWidth = 14;
        context.lineCap = "round";
        let radius = center_x - context.lineWidth;
        context.beginPath();
        context.arc(center_x, center_y, radius , Math.PI * startAngle, Math.PI * endAngleFunc(n), false); //用于绘制圆弧context.arc(x坐标，y坐标，半径，起始角度，终止角度，顺时针/逆时针)
        context.stroke();
        context.closePath();
        context.restore();
    }
//绘制文字
    function text(n){
        context.save(); //save和restore可以保证样式属性只运用于该段canvas元素
        context.fillStyle = foreColor;
        let font_size = 72;
        context.font =  font_size + "px Helvetica";
        let text_width = context.measureText(n.toFixed(0)).width;
        context.fillText(n.toFixed(0), center_x-text_width/2 , center_y + font_size/2 - 10);
        context.font = 30 + "px Helvetica";
        context.fillText('%', center_x + text_width/2 , center_y + 30);
        context.font = 26 + "px Helvetica";
        let val_text_width = context.measureText(bottomText).width;
        context.fillText(bottomText, center_x - (val_text_width/2), canvasDom.height - 6);
        context.restore();
    }

    //执行动画
    (function drawFrame(){
        window.requestAnimationFrame(drawFrame);
        context.clearRect(0, 0, canvasDom.width, canvasDom.height);
        backgroundCircle();
        foregroundCircle(speed);
        text(speed);
        if(speed >= percent) return;
        speed += 1;
    }());
}

function endAngleFunc(n) {
    let val = n * angle + startAngle;

    if(val >= 2){
        return val - 2
    }else {
        return  val
    }

}
```
