import 'package:flutter/material.dart';

/// Avoids DropdownButton assertion when [value] is not in [items].
class FormDropdownField<T> extends StatelessWidget {
  const FormDropdownField({
    super.key,
    required this.label,
    required this.items,
    this.value,
    this.hint,
    this.onChanged,
  });

  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final String? hint;
  final ValueChanged<T?>? onChanged;

  T? get _safeValue {
    if (value == null || items.isEmpty) return null;
    for (final item in items) {
      if (item.value == value) return value;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          hintText: hint ?? 'No options available',
        ),
        child: Text(
          hint ?? 'No options available',
          style: TextStyle(color: Theme.of(context).hintColor),
        ),
      );
    }

    return DropdownButtonFormField<T>(
      value: _safeValue,
      decoration: InputDecoration(labelText: label),
      items: items,
      onChanged: onChanged,
    );
  }
}

const kDefaultPaymentMethods = ['CASH', 'CREDIT', 'BANK_TRANSFER'];
