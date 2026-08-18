import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageService, StorageResult, UploadOptions } from "./types";
import { buildAssetUrl } from "./keys";
import { getS3Config } from "./s3-config";

function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    (async () => {
      try {
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        resolve(Buffer.concat(chunks));
      } catch (error) {
        reject(error);
      }
    })();
  });
}

export class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const config = getS3Config();
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint
        ? {
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
          }
        : {}),
    });
  }

  async upload(
    file: Buffer | Blob,
    filename: string,
    options: UploadOptions,
  ): Promise<StorageResult> {
    const key =
      options.key ??
      `${options.folder ?? "uploads"}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const buffer =
      file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType,
      }),
    );

    return { key, url: buildAssetUrl(key) };
  }

  async readFile(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    if (!response.Body) {
      throw new Error("S3 object body is empty.");
    }

    return streamToBuffer(response.Body as AsyncIterable<Uint8Array>);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return awsGetSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<{ contentType?: string; size?: number } | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        contentType: response.ContentType,
        size: response.ContentLength,
      };
    } catch {
      return null;
    }
  }
}

let s3StorageInstance: S3StorageService | null = null;

export function getS3Storage(): S3StorageService {
  if (!s3StorageInstance) {
    s3StorageInstance = new S3StorageService();
  }
  return s3StorageInstance;
}
