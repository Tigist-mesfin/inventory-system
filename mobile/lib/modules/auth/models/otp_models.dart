class OtpChallenge {
  const OtpChallenge({
    required this.phone,
    this.purpose,
    this.expiresAt,
    this.status,
  });

  final String phone;
  final String? purpose;
  final DateTime? expiresAt;
  final String? status;

  factory OtpChallenge.fromJson(Map<String, dynamic> json) {
    final expiresRaw = json['expiresAt'];
    DateTime? expiresAt;
    if (expiresRaw != null) {
      expiresAt = DateTime.tryParse(expiresRaw.toString())?.toLocal();
    }
    return OtpChallenge(
      phone: (json['phone'] ?? '').toString(),
      purpose: json['purpose']?.toString(),
      expiresAt: expiresAt,
      status: json['status']?.toString(),
    );
  }
}

/// Shared OTP verification purposes matching backend `purpose` values.
enum OtpPurpose {
  registration,
  login,
  passwordReset,
}
