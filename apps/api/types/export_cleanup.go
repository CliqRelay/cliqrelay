package types

type ExportCleanupResult struct {
	Scanned     int
	Skipped     int
	Deleted     int
	RowsDeleted int64
}
