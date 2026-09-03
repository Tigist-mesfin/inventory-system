import 'package:flutter/material.dart';

import 'empty_state.dart';

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({
    super.key,
    required this.title,
    this.subtitle =
        'This screen is available on the web app. Mobile support is coming soon.',
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: EmptyState(
        title: title,
        subtitle: subtitle,
        icon: Icons.construction_outlined,
      ),
    );
  }
}
