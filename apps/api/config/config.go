package config

import (
	"log/slog"

	"github.com/Authula/authula"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/openapi"
)

type AppConfig struct {
	EnvConfig       *constants.EnvConfig
	DB              bun.IDB
	RedisClient     *redis.Client
	AuthulaInstance *authula.Auth
	Logger          *slog.Logger
	OpenAPIService  openapi.OpenAPIService
	BasePath        string
	S3Client        *s3.Client
	S3Bucket        string
}
