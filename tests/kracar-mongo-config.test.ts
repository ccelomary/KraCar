import assert from "node:assert/strict";
import { test } from "node:test";
import { rentalMongoUri } from "../src/lib/kracar/mongo-config";

test("rental MongoDB stays separate and preserves replica hosts and connection options", () => {
  assert.equal(
    rentalMongoUri({
      MONGODB_URI:
        "mongodb://host1:27017,host2:27017/marketplace?replicaSet=rs0&authSource=admin",
    }),
    "mongodb://host1:27017,host2:27017/kracar_core?replicaSet=rs0&authSource=admin",
  );
  assert.equal(
    rentalMongoUri({
      KRACAR_MONGODB_URI:
        "mongodb+srv://user:p%40ss@cluster.example/rentals?retryWrites=true",
    }),
    "mongodb+srv://user:p%40ss@cluster.example/rentals?retryWrites=true",
  );
  assert.equal(
    rentalMongoUri({
      MONGODB_URI: "mongodb://localhost",
      KRACAR_MONGODB_DB: "custom",
    }),
    "mongodb://localhost/custom",
  );
  assert.throws(() =>
    rentalMongoUri({ MONGODB_URI: "postgresql://localhost/old" }),
  );
});
