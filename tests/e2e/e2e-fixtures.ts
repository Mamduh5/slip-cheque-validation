import { Client } from "minio";
import { MongoClient } from "mongodb";
import sharp from "sharp";
import type { DocumentRecord } from "../../lib/models";

export const e2eUserId = "e2e-user";
const mongodbUri = "mongodb://127.0.0.1:27017/slip_cheque_validation_e2e";
const mongodbDb = "slip_cheque_validation_e2e";
const minioBucket = "document-images-e2e";

export async function cleanupE2eArtifacts() {
  await cleanupMongoArtifacts();
  await cleanupMinioArtifacts();
}

export async function getE2eDocumentByFilename(filename: string) {
  const client = new MongoClient(mongodbUri);

  try {
    await client.connect();
    return await client
      .db(mongodbDb)
      .collection<DocumentRecord>("documents")
      .findOne({ userId: e2eUserId, originalFilename: filename });
  } finally {
    await client.close();
  }
}

export async function originalObjectExists(document: DocumentRecord) {
  const client = getMinioClient();

  try {
    await client.statObject(document.originalObject.bucket, document.originalObject.key);
    return true;
  } catch {
    return false;
  }
}

export async function createValidDocumentImage() {
  const overlay = Buffer.from(`
    <svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
      <rect x="80" y="70" width="1040" height="760" fill="white" stroke="black" stroke-width="18"/>
      <line x1="160" y1="190" x2="1040" y2="190" stroke="black" stroke-width="12"/>
      <line x1="160" y1="310" x2="1040" y2="310" stroke="black" stroke-width="10"/>
      <line x1="160" y1="430" x2="1040" y2="430" stroke="black" stroke-width="10"/>
      <line x1="160" y1="550" x2="760" y2="550" stroke="black" stroke-width="10"/>
      <rect x="860" y="610" width="180" height="90" fill="none" stroke="black" stroke-width="10"/>
    </svg>
  `);

  return sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 3,
      background: "rgb(245,245,245)"
    }
  })
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
}

async function cleanupMongoArtifacts() {
  const client = new MongoClient(mongodbUri);

  await withRetry(async () => {
    await client.connect();
  });

  try {
    const db = client.db(mongodbDb);
    await Promise.all([
      db.collection("documents").deleteMany({ userId: e2eUserId }),
      db.collection("audit_logs").deleteMany({ userId: e2eUserId }),
      db.collection("duplicate_review_pairs").deleteMany({ userId: e2eUserId })
    ]);
  } finally {
    await client.close();
  }
}

async function cleanupMinioArtifacts() {
  const client = getMinioClient();

  await withRetry(async () => {
    await client.bucketExists(minioBucket);
  });

  const exists = await client.bucketExists(minioBucket);

  if (!exists) {
    return;
  }

  const objects = await listObjectsWithPrefix(client, `documents/${e2eUserId}/`);

  if (objects.length > 0) {
    await client.removeObjects(minioBucket, objects);
  }
}

function getMinioClient() {
  return new Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin"
  });
}

function listObjectsWithPrefix(client: Client, prefix: string) {
  return new Promise<string[]>((resolve, reject) => {
    const objectNames: string[] = [];
    const stream = client.listObjectsV2(minioBucket, prefix, true);

    stream.on("data", (object) => {
      if (object.name) {
        objectNames.push(object.name);
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(objectNames));
  });
}

async function withRetry(callback: () => Promise<unknown>, attempts = 20) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError;
}
