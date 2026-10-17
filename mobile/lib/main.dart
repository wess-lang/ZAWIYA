import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config.dart';
import 'core/api_client.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'screens/root/root_shell.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.load();
  final api = await ApiClient.instance();
  runApp(ZawiyaApp(api: api));
}

/// ZAWIYA — Design Your Space.
///
/// Native mobile client for the ZAWIYA furniture marketplace. The web
/// app (this repo's root) stays the server: all data, auth, and the AI
/// Room-Fit feature are served by its existing Next.js API routes
/// (src/app/api/**); this app is a Flutter front end that talks to that
/// same REST-ish API over HTTP, matching the project documentation's
/// original Flutter-app architecture (Section 5.2) while reusing the
/// working backend instead of standing up a separate one.
class ZawiyaApp extends StatefulWidget {
  final ApiClient api;
  const ZawiyaApp({super.key, required this.api});

  @override
  State<ZawiyaApp> createState() => _ZawiyaAppState();
}

class _ZawiyaAppState extends State<ZawiyaApp> {
  late final AuthProvider _auth = AuthProvider(widget.api);
  late final CartProvider _cart = CartProvider();
  late final Future<void> _bootstrap = Future.wait([_auth.bootstrap(), _cart.load()]);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _cart),
      ],
      child: MaterialApp(
        title: 'ZAWIYA',
        debugShowCheckedModeBanner: false,
        theme: buildZawiyaTheme(),
        home: FutureBuilder(
          future: _bootstrap,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const _SplashScreen();
            }
            return const RootShell();
          },
        ),
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: ZColors.background,
      body: Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text('ZAWIYA', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: ZColors.sage700)),
          SizedBox(height: 16),
          CircularProgressIndicator(color: ZColors.sage600),
        ]),
      ),
    );
  }
}
