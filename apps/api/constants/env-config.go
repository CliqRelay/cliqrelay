package constants

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type EnvConfig struct {
	RedisURL              string
	EventBusConsumerGroup string
	S3Endpoint            string
	S3Region              string
	S3AccessKeyID         string
	S3SecretAccessKey     string
	S3Bucket              string
	S3PresignedURLExpiry  string
	SMTPHost              string
	SMTPPort              string
	AuthulaBaseURL        string
	AuthulaSecret         string
	ClientURL             string
	ExtensionURL          string
	OpenAPISpecVersion    string
	DatabaseURL           string
	StandaloneMode        string
	BaseURL               string
	Port                  string
	GoEnvironment         string
	LogLevel              string
}

func LoadEnvConfig() *EnvConfig {
	env := os.Getenv("GO_ENV")

	// Only attempt to load .env files in local development.
	// Production configurations should be explicitly injected into the container environment.
	if env == "" || strings.ToLower(env) == "development" {
		if err := godotenv.Load(); err != nil {
			log.Println("Note: No .env file found, relying on system environment variables.")
		}
	}

	envConfig := &EnvConfig{
		RedisURL:              os.Getenv("REDIS_URL"),
		EventBusConsumerGroup: os.Getenv("EVENT_BUS_CONSUMER_GROUP"),
		S3Endpoint:            os.Getenv("S3_ENDPOINT"),
		S3Region:              defaultEnv("S3_REGION", "us-east-1"),
		S3AccessKeyID:         os.Getenv("S3_ACCESS_KEY_ID"),
		S3SecretAccessKey:     os.Getenv("S3_SECRET_ACCESS_KEY"),
		S3Bucket:              os.Getenv("S3_BUCKET"),
		S3PresignedURLExpiry:  defaultEnv("S3_PRESIGNED_URL_EXPIRY", "15m"),
		SMTPHost:              os.Getenv("SMTP_HOST"),
		SMTPPort:              os.Getenv("SMTP_PORT"),
		AuthulaBaseURL:        os.Getenv("AUTHULA_BASE_URL"),
		AuthulaSecret:         os.Getenv("AUTHULA_SECRET"),
		ClientURL:             os.Getenv("CLIENT_URL"),
		ExtensionURL:          os.Getenv("EXTENSION_URL"),
		OpenAPISpecVersion:    defaultEnv("OPENAPI_SPEC_VERSION", "0.1.0"),
		DatabaseURL:           os.Getenv("DATABASE_URL"),
		StandaloneMode:        defaultEnv("STANDALONE_MODE", "true"),
		BaseURL:               os.Getenv("BASE_URL"),
		Port:                  defaultEnv("PORT", "8080"),
		GoEnvironment:         defaultEnv("GO_ENV", "development"),
		LogLevel:              defaultEnv("LOG_LEVEL", "debug"),
	}

	return envConfig
}

func defaultEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
