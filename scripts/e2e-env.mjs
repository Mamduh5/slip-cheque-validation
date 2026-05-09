import { execFile, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { Client as MinioClient } from "minio";
import { MongoClient } from "mongodb";

const execFileAsync = promisify(execFile);

const config = {
  appBaseUrl: process.env.E2E_APP_BASE_URL ?? "http://127.0.0.1:3100",
  e2eUserId: process.env.E2E_TEST_AUTH_USER_ID ?? "e2e-user",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/slip_cheque_validation_e2e",
  mongoDb: process.env.MONGODB_DB ?? "slip_cheque_validation_e2e",
  minioEndpoint: process.env.MINIO_ENDPOINT ?? "127.0.0.1",
  minioPort: Number(process.env.MINIO_PORT ?? "9000"),
  minioUseSsl: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  minioSecretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  minioBucket: process.env.MINIO_BUCKET ?? "document-images-e2e"
};

const command = process.argv[2] ?? "help";
const flags = new Set(process.argv.slice(3));

async function main() {
  switch (command) {
    case "bootstrap":
      await bootstrap();
      break;
    case "wait":
      await waitForReadiness({ includeApp: flags.has("--app") });
      break;
    case "cleanup":
      await cleanupArtifacts();
      break;
    case "diagnostics":
      await printDiagnostics();
      break;
    case "run":
      await runCiE2e();
      break;
    default:
      printUsage();
      process.exitCode = command === "help" ? 0 : 1;
  }
}

async function bootstrap() {
  console.log("[e2e] Starting Docker services: mongo, minio");
  await dockerCompose(["up", "-d", "mongo", "minio"]);
  await waitForReadiness({ includeApp: false });
}

async function waitForReadiness({ includeApp }) {
  const checks = [
    { name: "MongoDB", check: checkMongo },
    { name: "MinIO", check: checkMinio }
  ];

  if (includeApp) {
    checks.push({ name: "Next.js app health", check: checkAppHealth });
  }

  for (const { name, check } of checks) {
    await waitFor(name, check);
  }

  console.log(`[e2e] Ready: ${checks.map((check) => check.name).join(", ")}`);
}

async function cleanupArtifacts() {
  console.log(`[e2e] Cleaning test artifacts for ${config.e2eUserId}`);
  await Promise.all([cleanupMongoArtifacts(), cleanupMinioArtifacts()]);
  console.log("[e2e] Cleanup complete");
}

async function runCiE2e() {
  let exitCode = 1;

  try {
    exitCode = await runProcess(getNpxCommand(), ["playwright", "test"], {
      ...process.env,
      CI: process.env.CI ?? "true"
    });
  } finally {
    try {
      await cleanupArtifacts();
    } catch (error) {
      console.error("[e2e] Cleanup failed after Playwright run");
      console.error(error instanceof Error ? error.message : error);
      exitCode = exitCode || 1;
    }
  }

  process.exitCode = exitCode;
}

async function checkMongo() {
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 1_000 });

  try {
    await client.connect();
    await client.db(config.mongoDb).command({ ping: 1 });
  } finally {
    await client.close();
  }
}

async function checkMinio() {
  const client = getMinioClient();
  await client.listBuckets();
}

async function checkAppHealth() {
  const response = await fetch(`${config.appBaseUrl}/api/health`, {
    signal: AbortSignal.timeout(1_000)
  });

  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status}`);
  }

  const body = await response.json();

  if (!body.ok) {
    throw new Error(`Health endpoint reported not ok: ${JSON.stringify(body)}`);
  }
}

async function cleanupMongoArtifacts() {
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 2_000 });

  try {
    await client.connect();
    const db = client.db(config.mongoDb);
    await Promise.all([
      db.collection("documents").deleteMany({ userId: config.e2eUserId }),
      db.collection("audit_logs").deleteMany({ userId: config.e2eUserId }),
      db.collection("duplicate_review_pairs").deleteMany({ userId: config.e2eUserId })
    ]);
  } finally {
    await client.close();
  }
}

async function cleanupMinioArtifacts() {
  const client = getMinioClient();
  const exists = await client.bucketExists(config.minioBucket).catch(() => false);

  if (!exists) {
    return;
  }

  const objects = await listObjectsWithPrefix(client, `documents/${config.e2eUserId}/`);

  if (objects.length > 0) {
    await client.removeObjects(config.minioBucket, objects);
  }
}

async function waitFor(name, check, timeoutMs = 45_000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await check();
      console.log(`[e2e] ${name} ready`);
      return;
    } catch (error) {
      lastError = error;
      await delay(750);
    }
  }

  console.error(`[e2e] ${name} did not become ready within ${timeoutMs}ms`);
  console.error(lastError instanceof Error ? lastError.message : lastError);
  await printDiagnostics();
  throw new Error(`${name} readiness failed`);
}

async function printDiagnostics() {
  console.log("[e2e] Diagnostics");
  console.log(`[e2e] App health: ${config.appBaseUrl}/api/health`);
  console.log(`[e2e] MongoDB: ${config.mongoUri} db=${config.mongoDb}`);
  console.log(`[e2e] MinIO: ${config.minioEndpoint}:${config.minioPort} bucket=${config.minioBucket}`);

  await dockerCompose(["ps"]).catch((error) => {
    console.error("[e2e] docker compose ps failed");
    console.error(error instanceof Error ? error.message : error);
  });
}

async function dockerCompose(args) {
  const { stdout, stderr } = await execFileAsync("docker", ["compose", ...args], {
    maxBuffer: 1024 * 1024 * 4
  });

  if (stdout.trim()) {
    console.log(stdout.trim());
  }

  if (stderr.trim()) {
    console.error(stderr.trim());
  }
}

function getMinioClient() {
  return new MinioClient({
    endPoint: config.minioEndpoint,
    port: config.minioPort,
    useSSL: config.minioUseSsl,
    accessKey: config.minioAccessKey,
    secretKey: config.minioSecretKey
  });
}

function listObjectsWithPrefix(client, prefix) {
  return new Promise((resolve, reject) => {
    const objectNames = [];
    const stream = client.listObjectsV2(config.minioBucket, prefix, true);

    stream.on("data", (object) => {
      if (object.name) {
        objectNames.push(object.name);
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(objectNames));
  });
}

function runProcess(commandName, args, env) {
  return new Promise((resolve) => {
    const child = spawn(commandName, args, {
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    });

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
  });
}

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function printUsage() {
  console.log(`Usage: node scripts/e2e-env.mjs <command>

Commands:
  bootstrap     Start Docker services and wait for MongoDB and MinIO.
  wait [--app]  Wait for MongoDB, MinIO, and optionally the app health endpoint.
  cleanup       Remove MongoDB and MinIO artifacts for the deterministic E2E user.
  diagnostics   Print concise service diagnostics.
  run           Run Playwright in CI mode and clean artifacts afterward.
`);
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
