package bootstrap

import (
	"testing"

	"github.com/CliqRelay/cliqrelay/infra"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/services/export"
)

type stubExportService struct {
	interfaces.ExportService
}

func TestResolveExportServiceUsesOverride(t *testing.T) {
	o := defaultOptions()
	o.apply(WithInfra(&infra.Infrastructure{}), WithExportService(stubExportService{}))

	repos := &interfaces.Repositories{}

	got := resolveExportService(o, repos, nil, nil)

	if _, ok := got.(stubExportService); !ok {
		t.Fatalf("expected overridden export service, got %T", got)
	}
}

func TestResolveExportServiceDefaultsWhenUnset(t *testing.T) {
	o := defaultOptions()
	o.apply(WithInfra(&infra.Infrastructure{}))

	repos := &interfaces.Repositories{}

	got := resolveExportService(o, repos, nil, nil)

	if _, ok := got.(*export.ExportService); !ok {
		t.Fatalf("expected default export service, got %T", got)
	}
}
