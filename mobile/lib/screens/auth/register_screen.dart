import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  String _role = 'customer';
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() { _busy = true; _error = null; });
    final auth = context.read<AuthProvider>();
    final ok = await auth.register(
      name: _nameCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      password: _passwordCtrl.text,
      role: _role,
    );
    if (!mounted) return;
    setState(() { _busy = false; });
    if (ok) {
      Navigator.of(context).popUntil((r) => r.isFirst);
    } else {
      setState(() { _error = auth.lastError; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (_error != null) Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Full name')),
            const SizedBox(height: 14),
            TextField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 14),
            TextField(controller: _passwordCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'Password (min 6 characters)')),
            const SizedBox(height: 16),
            const Text('Account type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            RadioListTile<String>(
              value: 'customer',
              groupValue: _role,
              title: const Text('Customer — browse and buy furniture'),
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _role = v!),
            ),
            RadioListTile<String>(
              value: 'shop_owner',
              groupValue: _role,
              title: const Text('Shop owner — sell furniture'),
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _role = v!),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Create account'),
            ),
          ]),
        ),
      ),
    );
  }
}
