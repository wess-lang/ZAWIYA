import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

import '../config.dart';

/// Thrown for any non-2xx API response, carrying the server's own
/// `{ error: "..." }` message (set by every route in src/app/api/**)
/// when present.
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Thin wrapper around Dio that:
/// - persists the ZAWIYA session cookie (httpOnly, set by
///   POST /api/auth/login) across app restarts via a cookie jar on disk —
///   the same session mechanism the web app uses, just driven by a
///   native HTTP client instead of a browser.
/// - normalizes error bodies into [ApiException].
class ApiClient {
  ApiClient._(this._dio, this._cookieJar);

  final Dio _dio;
  final PersistCookieJar _cookieJar;

  static ApiClient? _instance;

  static Future<ApiClient> instance() async {
    if (_instance != null) return _instance!;
    final dir = await getApplicationSupportDirectory();
    final jar = PersistCookieJar(storage: FileStorage('${dir.path}/.cookies'));
    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      validateStatus: (_) => true,
    ));
    dio.interceptors.add(CookieManager(jar));
    _instance = ApiClient._(dio, jar);
    return _instance!;
  }

  Future<void> clearSession() => _cookieJar.deleteAll();

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final clean = path.startsWith('/') ? path : '/$path';
    return Uri.parse('${AppConfig.apiBase}$clean').replace(
      queryParameters: query?.map((k, v) => MapEntry(k, v?.toString())),
    );
  }

  dynamic _unwrap(Response res) {
    final data = res.data;
    if (res.statusCode != null && res.statusCode! >= 200 && res.statusCode! < 300) {
      return data;
    }
    String message = 'Request failed (${res.statusCode}).';
    if (data is Map && data['error'] is String) message = data['error'] as String;
    throw ApiException(message, statusCode: res.statusCode);
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.getUri(_uri(path, query));
      return _unwrap(res);
    } on DioException catch (e) {
      throw _fromDioError(e);
    }
  }

  Future<dynamic> post(String path, {Object? body}) async {
    try {
      final res = await _dio.postUri(_uri(path), data: body,
          options: Options(contentType: 'application/json'));
      return _unwrap(res);
    } on DioException catch (e) {
      throw _fromDioError(e);
    }
  }

  Future<dynamic> put(String path, {Object? body}) async {
    try {
      final res = await _dio.putUri(_uri(path), data: body,
          options: Options(contentType: 'application/json'));
      return _unwrap(res);
    } on DioException catch (e) {
      throw _fromDioError(e);
    }
  }

  Future<dynamic> delete(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.deleteUri(_uri(path, query));
      return _unwrap(res);
    } on DioException catch (e) {
      throw _fromDioError(e);
    }
  }

  ApiException _fromDioError(DioException e) {
    if (e.response != null) {
      final data = e.response!.data;
      if (data is Map && data['error'] is String) {
        return ApiException(data['error'] as String, statusCode: e.response!.statusCode);
      }
    }
    return ApiException(
      "Couldn't reach the ZAWIYA server at ${AppConfig.origin}. "
      "Check the Server address in Account, and that `npm run dev` is running.",
    );
  }
}
