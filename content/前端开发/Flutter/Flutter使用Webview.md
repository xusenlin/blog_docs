```json
{
  "date": "2024.05.30 22:00",
  "tags": ["flutter","webview"]
}
```

Flutter  是一个非常棒的技术，将App开发统一起来，如果我们熟悉 webview_flutter 组件，则更上一层楼，可以将 App 端的用户信息和 webview 共享，也就是说，任何 react 和 vue 框架的移动端 UI框架都可以用来组建App。



## 安装

```
flutter pub add webview_flutter
```

## 创建一个Webview  Widget

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class WebView extends StatelessWidget {
  WebView({super.key});

  late final WebViewCookieManager cookieManager = WebViewCookieManager();

  final controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..setBackgroundColor(const Color(0x00000000))
    ..setNavigationDelegate(
      NavigationDelegate(
        onProgress: (int progress) {},
        onPageStarted: (String url) {},
        onPageFinished: (String url) {},
        onHttpError: (HttpResponseError error) {print(error);},
        onWebResourceError: (WebResourceError error) {print(error);},
        onNavigationRequest: (NavigationRequest request) {
          // if (request.url.startsWith('https://xusenlin.com/')) {
          //   return NavigationDecision.prevent;
          // }
          return NavigationDecision.navigate;
        },
      ),
    );

  Future<void> _onSetCookie() async {
    await cookieManager.setCookie(
      const WebViewCookie(
        name: 'foo',
        value: 'bar',
        domain: 'mw.xxxx.com',
      ),
    );
    await controller.loadRequest(Uri.parse(
      'https://mw.xxxx.com/256',
    ));
    
    await controller.runJavaScript('alert(1)');

  }

  @override
  Widget build(BuildContext context) {
    _onSetCookie();
    return WebViewWidget(controller: controller);
  }
}

```

