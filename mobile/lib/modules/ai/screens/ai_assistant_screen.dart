import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../models/ai_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/ai_provider.dart';

const _suggestions = <String>[
  'Show my profit this month',
  'Which products are losing money?',
  'Who is my best salesman?',
  'Which warehouse is performing best?',
  'What should I purchase?',
  'Which products are not moving?',
  'የዚህ ወር ትርፌ ስንት ነው?',
  'በጣም ትርፋማ የሆነው ምርት የትኛው ነው?',
];

const _chartColors = <Color>[
  Color(0xFF0F766E),
  Color(0xFFC2410C),
  Color(0xFF0369A1),
  Color(0xFFA16207),
  Color(0xFF7C3AED),
  Color(0xFFBE123C),
];

class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({
    super.key,
    this.initialQuestion,
    this.onOpenDesk,
  });

  final String? initialQuestion;
  final VoidCallback? onOpenDesk;

  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends State<AiAssistantScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final q = widget.initialQuestion?.trim();
      if (q != null && q.isNotEmpty && !_started) {
        _started = true;
        context.read<AiProvider>().ask(q);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.length < 2) return;
    if (preset == null) _controller.clear();
    await context.read<AiProvider>().ask(text);
    _scrollToEnd();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AiProvider>();
    final sync = context.watch<SyncProvider>();

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'AI assistant offline',
        subtitle: 'Switch to Auto or Online to ask questions.',
        icon: Icons.smart_toy_outlined,
      );
    }

    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToEnd());

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI assistant',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                          ),
                    ),
                    const Text(
                      'Ask about profit, stock, stores, and salesmen.',
                      style: TextStyle(color: AppColors.inkSoft, fontSize: 13),
                    ),
                  ],
                ),
              ),
              if (widget.onOpenDesk != null)
                TextButton(
                  onPressed: widget.onOpenDesk,
                  child: const Text('AI desk'),
                ),
            ],
          ),
        ),
        SwitchListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          title: const Text('Smart Clarify'),
          subtitle: const Text('Confirm ambiguous questions before answering'),
          value: provider.smartClarify,
          activeThumbColor: AppColors.brand,
          onChanged: provider.setSmartClarify,
        ),
        if (provider.messages.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _suggestions
                  .map(
                    (s) => ActionChip(
                      label: Text(s, style: const TextStyle(fontSize: 12)),
                      onPressed:
                          provider.asking ? null : () => _send(s),
                      backgroundColor:
                          AppColors.brand.withValues(alpha: 0.08),
                    ),
                  )
                  .toList(),
            ),
          ),
        Expanded(
          child: ListView.builder(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            itemCount: provider.messages.length,
            itemBuilder: (context, index) {
              final msg = provider.messages[index];
              if (msg.role == 'user') {
                return _UserBubble(text: msg.text);
              }
              if (msg.role == 'clarify') {
                return _ClarifyBubble(
                  text: msg.text,
                  candidates: msg.clarifyCandidates,
                  busy: provider.asking,
                  onPick: (c) async {
                    await provider.pickClarify(c);
                    _scrollToEnd();
                  },
                );
              }
              if (msg.isTyping) {
                return const _TypingBubble();
              }
              return _AiBubble(
                message: msg,
                onCopy: () async {
                  final chat = msg.chat;
                  final text = [
                    chat?.answer ?? msg.text,
                    if (chat != null)
                      ...chat.metrics.map((m) => '${m.label}: ${m.value}'),
                  ].join('\n');
                  await Clipboard.setData(ClipboardData(text: text));
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Copied answer')),
                  );
                },
                onCsv: () async {
                  final table = msg.chat?.table;
                  if (table == null) return;
                  final buffer = StringBuffer(
                    '${table.headers.map(_csv).join(',')}\r\n',
                  );
                  for (final row in table.rows) {
                    buffer.writeln(row.map(_csv).join(','));
                  }
                  await Clipboard.setData(ClipboardData(text: buffer.toString()));
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('CSV copied to clipboard')),
                  );
                },
                onRegenerate: msg.chat == null
                    ? null
                    : () async {
                        await provider.regenerate(msg.chat!);
                        _scrollToEnd();
                      },
                onSuggestion: (s) => _send(s),
              );
            },
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Ask anything about your inventory…',
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: provider.asking ? null : () => _send(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.brand,
                    minimumSize: const Size(52, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: provider.asking
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _csv(String value) => '"${value.replaceAll('"', '""')}"';
}

class _UserBubble extends StatelessWidget {
  const _UserBubble({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10, left: 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.brand,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(text, style: const TextStyle(color: Colors.white)),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10, right: 48),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text('Thinking…', style: TextStyle(color: AppColors.inkSoft)),
          ],
        ),
      ),
    );
  }
}

class _ClarifyBubble extends StatelessWidget {
  const _ClarifyBubble({
    required this.text,
    required this.candidates,
    required this.busy,
    required this.onPick,
  });

  final String text;
  final List<String> candidates;
  final bool busy;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.saffron.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.saffron.withValues(alpha: 0.35)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(text, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: candidates
                  .map(
                    (c) => ActionChip(
                      label: Text(c),
                      onPressed: busy ? null : () => onPick(c),
                      backgroundColor: Colors.white,
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _AiBubble extends StatelessWidget {
  const _AiBubble({
    required this.message,
    required this.onCopy,
    required this.onCsv,
    required this.onRegenerate,
    required this.onSuggestion,
  });

  final AiMessage message;
  final VoidCallback onCopy;
  final VoidCallback onCsv;
  final VoidCallback? onRegenerate;
  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) {
    final chat = message.chat;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.brand.withValues(alpha: 0.18)),
          boxShadow: [
            BoxShadow(
              color: AppColors.ink.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (chat?.metrics.isNotEmpty == true) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: chat!.metrics
                    .map(
                      (m) => Container(
                        width: 140,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.brand.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.label,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.inkSoft,
                              ),
                            ),
                            Text(
                              m.value,
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            if (m.trend != null)
                              Text(
                                m.trend!,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.brand,
                                ),
                              ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 10),
            ],
            Text(
              message.text.isEmpty ? (chat?.answer ?? '') : message.text,
              style: const TextStyle(height: 1.4),
            ),
            if (chat?.bullets.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              ...chat!.bullets.map(
                (b) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('•  ', style: TextStyle(color: AppColors.brand)),
                      Expanded(child: Text(b)),
                    ],
                  ),
                ),
              ),
            ],
            if (chat?.chart != null) ...[
              const SizedBox(height: 12),
              _SimpleBarChart(chart: chat!.chart!),
            ],
            if (chat?.table != null) ...[
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(AppColors.brand),
                  headingRowHeight: 40,
                  columns: chat!.table!.headers
                      .map(
                        (h) => DataColumn(
                          label: Text(
                            h,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  rows: chat.table!.rows
                      .take(50)
                      .map(
                        (row) => DataRow(
                          cells: row
                              .map((c) => DataCell(Text(c.isEmpty ? '—' : c)))
                              .toList(),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
            if (chat?.suggestions.isNotEmpty == true) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: chat!.suggestions
                    .map(
                      (s) => ActionChip(
                        label: Text(s, style: const TextStyle(fontSize: 12)),
                        onPressed: () => onSuggestion(s),
                      ),
                    )
                    .toList(),
              ),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: onCopy,
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copy'),
                ),
                if (chat?.table != null)
                  OutlinedButton.icon(
                    onPressed: onCsv,
                    icon: const Icon(Icons.table_view, size: 16),
                    label: const Text('CSV'),
                  ),
                if (onRegenerate != null)
                  OutlinedButton.icon(
                    onPressed: onRegenerate,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Regenerate'),
                  ),
              ],
            ),
            if (chat != null) ...[
              const SizedBox(height: 6),
              Text(
                [
                  if (chat.companyScoped) 'Company-scoped',
                  if (chat.rowCount > 0) '${chat.rowCount} rows',
                  if ((chat.lastUpdated ?? '').isNotEmpty)
                    'Updated ${chat.lastUpdated}',
                ].join(' · '),
                style: const TextStyle(fontSize: 11, color: AppColors.inkSoft),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SimpleBarChart extends StatelessWidget {
  const _SimpleBarChart({required this.chart});
  final AiChatChart chart;

  @override
  Widget build(BuildContext context) {
    final data = chart.data.take(8).toList();
    if (data.isEmpty) return const SizedBox.shrink();
    final maxValue = data
        .map((d) => d.value)
        .fold<double>(0, (a, b) => a > b ? a : b)
        .clamp(1, double.infinity);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (chart.title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              chart.title,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ...data.asMap().entries.map((entry) {
          final i = entry.key;
          final row = entry.value;
          final ratio = (row.value / maxValue).clamp(0.0, 1.0);
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${row.name} · ${row.value.toStringAsFixed(row.value == row.value.roundToDouble() ? 0 : 2)}',
                  style: const TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: ratio,
                    minHeight: 10,
                    backgroundColor: AppColors.line,
                    color: _chartColors[i % _chartColors.length],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
