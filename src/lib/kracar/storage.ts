import "server-only";
import { coreDb } from "./db";
export interface ObjectStorage {
  put(input: {
    agencyId: string;
    ownerId: string;
    mime: string;
    name: string;
    bytes: Uint8Array;
    public: boolean;
  }): Promise<{ id: string }>;
  get(
    id: string,
  ): Promise<{
    agencyId: string;
    ownerId: string;
    mime: string;
    name: string;
    bytes: Uint8Array;
    public: boolean;
  } | null>;
}
// A durable database adapter for local/self-hosted operation. S3-compatible storage can implement the same boundary.
export const objectStorage: ObjectStorage = {
  async put(input) {
    return coreDb().storageObject.create({
      data: {
        agencyId: input.agencyId,
        ownerId: input.ownerId,
        mime: input.mime,
        name: input.name,
        data: new Uint8Array(input.bytes),
        public: input.public,
      },
    });
  },
  async get(id) {
    const o = await coreDb().storageObject.findUnique({ where: { id } });
    return o ? { ...o, bytes: o.data } : null;
  },
};
