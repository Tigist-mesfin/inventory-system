import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/ai_models.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../../../database/app_database.dart';
import '../services/ai_service.dart';

enum AiDeskTab { daily, monthly, insights, profit }

class AiMessage {
  AiMessage({
    required this.role,
    this.text = '',
    this.chat,
    this.clarifyCandidates = const [],
    this.isTyping = false,
  });

  final String role; // user | ai | clarify
  final String text;
  final AiChatResult? chat;
  final List<String> clarifyCandidates;
  final bool isTyping;
}

class AiProvider extends ChangeNotifier {
  AiProvider({
    required AiService aiService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _aiService = aiService,
        _cache = cache,
        _sync = sync;

  final AiService _aiService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  bool _asking = false;
  String? _error;
  String _warehouseId = '';
  AiDeskTab _tab = AiDeskTab.daily;
  Map<String, dynamic>? _dashboard;
  Map<String, dynamic>? _daily;
  Map<String, dynamic>? _monthly;
  Map<String, dynamic>? _insights;
  List<WarehousesCacheData> _warehouses = [];

  bool _smartClarify = true;
  final List<AiMessage> _messages = [];

  bool get loading => _loading;
  bool get busy => _busy;
  bool get asking => _asking;
  String? get error => _error;
  String get warehouseId => _warehouseId;
  AiDeskTab get tab => _tab;
  Map<String, dynamic>? get dashboard => _dashboard;
  Map<String, dynamic>? get daily => _daily;
  Map<String, dynamic>? get monthly => _monthly;
  Map<String, dynamic>? get insights => _insights;
  List<WarehousesCacheData> get warehouses => _warehouses;
  bool get smartClarify => _smartClarify;
  List<AiMessage> get messages => List.unmodifiable(_messages);

  Map<String, dynamic> get cards => asMap(_dashboard?['cards']);

  String moneyOrDash(dynamic value) {
    if (value == null) return '—';
    return money(value);
  }

  Future<void> bootstrapDesk() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'AI desk requires an online connection.';
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      try {
        await _sync.refreshCache();
      } catch (_) {}
      _warehouses = await _cache.getWarehouses();
      await refreshDesk();
    } catch (error) {
      _error = friendlyError(error);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> setWarehouse(String? id) async {
    _warehouseId = id ?? '';
    notifyListeners();
    await refreshDesk();
  }

  Future<void> setTab(AiDeskTab tab) async {
    _tab = tab;
    notifyListeners();
    await _loadTab();
  }

  Future<void> refreshDesk() async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _dashboard = await _aiService.fetchDashboard(
        warehouseId: _warehouseId.isEmpty ? null : _warehouseId,
      );
      await _loadTab();
    } catch (error) {
      _error = friendlyError(error);
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> _loadTab() async {
    final warehouseId = _warehouseId.isEmpty ? null : _warehouseId;
    try {
      switch (_tab) {
        case AiDeskTab.daily:
          _daily = await _aiService.fetchDailySummary(warehouseId: warehouseId);
          break;
        case AiDeskTab.monthly:
        case AiDeskTab.profit:
          _monthly =
              await _aiService.fetchMonthlySummary(warehouseId: warehouseId);
          break;
        case AiDeskTab.insights:
          _insights = await _aiService.fetchInsights(warehouseId: warehouseId);
          break;
      }
    } catch (error) {
      _error = friendlyError(error);
    }
    notifyListeners();
  }

  void setSmartClarify(bool value) {
    _smartClarify = value;
    notifyListeners();
  }

  void clearChat() {
    _messages.clear();
    notifyListeners();
  }

  Future<void> ask(String question, {bool skipClarify = false}) async {
    final q = question.trim();
    if (q.length < 2 || _asking) return;
    _asking = true;
    _error = null;
    _messages.add(AiMessage(role: 'user', text: q));
    _messages.add(AiMessage(role: 'ai', isTyping: true));
    notifyListeners();

    try {
      if (_smartClarify && !skipClarify) {
        final clarified = await _aiService.clarify(q);
        if (clarified.candidates.isNotEmpty) {
          _messages.removeWhere((m) => m.isTyping);
          _messages.add(
            AiMessage(
              role: 'clarify',
              text: clarified.grammarFixed ??
                  'Did you mean one of these?',
              clarifyCandidates: clarified.candidates,
            ),
          );
          return;
        }
      }

      final chat = await _aiService.chat(q);
      _messages.removeWhere((m) => m.isTyping);
      _messages.add(AiMessage(role: 'ai', chat: chat, text: chat.answer));
    } catch (error) {
      _messages.removeWhere((m) => m.isTyping);
      _messages.add(
        AiMessage(
          role: 'ai',
          text: friendlyError(error),
          chat: AiChatResult(
            answer: friendlyError(error),
            language: 'en',
            bullets: const [],
            metrics: const [],
            suggestions: const [],
            entityMatches: const [],
            error: true,
            question: q,
            rowCount: 0,
          ),
        ),
      );
    } finally {
      _asking = false;
      notifyListeners();
    }
  }

  Future<void> pickClarify(String candidate) =>
      ask(candidate, skipClarify: true);

  Future<void> regenerate(AiChatResult chat) async {
    final q = chat.question;
    if (q == null || q.isEmpty) return;
    await ask(q, skipClarify: true);
  }
}
