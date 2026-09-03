/// Money / qty helpers aligned with the React client (`VAT_RATE` default 15%).
const double kVatRate = 15;

/// API DECIMAL fields often arrive as strings — never cast blindly to num.
double parseMoney(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0;
}

double vatOf(dynamic amount) =>
    double.parse(((parseMoney(amount) * kVatRate) / 100).toStringAsFixed(2));

double withVat(dynamic amount) {
  final base = parseMoney(amount);
  return double.parse((base + vatOf(base)).toStringAsFixed(2));
}

String money(dynamic value) => parseMoney(value).toStringAsFixed(2);

String moneyEtb(dynamic value) => '${money(value)} ETB';

String qty(dynamic value) {
  final amount = parseMoney(value);
  if (amount == amount.roundToDouble()) return amount.toInt().toString();
  return amount.toStringAsFixed(3).replaceFirst(RegExp(r'\.?0+$'), '');
}
