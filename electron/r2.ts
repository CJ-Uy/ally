import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

export type R2ListOptions = {
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  limit?: number;
};

export type R2ListResult = {
  objects: Array<{
    key: string;
    size: number;
    etag?: string;
    uploaded?: Date;
  }>;
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
};

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName: string;
};

type R2ClientState = {
  client: S3Client;
  bucketName: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type R2PutBody = string | Uint8Array | ArrayBuffer | Blob | Readable;

function getR2Config(): R2Config {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
    throw new Error(
      "CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_ENDPOINT, and CLOUDFLARE_R2_BUCKET_NAME env vars must be set",
    );
  }

  return { accessKeyId, secretAccessKey, endpoint, bucketName };
}

function getClientState(): R2ClientState {
  const globalForR2 = globalThis as unknown as {
    r2Client: R2ClientState | undefined;
  };

  if (!globalForR2.r2Client) {
    const config = getR2Config();
    globalForR2.r2Client = {
      client: new S3Client({
        region: "auto",
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: true,
      }),
      bucketName: config.bucketName,
    };
  }

  return globalForR2.r2Client;
}

async function readableToArrayBuffer(stream: Readable): Promise<ArrayBuffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const buffer = Buffer.concat(chunks);
  return bufferToArrayBuffer(buffer);
}

function bufferToArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

async function toArrayBuffer(body: unknown): Promise<ArrayBuffer> {
  if (!body) return new ArrayBuffer(0);
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body)) {
    return bufferToArrayBuffer(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
    );
  }
  if (typeof body === "string") return textEncoder.encode(body).buffer;
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return body.arrayBuffer();
  }
  if (body instanceof Readable) return readableToArrayBuffer(body);
  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
    return new Response(body).arrayBuffer();
  }

  throw new Error("Unsupported R2 body type from S3 client");
}

function toPutBody(value: R2PutBody): PutObjectCommandInput["Body"] {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  return value;
}

export const r2 = {
  async getText(key: string): Promise<string> {
    const { client, bucketName } = getClientState();
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );

    const buffer = await toArrayBuffer(result.Body);
    return textDecoder.decode(buffer);
  },

  async getArrayBuffer(key: string): Promise<ArrayBuffer> {
    const { client, bucketName } = getClientState();
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );

    return toArrayBuffer(result.Body);
  },

  async put(
    key: string,
    value: R2PutBody,
    contentType?: string,
  ) {
    const { client, bucketName } = getClientState();
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: toPutBody(value),
        ContentType: contentType,
      }),
    );
  },

  async delete(keys: string | string[]) {
    const { client, bucketName } = getClientState();

    if (Array.isArray(keys)) {
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: keys.map((key) => ({ Key: key })) },
        }),
      );
    } else {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucketName, Key: keys }),
      );
    }
  },

  async list(options?: R2ListOptions): Promise<R2ListResult> {
    const { client, bucketName } = getClientState();
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: options?.prefix,
        Delimiter: options?.delimiter,
        ContinuationToken: options?.cursor,
        MaxKeys: options?.limit,
      }),
    );

    const objects = (result.Contents ?? []).map((item) => ({
      key: item.Key ?? "",
      size: item.Size ?? 0,
      etag: item.ETag,
      uploaded: item.LastModified,
    }));

    const delimitedPrefixes = (result.CommonPrefixes ?? [])
      .map((item) => item.Prefix ?? "")
      .filter((prefix) => prefix.length > 0);

    return {
      objects,
      truncated: Boolean(result.IsTruncated),
      cursor: result.NextContinuationToken,
      delimitedPrefixes,
    };
  },
};
