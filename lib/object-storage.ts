import { Client } from "minio";
import { appConfig } from "@/lib/env";

const minioClient = new Client({
  endPoint: appConfig.minio.endpoint,
  port: appConfig.minio.port,
  useSSL: appConfig.minio.useSSL,
  accessKey: appConfig.minio.accessKey,
  secretKey: appConfig.minio.secretKey
});

export async function ensureDocumentBucket() {
  const bucket = appConfig.minio.bucket;
  const exists = await minioClient.bucketExists(bucket);

  if (!exists) {
    await minioClient.makeBucket(bucket);
  }

  return bucket;
}

export async function putOriginalDocumentObject(input: {
  objectKey: string;
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
}) {
  const bucket = await ensureDocumentBucket();

  await minioClient.putObject(bucket, input.objectKey, input.buffer, input.buffer.length, {
    "Content-Type": input.mimeType,
    "X-Original-Filename": input.originalFilename
  });

  return {
    bucket,
    key: input.objectKey
  };
}

export function getOriginalDocumentObject(bucket: string, key: string) {
  return minioClient.getObject(bucket, key);
}
