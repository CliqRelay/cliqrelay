package types

import "time"

type StorageObject struct {
	Key          string
	LastModified time.Time
}
