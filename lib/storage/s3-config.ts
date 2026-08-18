export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
}

export function getS3Config(): S3Config {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!accessKeyId?.trim() || !secretAccessKey?.trim() || !bucket?.trim()) {
    throw new Error("S3 storage is not configured. Set AWS credentials and AWS_S3_BUCKET.");
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: process.env.AWS_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
  };
}
