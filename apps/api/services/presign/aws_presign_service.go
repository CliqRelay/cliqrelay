package presign

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/CliqRelay/cliqrelay/interfaces"
)

type AWSPresignService struct {
	client *s3.PresignClient
	expiry time.Duration
}

func NewAWSPresignService(s3Client *s3.Client, expiry time.Duration) interfaces.PresignService {
	return &AWSPresignService{
		client: s3.NewPresignClient(s3Client),
		expiry: expiry,
	}
}

func (c *AWSPresignService) GetURL(ctx context.Context, bucket, key string) (string, error) {
	presignedURL, err := c.client.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(c.expiry))
	if err != nil {
		return "", fmt.Errorf("failed to presign get object: %w", err)
	}
	return presignedURL.URL, nil
}

func (c *AWSPresignService) PutURL(ctx context.Context, bucket, key, contentType string) (string, error) {
	presignedURL, err := c.client.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(c.expiry))
	if err != nil {
		return "", fmt.Errorf("failed to presign put object: %w", err)
	}
	return presignedURL.URL, nil
}
