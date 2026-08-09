process.env.NODE_ENV =
  "test";
process.env.LOG_LEVEL =
  "silent";
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/vallecito_test";
process.env.FRONTEND_URL ??=
  "http://localhost:5173";
process.env.JWT_SECRET ??=
  "test-secret-with-more-than-thirty-two-characters";
process.env.GOOGLE_CLIENT_ID ??=
  "test-google-client-id-for-local-tests.apps.googleusercontent.com";
