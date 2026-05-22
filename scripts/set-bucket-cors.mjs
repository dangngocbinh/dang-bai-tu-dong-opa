import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: true,
});

const corsConfig = {
  CORSRules: [
    {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

const res = await s3.send(
  new PutBucketCorsCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    CORSConfiguration: corsConfig,
  })
);

console.log("✓ CORS configured successfully", res.$metadata.httpStatusCode);
