export interface UploadOptions {
  folder?: string;
  contentType: string;
  /** When set, the object is stored at this exact key instead of auto-generating one. */
  key?: string;
}

export interface StorageResult {
  url: string;
  key: string;
}

export interface StorageService {
  upload(
    file: Buffer | Blob,
    filename: string,
    options: UploadOptions,
  ): Promise<StorageResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  readFile(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}
