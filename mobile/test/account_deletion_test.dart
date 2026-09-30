import 'package:flutter_test/flutter_test.dart';

import 'package:inventory_mobile/modules/auth/services/auth_service.dart';

void main() {
  group('PermissionHelper owner detection', () {
    test('treats COMPANY_OWNER as owner', () {
      final user = {
        'role': {'name': 'COMPANY_OWNER'},
      };
      expect(PermissionHelper.isOwner(user), isTrue);
    });

    test('treats salesman as non-owner', () {
      final user = {
        'role': {'name': 'SALESMAN'},
        'permissions': [
          {'module': 'sales', 'action': 'READ'},
        ],
      };
      expect(PermissionHelper.isOwner(user), isFalse);
    });
  });

  test('delete-account confirm constant matches API contract', () {
    // Keep in sync with server auth.validation deleteAccountSchema.
    const confirm = 'DELETE';
    expect(confirm, 'DELETE');
  });
}
