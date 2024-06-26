```json
{
  "date": "2024.06.26 22:00",
  "tags": ["flutter","dart"]
}
```





# flutter 环境

[Android Studio](https://developer.android.com/studio/install#mac) 2023.2.1 

1.Vscode 安装扩展 Flutter和Dart

2.安装下载 Flutter SDK并设置bin路径

​	解压在其他地方复制过来会丢失gi t信息

3.设置代理

	```export PUB_HOSTED_URL=https://pub.flutter-io.cn  

export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn```

3.安装 Android Studio 

​	默认组件

- **Android SDK Platform, API 34.0.5**
- **Android SDK Command-line Tools**
- **Android SDK Build-Tools**
- **Android SDK Platform-Tools**
- **Android Emulator**

4.运行 flutter doctor 检查

指定 sdk   flutter config --android-sdk /Users/xusenlin/flutter/Android/sdk

钱少其他工具可以通过 Android Studio  的设置 -> languages  -> Android SDK  -> sdk tools来安装

同意协议 **flutter doctor --android-licenses**

flutter create demo && cd demo && flutter run

添加插件

运行`flutter pub add webview_flutter`将会在pubspec.yaml里添加依赖。

获取项目依赖 flutter pub get

当你安装Flutter时，Dart SDK会随之自动安装。Flutter会自动将Dart SDK捆绑在一起，并将其添加到系统的环境变量中。在大多数情况下，你不需要单独安装Dart SDK，因为Flutter会处理这一步。

如果你想找到Dart SDK的位置，可以通过以下方式之一：

1. **通过Flutter命令行工具：** 运行`flutter doctor`命令，它会显示Flutter和Dart的安装路径。
2. **手动查找：** 在Flutter安装目录中，通常会有一个名为`bin/cache/dart-sdk`的文件夹，其中包含Dart SDK。



一个布局 widget 可能只能包含一个或多个 widget    一个使用  child，多个使用 children。

- 支持多个子 widget的， 例如 `Row`、`Column`、`ListView` 和 `Stack`

- 支持单个 widget的 例如 `Center` 和 `Container`

你可以使用 `mainAxisAlignment` 和 `crossAxisAlignment` 属性控制行或列如何对齐其子项。对于一行来说，主轴水平延伸，交叉轴垂直延伸。对于一列来说，主轴垂直延伸，交叉轴水平延伸。

### 笔记

- const 适用于定义编译常量（字面量固定值）的场景，而 final 适用于定义运行时常量的场景。

- 在 Dart 中，所有类型都是对象类型，都继承自顶层类型 Object，因此一切变量都是对象，数字、布尔值、函数和 null 也概莫能外；

- 未初始化变量的值都是 null；

  

### 导入包

```dart
import 'package:demo/routes.dart';
import 'package:flutter/material.dart';
import 'config/app.dart';
import '../kk/app.dart';
```

 ### icon

https://fonts.google.com/icons

# Dart

### 变量

Dart 是强类型语言，声明变量的方法：

- var a =  "hello"//类型推断

- dynamic a、Object a //在dart 所有的类型都是对象（包括null）,都继承Object

- final 、const  声明常量，使用final 、const 可以省略变量类型。const 编译时常量，final 运行时常量

  

### 函数

```dart
bool isNoble(int atomicNumber) {
  return _nobleGases[atomicNumber] != null;
}
```

Dart函数声明如果没有显式声明返回值类型时会默认当做`dynamic`处理

对于只包含一个表达式的函数，可以使用简写语法：

```dart
bool isNoble(int atomicNumber)=> true ;   
```

函数参数可以使用[]放在最后表示此参数时可选的。

```dart
String say(String from, String msg, [String? device]) {
  var result = '$from says $msg';
  if (device != null) {
    result = '$result with a $device';
  }
  return result;
}
```

调用函数是必须按照顺序来传参数，但是后面的device是可选的。👆

还有一种使用{}来包裹参数的，可选的命名指定参数，也就是参数都是可选的，但是，传参时必须指定参数

```dart
void enableFlags({bool ? bold, bool ? hidden}) {
    // ... 
}
```

```dart
enableFlags(bold: true, hidden: false);//指定bold，hidden
```

### mixin

Dart 是不支持多继承的，但是它支持 mixin，简单来讲 mixin 可以 “组合” 多个类

```dart
class Person {
  say() {
    print('say');
  }
}

mixin Eat {
  eat() {
    print('eat');
  }
}

mixin Walk {
  walk() {
    print('walk');
  }
}

mixin Code {
  code() {
    print('key');
  }
}

class Dog with Eat, Walk{}
class Man extends Person with Eat, Walk, Code{}
```



### Future  异步



（安装http模块 dart pub add http，导入导出规则）

定时器

```dart
Timer(const Duration(seconds: 2), () {
  print('定时器触发：${DateTime.now()}');
});
Timer.periodic(const Duration(seconds: 2), (time) {
  print('定时器触发：${DateTime.now()}');
});
```

Future （未来）与 JavaScript 中的 Promise 一样，返回 Future 类型的函数 有`Future.then`、 `Future.catchError`和`Future.whenComplete`可用。

```dart
Future.delayed(Duration(seconds: 2),(){
   //return "hi world!";
   throw AssertionError("Error");  
}).then((data){
   //执行成功会走到这里  
   print("success");
}).catchError((e){
   //执行失败会走到这里  
   print(e);
}).whenComplete((){
   //无论成功或失败都会走到这里
});
```

`Future.wait` 和 `Promise.all` 一样。等待多个Future全部完成，一个不能出错。

### async/await

Dart中的`async/await` 和JavaScript中的`async/await`功能是一样的：异步任务串行化。

其实，无论是在 JavaScript 还是 Dart 中，`async/await` 都只是一个语法糖，编译器或解释器最终都会将其转化为一个 Promise（Future）的调用链。

### Stream

`Stream` 也是用于接收异步事件数据，和 `Future` 不同的是，它可以接收多个异步操作的结果（成功或失败）。 也就是说，在执行异步任务时，可以通过多次触发成功或失败事件来传递结果数据或错误异常。 `Stream` 常用于会多次读取数据的异步任务场景，如网络内容下载、文件读写等。举个例子

```dart
Stream.fromFutures([
  // 1秒后返回结果
  Future.delayed(Duration(seconds: 1), () {
    return "hello 1";
  }),
  // 抛出一个异常
  Future.delayed(Duration(seconds: 2),(){
    throw AssertionError("Error");
  }),
  // 3秒后返回结果
  Future.delayed(Duration(seconds: 3), () {
    return "hello 3";
  })
]).listen((data){
   print(data);
}, onError: (e){
   print(e.message);
},onDone: (){

});
```

# Widget 组件

### flutter基础组件

- [`Text` (opens new window)](https://docs.flutter.dev/flutter/widgets/Text-class.html)：该组件可让您创建一个带格式的文本。
- [`Row` (opens new window)](https://docs.flutter.dev/flutter/widgets/Row-class.html)、 [`Column` (opens new window)](https://docs.flutter.dev/flutter/widgets/Column-class.html)： 这些具有弹性空间的布局类 widget 可让您在水平（Row）和垂直（Column）方向上创建灵活的布局。其设计是基于 Web 开发中的 Flexbox 布局模型。
- [`Stack` (opens new window)](https://docs.flutter.dev/flutter/widgets/Stack-class.html)： 取代线性布局 (译者语：和 Android 中的`FrameLayout`相似)，[`Stack`](https://docs.flutter.dev/flutter/ widgets/Stack-class.html)允许子 widget 堆叠， 你可以使用 [`Positioned` (opens new window)](https://docs.flutter.dev/flutter/widgets/Positioned-class.html)来定位他们相对于`Stack`的上下左右四条边的位置。Stacks是基于Web开发中的绝对定位（absolute positioning )布局模型设计的。
- [`Container` (opens new window)](https://docs.flutter.dev/flutter/widgets/Container-class.html)： [`Container` (opens new window)](https://docs.flutter.dev/flutter/widgets/Container-class.html)可让您创建矩形视觉元素。Container 可以装饰一个[`BoxDecoration` (opens new window)](https://docs.flutter.dev/flutter/painting/BoxDecoration-class.html), 如 background、一个边框、或者一个阴影。 [`Container` (opens new window)](https://docs.flutter.dev/flutter/widgets/Container-class.html)也可以具有边距（margins）、填充(padding)和应用于其大小的约束(constraints)。另外， [`Container` (opens new window)](https://docs.flutter.dev/flutter/widgets/Container-class.html)可以使用矩阵在三维空间中对其进行变换。

- 有状态的组件（Stateful widget）
- 无状态的组件（Stateless widget）

有状态的组件一般配合 State 类使用，State 需要有一个build方法。无状态的组件也要有一个build方法。

### Material 组件

- MaterialApp：`MaterialApp` 是Material 库中提供的 Flutter APP 框架，通过它可以设置应用的名称、主题、语言、首页及路由列表等。
- Scaffold(脚手架,支架)：`Scaffold` 是 Material 库中提供的页面脚手架，它提供了导航栏、悬浮按钮、标题(appBar)和包含主屏幕 widget 树
- PageView 过渡动画：如果有几个Widget需要切换，则可以使用 PageView 组件来包裹过渡

```dart
//获得一 Widget 切换控制器
final PageController _pageController = PageController();

//通过控制器可以跳转到不同页面
 _pageController.jumpToPage(index);

//最后需要销毁控制器
void dispose() {
    _pageController.dispose();
    super.dispose();
  }
//展示，一般可以配合BottomNavigationBar来做tab切换动画
PageView(
  controller: _pageController,
  onPageChanged: (index) {
    setState(() {
      _selectedIndex = index;
    });
  },
  children: _tabContent,
),
  
```

- SafeArea安全区域：避开不同手机的状态栏或者底部指示器等不应该放置内容的区域。



### 布局组件示例

```dart
Container(
  child: Text('Container（容器）在UI框架中是一个很常见的概念，Flutter也不例外。'),
  padding: EdgeInsets.all(18.0), // 内边距
  margin: EdgeInsets.all(44.0), // 外边距
  width: 180.0,
  height:240,
  alignment: Alignment.center, // 子Widget居中对齐
  decoration: BoxDecoration( //Container样式
    color: Colors.red, // 背景色
    borderRadius: BorderRadius.circular(10.0), // 圆角边框
  ),
)
```

```dart
Padding(
  padding: EdgeInsets.all(44.0),
  child: Text('Container（容器）在UI框架中是一个很常见的概念，Flutter也不例外。'),
);
```

```dart
Scaffold(
  body: Center(child: Text("Hello")) // This trailing comma makes auto-formatting nicer for build methods.
);
```



# 路由&导航&参数

创建一个路由，有首页和 test 页面

```dart
import './pages/home/main.dart';
import './pages/test.dart';
import 'package:flutter/material.dart';



class Routes {
  static const String home = '/';
  static const String test = '/test';


  static Map<String, WidgetBuilder> getRoutes() {
    return {
      home: (context) => const Home(),
      test:(context) => const Test(),
    };
  }
}
```

将路由配置到 MaterialApp 组件

```dart
import 'package:flutter/material.dart';
import './config/app.dart';
import './routes.dart';


void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: appName,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      initialRoute: Routes.home,
      routes: Routes.getRoutes(),
    );
  }
}
```

创建一个user类，作为页面传递参数

```dart
class User {
  final String name;
  final int age;

  User({required this.name, required this.age});
}
```

在首页导航=>  

```dart
ElevatedButton(
  onPressed: ()async {
    await Navigator.pushNamed(context, Routes.test,arguments: User(name: 'John Doe', age: 30));
  },
  child: const Text('Go to Test Page'),
),
```

Test 页面接收参数：

```dart
import '../../components/webView.dart';
import 'package:flutter/material.dart';
import 'home/tabContent/blog.dart';


class Test extends StatelessWidget {
  const Test({super.key});

  @override
  Widget build(BuildContext context) {
    final User user = ModalRoute.of(context)!.settings.arguments as User;
    return Scaffold(
      appBar: AppBar(
        title: Text('Test Page ${user.name}'),
      ),
      body:WebView(),
    );
  }
}
```



# 主题

`ThemeData` 是 Flutter 中用于定义应用程序整体主题的类。它包含许多属性，可以用来配置应用程序的视觉风格，如颜色、字体、图标、形状等。`ThemeData` 常用属性包括：

- `brightness`：应用程序的亮度（`Brightness.light` 或 `Brightness.dark`）。
- `primaryColor`：主要的应用程序颜色，通常用于 AppBar 的背景色。
- `accentColor`：强调色，通常用于 FloatingActionButton、选定文本等。
- `backgroundColor`：应用程序的背景颜色。
- `textTheme`：文本的主题样式。
- `iconTheme`：图标的主题样式。
- `buttonTheme`：按钮的主题样式。
- `appBarTheme`：AppBar 的主题样式。
- `scaffoldBackgroundColor`：Scaffold 的背景颜色。
- `colorScheme`：颜色方案，可以替代 `primaryColor` 和 `accentColor` 进行更细粒度的颜色控制。
- 以及更多用于自定义各种 UI 组件的主题属性。

`ColorScheme.fromSeed` 返回的内容

`ColorScheme.fromSeed` 是一个工厂构造函数，用于通过一个种子颜色生成一个 `ColorScheme`。`ColorScheme` 是一个用于定义应用程序颜色的类，包含一组预定义的颜色，可以用于统一应用程序中的颜色风格。

示例如下：

```dart
ColorScheme colorScheme = ColorScheme.fromSeed(seedColor: Colors.blue);
```

`ColorScheme` 包含的主要属性有：

- `primary`：主颜色。
- `primaryVariant`：主颜色的变体。
- `secondary`：次要颜色。
- `secondaryVariant`：次要颜色的变体。
- `background`：背景颜色。
- `surface`：表面颜色。
- `error`：错误颜色。
- `onPrimary`：与主颜色对比的颜色。
- `onSecondary`：与次要颜色对比的颜色。
- `onBackground`：与背景颜色对比的颜色。
- `onSurface`：与表面颜色对比的颜色。
- `onError`：与错误颜色对比的颜色。

通过 `ColorScheme.fromSeed` 生成的 `ColorScheme`，可以确保应用程序的颜色风格统一，并且颜色之间的对比度适合无障碍设计。
