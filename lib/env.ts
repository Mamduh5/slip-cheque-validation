export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Document Registry Checker",
  mongodbUri:
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/slip_cheque_validation",
  mongodbDb: process.env.MONGODB_DB ?? "slip_cheque_validation",
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "document-images"
  },
  upload: {
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? "10")
  }
};

export function isGoogleAuthConfigured() {
  return Boolean(appConfig.googleClientId && appConfig.googleClientSecret);
}
