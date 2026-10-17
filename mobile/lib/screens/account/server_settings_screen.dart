import 'package:flutter/material.dart';

import '../../config.dart';
import '../../core/api_client.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Lets the app point at wherever `npm run dev` is actually running —
/// there's no fixed public URL for a local dev server, so this has to
/// be editable at runtime. See AppConfig for the platform defaults.
class ServerSettingsScreen extends StatefulWidget {
  const ServerSettingsScreen({super.key});

  @override
  State<ServerSettingsScreen> createState() => _ServerSettingsScreenState();
}

class _ServerSettingsScreenState extends State<ServerSettingsScreen> {
  late final _ctrl = TextEditingController(text: AppConfig.origin);
  bool _testing = false;
  String? _result;
  bool? _ok;

  Future<void> _save() async {
    await AppConfig.setOrigin(_ctrl.text);
    if (!mounted) return;
    showSnack(context, 'Server address saved.');
  }

  Future<void> _test() async {
    setState(() { _testing = true; _result = null; });
    await AppConfig.setOrigin(_ctrl.text);
    try {
      final api = await ApiClient.instance();
      await api.get('/products');
      setState(() { _ok = true; _result = 'Connected successfully.'; });
    } catch (e) {
      setState(() { _ok = false; _result = e.toString(); });
    } finally {
      setState(() => _testing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Server')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'ZAWIYA runs as a Next.js server (npm run dev) on your development machine. '
            'Point this app at that server\'s address.',
            style: TextStyle(color: ZColors.stone600),
          ),
          const SizedBox(height: 16),
          TextField(controller: _ctrl, decoration: const InputDecoration(labelText: 'Server address', hintText: 'http://10.0.2.2:3000')),
          const SizedBox(height: 8),
          const Text(
            'Android emulator: http://10.0.2.2:3000\n'
            'iOS simulator / macOS: http://localhost:3000\n'
            'Physical device: http://<your computer\'s LAN IP>:3000',
            style: TextStyle(fontSize: 12, color: ZColors.stone500),
          ),
          const SizedBox(height: 20),
          if (_result != null) Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_result!, style: TextStyle(color: _ok == true ? ZColors.sage700 : ZColors.red)),
          ),
          Row(children: [
            Expanded(child: OutlinedButton(onPressed: _testing ? null : _test, child: _testing ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Test connection'))),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(onPressed: _save, child: const Text('Save'))),
          ]),
        ],
      ),
    );
  }
}
