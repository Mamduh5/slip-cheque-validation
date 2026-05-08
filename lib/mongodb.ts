import { MongoClient } from "mongodb";
import { appConfig } from "@/lib/env";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(appConfig.mongodbUri);
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

export async function getDb() {
  const mongoClient = await getClientPromise();
  return mongoClient.db(appConfig.mongodbDb);
}
