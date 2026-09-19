package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type S3StorageService struct {
	client *s3.Client
}

func NewS3StorageService(s3Client *s3.Client) interfaces.StorageService {
	return &S3StorageService{client: s3Client}
}

func (s *S3StorageService) GetObject(ctx context.Context, bucket string, key string) (io.ReadCloser, error) {
	output, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, fmt.Errorf("s3 get object: %w", err)
	}
	return output.Body, nil
}

func (s *S3StorageService) PutObject(ctx context.Context, bucket string, key string, body io.Reader, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &key,
		Body:        body,
		ContentType: &contentType,
	})
	return err
}

func (s *S3StorageService) DeleteObject(ctx context.Context, bucket string, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	return err
}

func (s *S3StorageService) CopyObject(ctx context.Context, bucket string, sourceKey string, destinationKey string) error {
	_, err := s.client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     &bucket,
		CopySource: aws.String(fmt.Sprintf("%s/%s", bucket, sourceKey)),
		Key:        &destinationKey,
	})
	return err
}

func (s *S3StorageService) DeleteObjects(ctx context.Context, bucket string, keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	objectIdentifiers := make([]s3types.ObjectIdentifier, len(keys))
	for i, key := range keys {
		objectIdentifiers[i] = s3types.ObjectIdentifier{Key: aws.String(key)}
	}

	_, err := s.client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
		Bucket: &bucket,
		Delete: &s3types.Delete{
			Objects: objectIdentifiers,
			Quiet:   aws.Bool(true),
		},
	})
	return err
}

func (s *S3StorageService) DeleteObjectsByPrefix(ctx context.Context, bucket string, prefix string) error {
	return s.ListObjects(ctx, bucket, prefix, func(objects []types.StorageObject) error {
		keys := make([]string, len(objects))
		for i, obj := range objects {
			keys[i] = obj.Key
		}
		return s.DeleteObjects(ctx, bucket, keys)
	})
}

func (s *S3StorageService) ListObjects(ctx context.Context, bucket string, prefix string, visit func(objects []types.StorageObject) error) error {
	paginator := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &prefix,
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return err
		}

		if len(page.Contents) == 0 {
			continue
		}

		objects := make([]types.StorageObject, len(page.Contents))
		for i, obj := range page.Contents {
			objects[i] = types.StorageObject{Key: aws.ToString(obj.Key), LastModified: aws.ToTime(obj.LastModified)}
		}

		if err := visit(objects); err != nil {
			return err
		}
	}

	return nil
}
