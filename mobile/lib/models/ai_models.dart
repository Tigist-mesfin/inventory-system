import '../server_list_models.dart';

Map<String, dynamic> asMap(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

List<Map<String, dynamic>> asMapList(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((row) => Map<String, dynamic>.from(row))
      .toList();
}

class AiNarrative {
  AiNarrative({required this.headline, required this.bullets});

  factory AiNarrative.fromJson(Map<String, dynamic>? json) {
    final bullets = (json?['bullets'] as List?)
            ?.map((b) => b.toString())
            .toList() ??
        const <String>[];
    return AiNarrative(
      headline: json?['headline']?.toString() ?? 'AI summary',
      bullets: bullets,
    );
  }

  final String headline;
  final List<String> bullets;
}

class AiChatTable {
  AiChatTable({required this.headers, required this.rows});

  final List<String> headers;
  final List<List<String>> rows;
}

class AiChatChart {
  AiChatChart({
    required this.type,
    required this.title,
    required this.data,
  });

  final String type;
  final String title;
  final List<({String name, double value})> data;
}

class AiChatMetric {
  AiChatMetric({
    required this.label,
    required this.value,
    this.trend,
  });

  final String label;
  final String value;
  final String? trend;
}

class AiChatResult {
  AiChatResult({
    required this.answer,
    required this.language,
    required this.bullets,
    required this.metrics,
    required this.suggestions,
    required this.entityMatches,
    this.table,
    this.chart,
    this.grammarFixed,
    this.noMatch = false,
    this.error = false,
    this.question,
    this.rowCount,
    this.companyScoped = false,
    this.lastUpdated,
  });

  factory AiChatResult.fromJson(Map<String, dynamic> json, {String? question}) {
    final table = _tableFrom(json);
    final chart = _chartFrom(json);
    final metrics = _metricsFrom(json);
    final source = asMap(json['source']);
    return AiChatResult(
      answer: json['answer']?.toString() ?? '',
      language: json['language']?.toString() ?? 'en',
      bullets: (json['bullets'] as List?)?.map((b) => b.toString()).toList() ??
          const [],
      metrics: metrics,
      suggestions:
          (json['suggestions'] as List?)?.map((b) => b.toString()).toList() ??
              const [],
      entityMatches: asMapList(json['entityMatches']),
      table: table,
      chart: chart,
      grammarFixed: json['grammarFixed']?.toString(),
      noMatch: json['noMatch'] == true,
      error: json['error'] == true,
      question: question ?? json['question']?.toString(),
      rowCount: parseServerInt(json['rowCount']),
      companyScoped: source['companyScoped'] == true,
      lastUpdated: source['lastUpdated']?.toString(),
    );
  }

  final String answer;
  final String language;
  final List<String> bullets;
  final List<AiChatMetric> metrics;
  final List<String> suggestions;
  final List<Map<String, dynamic>> entityMatches;
  final AiChatTable? table;
  final AiChatChart? chart;
  final String? grammarFixed;
  final bool noMatch;
  final bool error;
  final String? question;
  final int rowCount;
  final bool companyScoped;
  final String? lastUpdated;
}

AiChatTable? _tableFrom(Map<String, dynamic> chat) {
  final table = asMap(chat['table']);
  final headersRaw = table['headers'];
  final rowsRaw = table['rows'];
  if (headersRaw is List && rowsRaw is List && headersRaw.isNotEmpty) {
    return AiChatTable(
      headers: headersRaw.map((h) => h.toString()).toList(),
      rows: rowsRaw.map((row) {
        final cells = row is List ? row : (row is Map ? row.values.toList() : [row]);
        return cells.map((c) => c?.toString() ?? '').toList();
      }).toList(),
    );
  }
  final rows = asMapList(chat['rows']);
  if (rows.isEmpty) return null;
  final headers = rows.first.keys.take(8).map((k) => k.toString()).toList();
  return AiChatTable(
    headers: headers,
    rows: rows
        .take(50)
        .map(
          (row) => headers
              .map((h) => row[h]?.toString() ?? '')
              .toList(),
        )
        .toList(),
  );
}

AiChatChart? _chartFrom(Map<String, dynamic> chat) {
  final chart = asMap(chat['chart']);
  final dataRaw = chart['data'];
  if (dataRaw is List && dataRaw.isNotEmpty) {
    final data = dataRaw
        .whereType<Map>()
        .map(
          (row) => (
            name: row['name']?.toString() ?? '',
            value: parseServerNum(row['value']),
          ),
        )
        .where((d) => d.name.isNotEmpty)
        .toList();
    if (data.isEmpty) return null;
    return AiChatChart(
      type: chart['type']?.toString() ?? 'bar',
      title: chart['title']?.toString() ?? '',
      data: data,
    );
  }
  final rows = asMapList(chat['rows']);
  if (rows.length < 2) return null;
  final keys = rows.first.keys.map((k) => k.toString()).toList();
  final nameKey = keys.firstWhere(
    (k) => RegExp(r'name|label|product|warehouse|date|category|sku', caseSensitive: false)
        .hasMatch(k),
    orElse: () => keys.first,
  );
  final valueKey = keys.firstWhere(
    (k) =>
        k != nameKey &&
        RegExp(r'value|total|amount|revenue|qty|quantity|profit|count|sum',
                caseSensitive: false)
            .hasMatch(k),
    orElse: () => keys.firstWhere((k) => k != nameKey, orElse: () => ''),
  );
  if (valueKey.isEmpty) return null;
  final data = rows
      .take(12)
      .map(
        (row) => (
          name: row[nameKey]?.toString() ?? '',
          value: parseServerNum(row[valueKey]),
        ),
      )
      .toList();
  if (data.every((d) => d.value == 0)) return null;
  return AiChatChart(
    type: data.length > 6 ? 'bar' : 'pie',
    title: '',
    data: data,
  );
}

List<AiChatMetric> _metricsFrom(Map<String, dynamic> chat) {
  final metrics = chat['metrics'];
  if (metrics is List && metrics.isNotEmpty) {
    return metrics
        .whereType<Map>()
        .map(
          (m) => AiChatMetric(
            label: m['label']?.toString() ?? '',
            value: m['value']?.toString() ?? '',
            trend: m['trend']?.toString(),
          ),
        )
        .where((m) => m.label.isNotEmpty)
        .toList();
  }
  final keyNumbers = asMap(chat['keyNumbers']);
  return keyNumbers.entries
      .where((e) => e.value != null && '${e.value}'.isNotEmpty)
      .take(6)
      .map(
        (e) => AiChatMetric(
          label: e.key,
          value: e.value.toString(),
        ),
      )
      .toList();
}
