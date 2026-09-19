package infra

import (
	"context"
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
)

type Infrastructure struct {
	Logger      *slog.Logger
	RedisClient *redis.Client
	S3Client    *s3.Client
	S3Bucket    string
}

func Init(envConfig *constants.EnvConfig) (*Infrastructure, error) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger)

	redisOpts, err := redis.ParseURL(envConfig.RedisURL)
	if err != nil {
		return nil, err
	}
	redisClient := redis.NewClient(redisOpts)

	ctx := context.Background()

	var awsCfg aws.Config
	if envConfig.S3AccessKeyID != "" {
		creds := credentials.NewStaticCredentialsProvider(envConfig.S3AccessKeyID, envConfig.S3SecretAccessKey, "")
		awsCfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(envConfig.S3Region), config.WithCredentialsProvider(creds))
	} else {
		awsCfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(envConfig.S3Region))
	}
	if err != nil {
		return nil, err
	}

	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if envConfig.S3Endpoint != "" {
			o.BaseEndpoint = aws.String(envConfig.S3Endpoint)
			o.UsePathStyle = true
		}
	})

	bucket := envConfig.S3Bucket
	if bucket != "" {
		_, err = s3Client.HeadBucket(ctx, &s3.HeadBucketInput{
			Bucket: aws.String(bucket),
		})
		if err != nil {
			_, err = s3Client.CreateBucket(ctx, &s3.CreateBucketInput{
				Bucket: aws.String(bucket),
			})
			if err != nil {
				return nil, err
			}
			slog.Info("Created S3 bucket", "bucket", bucket)
		} else {
			slog.Info("S3 bucket already exists", "bucket", bucket)
		}

		if envConfig.S3ManageBucketCORS {
			if err := applyBucketCORS(ctx, s3Client, bucket, envConfig.ClientURL); err != nil {
				return nil, err
			}
		}
	}

	return &Infrastructure{
		Logger:      logger,
		RedisClient: redisClient,
		S3Client:    s3Client,
		S3Bucket:    bucket,
	}, nil
}

// Browsers upload straight to presigned URLs, so the bucket must allow the web origin.
// Opt-in via S3_MANAGE_BUCKET_CORS: self-hosted S3 (Rustfs, MinIO) needs it, while
// platforms services like Supabase Storage has no PutBucketCors and already sends permissive CORS headers.
func applyBucketCORS(ctx context.Context, client *s3.Client, bucket, clientURL string) error {
	if clientURL == "" {
		return nil
	}

	_, err := client.PutBucketCors(ctx, &s3.PutBucketCorsInput{
		Bucket: aws.String(bucket),
		CORSConfiguration: &s3types.CORSConfiguration{
			CORSRules: []s3types.CORSRule{{
				AllowedOrigins: []string{clientURL},
				AllowedMethods: []string{"PUT", "GET", "HEAD"},
				AllowedHeaders: []string{"*"},
				MaxAgeSeconds:  aws.Int32(3600),
			}},
		},
	})
	if err != nil {
		return err
	}

	slog.Info("Applied S3 bucket CORS", "bucket", bucket, "origin", clientURL)
	return nil
}
