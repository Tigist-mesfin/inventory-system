import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:cookie_jar/cookie_jar.dart';

import 'core/config/app_config.dart';
import 'core/services/token_storage.dart';
import 'core/theme/app_theme.dart';
import 'database/app_database.dart';
import 'modules/auth/providers/auth_provider.dart';
import 'modules/auth/screens/home_shell.dart';
import 'modules/auth/screens/login_screen.dart';
import 'modules/auth/services/auth_service.dart';
import 'modules/dashboard/providers/dashboard_provider.dart';
import 'modules/purchases/providers/purchase_provider.dart';
import 'modules/purchases/services/purchase_service.dart';
import 'modules/sales/providers/sales_provider.dart';
import 'modules/sales/services/sales_service.dart';
import 'modules/stock/providers/stock_provider.dart';
import 'modules/stock/services/stock_service.dart';
import 'modules/ledger/providers/ledger_provider.dart';
import 'modules/ledger/services/ledger_service.dart';
import 'modules/parties/providers/parties_provider.dart';
import 'modules/parties/services/parties_service.dart';
import 'modules/finance/providers/finance_provider.dart';
import 'modules/finance/providers/expenses_provider.dart';
import 'modules/finance/services/finance_service.dart';
import 'modules/catalog/providers/catalog_provider.dart';
import 'modules/catalog/services/catalog_service.dart';
import 'modules/team/providers/team_provider.dart';
import 'modules/team/services/team_service.dart';
import 'modules/warehouse/providers/warehouse_provider.dart';
import 'modules/warehouse/services/warehouse_service.dart';
import 'modules/transfers/providers/transfer_provider.dart';
import 'modules/transfers/services/transfer_service.dart';
import 'modules/settings/providers/payment_method_provider.dart';
import 'modules/settings/services/payment_method_service.dart';
import 'modules/settings/providers/company_profile_provider.dart';
import 'modules/settings/services/company_profile_service.dart';
import 'modules/ai/providers/ai_provider.dart';
import 'modules/ai/services/ai_service.dart';
import 'modules/sync/providers/sync_provider.dart';
import 'network/dio_client.dart';
import 'services/cache_service.dart';
import 'sync/connectivity_service.dart';
import 'sync/sync_manager.dart';
import 'widgets/loading/inventory_loading.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.load();

  final tokenStorage = TokenStorage();
  await tokenStorage.ensureBaseUrl(
    AppConfig.apiBaseUrl,
    force: !AppConfig.allowUrlOverride,
  );

  final appDir = await getApplicationDocumentsDirectory();
  final cookieJar = PersistCookieJar(
    storage: FileStorage(p.join(appDir.path, '.cookies')),
  );

  final dioClient = DioClient(
    tokenStorage: tokenStorage,
    cookieJar: cookieJar,
  );
  await dioClient.initBaseUrl();
  await dioClient.loadSession();

  final db = AppDatabase();
  final connectivity = ConnectivityService();
  final cacheService = CacheService(db: db, client: dioClient);
  final authService = AuthService(client: dioClient, tokenStorage: tokenStorage);
  const uuid = Uuid();
  final purchaseService = PurchaseService(
    db: db,
    client: dioClient,
    uuid: uuid,
  );
  final salesService = SalesService(
    db: db,
    client: dioClient,
    cacheService: cacheService,
    uuid: uuid,
  );
  final stockService = StockService(client: dioClient);
  final ledgerService = LedgerService(client: dioClient);
  final partiesService = PartiesService(client: dioClient);
  final financeService = FinanceService(client: dioClient);
  final catalogService = CatalogService(client: dioClient);
  final teamService = TeamService(client: dioClient);
  final warehouseService = WarehouseService(client: dioClient);
  final transferService = TransferService(client: dioClient);
  final paymentMethodService = PaymentMethodService(client: dioClient);
  final companyProfileService = CompanyProfileService(client: dioClient);
  final aiService = AiService(client: dioClient);
  final syncManager = SyncManager(
    db: db,
    connectivity: connectivity,
    purchaseService: purchaseService,
    salesService: salesService,
    cacheService: cacheService,
    client: dioClient,
  );

  runApp(
    InventoryApp(
      db: db,
      dioClient: dioClient,
      tokenStorage: tokenStorage,
      authService: authService,
      cacheService: cacheService,
      connectivity: connectivity,
      purchaseService: purchaseService,
      salesService: salesService,
      stockService: stockService,
      ledgerService: ledgerService,
      partiesService: partiesService,
      financeService: financeService,
      catalogService: catalogService,
      teamService: teamService,
      warehouseService: warehouseService,
      transferService: transferService,
      paymentMethodService: paymentMethodService,
      companyProfileService: companyProfileService,
      aiService: aiService,
      syncManager: syncManager,
    ),
  );
}

class InventoryApp extends StatelessWidget {
  const InventoryApp({
    super.key,
    required this.db,
    required this.dioClient,
    required this.tokenStorage,
    required this.authService,
    required this.cacheService,
    required this.connectivity,
    required this.purchaseService,
    required this.salesService,
    required this.stockService,
    required this.ledgerService,
    required this.partiesService,
    required this.financeService,
    required this.catalogService,
    required this.teamService,
    required this.warehouseService,
    required this.transferService,
    required this.paymentMethodService,
    required this.companyProfileService,
    required this.aiService,
    required this.syncManager,
  });

  final AppDatabase db;
  final DioClient dioClient;
  final TokenStorage tokenStorage;
  final AuthService authService;
  final CacheService cacheService;
  final ConnectivityService connectivity;
  final PurchaseService purchaseService;
  final SalesService salesService;
  final StockService stockService;
  final LedgerService ledgerService;
  final PartiesService partiesService;
  final FinanceService financeService;
  final CatalogService catalogService;
  final TeamService teamService;
  final WarehouseService warehouseService;
  final TransferService transferService;
  final PaymentMethodService paymentMethodService;
  final CompanyProfileService companyProfileService;
  final AiService aiService;
  final SyncManager syncManager;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider.value(value: db),
        Provider.value(value: dioClient),
        ChangeNotifierProvider(
          create: (_) => AuthProvider(
            authService: authService,
            client: dioClient,
          )..bootstrap(),
        ),
        ChangeNotifierProvider(
          create: (_) => SyncProvider(
            connectivity: connectivity,
            syncManager: syncManager,
            cacheService: cacheService,
            db: db,
            client: dioClient,
            tokenStorage: tokenStorage,
          ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, PurchaseProvider>(
          create: (context) => PurchaseProvider(
            purchaseService: purchaseService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              PurchaseProvider(
                purchaseService: purchaseService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, SalesProvider>(
          create: (context) => SalesProvider(
            salesService: salesService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              SalesProvider(
                salesService: salesService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, StockProvider>(
          create: (context) => StockProvider(
            stockService: stockService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              StockProvider(
                stockService: stockService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, LedgerProvider>(
          create: (context) => LedgerProvider(
            ledgerService: ledgerService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              LedgerProvider(
                ledgerService: ledgerService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, PartiesProvider>(
          create: (context) => PartiesProvider(
            partiesService: partiesService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              PartiesProvider(
                partiesService: partiesService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, DashboardProvider>(
          create: (context) => DashboardProvider(
            syncManager: syncManager,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              DashboardProvider(syncManager: syncManager, sync: sync),
        ),
        ChangeNotifierProxyProvider<SyncProvider, FinanceProvider>(
          create: (context) => FinanceProvider(
            financeService: financeService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              FinanceProvider(
                financeService: financeService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, ExpensesProvider>(
          create: (context) => ExpensesProvider(
            financeService: financeService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              ExpensesProvider(
                financeService: financeService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, OtherIncomeProvider>(
          create: (context) => OtherIncomeProvider(
            financeService: financeService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              OtherIncomeProvider(
                financeService: financeService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, VatProvider>(
          create: (context) => VatProvider(
            financeService: financeService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              VatProvider(
                financeService: financeService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, CatalogProvider>(
          create: (context) => CatalogProvider(
            catalogService: catalogService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              CatalogProvider(
                catalogService: catalogService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, TeamProvider>(
          create: (context) => TeamProvider(
            teamService: teamService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              TeamProvider(
                teamService: teamService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, WarehouseProvider>(
          create: (context) => WarehouseProvider(
            warehouseService: warehouseService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              WarehouseProvider(
                warehouseService: warehouseService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, TransferProvider>(
          create: (context) => TransferProvider(
            transferService: transferService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              TransferProvider(
                transferService: transferService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, PaymentMethodProvider>(
          create: (context) => PaymentMethodProvider(
            service: paymentMethodService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              PaymentMethodProvider(
                service: paymentMethodService,
                cache: cacheService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, CompanyProfileProvider>(
          create: (context) => CompanyProfileProvider(
            service: companyProfileService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              CompanyProfileProvider(
                service: companyProfileService,
                sync: sync,
              ),
        ),
        ChangeNotifierProxyProvider<SyncProvider, AiProvider>(
          create: (context) => AiProvider(
            aiService: aiService,
            cache: cacheService,
            sync: context.read<SyncProvider>(),
          ),
          update: (_, sync, previous) =>
              previous ??
              AiProvider(
                aiService: aiService,
                cache: cacheService,
                sync: sync,
              ),
        ),
      ],
      child: MaterialApp(
        title: 'Nigd Stock',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: const RootScreen(),
      ),
    );
  }
}

class RootScreen extends StatelessWidget {
  const RootScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.loading) {
          return const InventoryLoading(
            message: 'Loading inventory...',
            fullScreen: true,
          );
        }
        if (!auth.isAuthenticated) {
          return const LoginScreen();
        }
        return const HomeShell();
      },
    );
  }
}
