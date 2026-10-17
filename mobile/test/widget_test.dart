// Smoke test: the theme builds and a MaterialApp using it renders
// without throwing. Screens that hit the network (ApiClient) are
// exercised by running the app against a live `npm run dev` server,
// not in this offline unit test.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zawiya_mobile/theme.dart';

void main() {
  testWidgets('ZAWIYA theme renders a basic scaffold', (WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: buildZawiyaTheme(),
      home: const Scaffold(body: Center(child: Text('ZAWIYA'))),
    ));

    expect(find.text('ZAWIYA'), findsOneWidget);
  });

  test('formatJD formats Jordanian Dinar amounts', () {
    expect(formatJD(12.5), 'JD 12.50');
    expect(formatJD(0), 'JD 0.00');
  });
}
