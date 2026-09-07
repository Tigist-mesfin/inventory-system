import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class CompanyProfile {
  CompanyProfile({
    this.id = '',
    this.name = '',
    this.address = '',
    this.phone = '',
    this.email = '',
    this.tin = '',
    this.vatRate,
  });

  factory CompanyProfile.fromJson(Map<String, dynamic>? json) {
    return CompanyProfile(
      id: json?['id']?.toString() ?? '',
      name: json?['name']?.toString() ?? '',
      address: json?['address']?.toString() ?? '',
      phone: json?['phone']?.toString() ?? '',
      email: json?['email']?.toString() ?? '',
      tin: json?['tin']?.toString() ?? '',
      vatRate: json?['vatRate'],
    );
  }

  final String id;
  final String name;
  final String address;
  final String phone;
  final String email;
  final String tin;
  final dynamic vatRate;
}

class CompanyProfileService {
  CompanyProfileService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<CompanyProfile> fetch() async {
    final response = await _client.get(ApiEndpoints.companyProfile);
    final company = response['data']?['company'];
    return CompanyProfile.fromJson(
      company is Map ? Map<String, dynamic>.from(company) : null,
    );
  }

  Future<CompanyProfile> update(Map<String, dynamic> body) async {
    final response = await _client.patch(
      ApiEndpoints.companyProfile,
      body: body,
    );
    final company = response['data']?['company'];
    return CompanyProfile.fromJson(
      company is Map ? Map<String, dynamic>.from(company) : null,
    );
  }
}
