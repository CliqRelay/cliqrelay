package media_assets_test

import (
	"os"
	"testing"

	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/tests"
)

var testDB *bun.DB

func TestMain(m *testing.M) {
	db, cleanup, err := tests.SetupTestSchema("media_assets")
	if err != nil {
		os.Exit(1)
	}
	testDB = db
	code := m.Run()
	cleanup()
	os.Exit(code)
}
