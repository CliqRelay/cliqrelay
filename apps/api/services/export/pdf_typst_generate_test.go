package export

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/tests"
)

// requireTypst skips the test when typst is unavailable locally, unless
// TYPST_REQUIRE=1 (CI), in which case the missing binary is a hard failure so
// the PDF pipeline can never silently lose coverage.
func requireTypst(t *testing.T) {
	t.Helper()

	if _, err := exec.LookPath("typst"); err != nil {
		if os.Getenv("TYPST_REQUIRE") == "1" {
			t.Fatalf("typst is required but was not found: %v", err)
		}
		t.Skip("typst not installed; skipping PDF generation test")
	}
}

func TestGeneratePDFWithTypst(t *testing.T) {
	t.Parallel()

	pngData := validPNG(t)
	jpegData := validJPEG(t)
	bucket := "test-bucket"
	ctx := context.Background()

	mediaStep := func() *models.Step {
		return &models.Step{
			ID:         uuid.New(),
			Type:       models.StepTypeInteraction,
			SortOrder:  "a",
			Action:     new(models.StepActionClick),
			ActionText: new("Click the button"),
			MediaAssets: []*models.MediaAsset{
				{StoragePath: "uploads/shot.png", MimeType: new("image/png")},
			},
		}
	}

	cases := []struct {
		name       string
		steps      []*models.Step
		opts       *PDFRenderOptions
		setup      func(*tests.MockStorageService)
		expectCall bool
	}{
		{
			name:  "default unbranded output",
			steps: testSteps(),
		},
		{
			name:  "accent colour and hidden watermark",
			steps: testSteps(),
			opts:  &PDFRenderOptions{AccentColor: "#00bcff", HideWatermark: true},
		},
		{
			name:  "custom png logo",
			steps: testSteps(),
			opts:  &PDFRenderOptions{Logo: pngData},
		},
		{
			name:  "custom jpeg logo",
			steps: testSteps(),
			opts:  &PDFRenderOptions{Logo: jpegData},
		},
		{
			name: "mixed interaction and canvas steps",
			steps: []*models.Step{
				{
					ID:        uuid.New(),
					Type:      models.StepTypeCanvas,
					SortOrder: "a",
					CanvasContent: &models.StepCanvasContent{
						Type:        models.StepCanvasTypeHeader,
						HeadingText: new("Section"),
					},
				},
				{
					ID:        uuid.New(),
					Type:      models.StepTypeCanvas,
					SortOrder: "b",
					CanvasContent: &models.StepCanvasContent{
						Type:        models.StepCanvasTypeCallout,
						HeadingText: new("Note"),
						BodyText:    new("Remember this"),
					},
				},
				{
					ID:            uuid.New(),
					Type:          models.StepTypeInteraction,
					SortOrder:     "c",
					Action:        new(models.StepActionClick),
					ActionText:    new("Click here"),
					Notes:         new("Explained in the tooltip"),
					TargetElement: map[string]any{"click_x": 10, "click_y": 20, "viewport_width": 800, "viewport_height": 600},
					MediaAssets: []*models.MediaAsset{
						{StoragePath: "uploads/shot.png", MimeType: new("image/png")},
					},
				},
			},
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, bucket, "uploads/shot.png").
					Return(io.NopCloser(bytes.NewReader(pngData)), nil).
					Once()
			},
			expectCall: true,
		},
		{
			name:  "step with media downloads the image",
			steps: []*models.Step{mediaStep()},
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, bucket, "uploads/shot.png").
					Return(io.NopCloser(bytes.NewReader(pngData)), nil).
					Once()
			},
			expectCall: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			requireTypst(t)
			t.Parallel()

			// Arrange
			mockStorage := new(tests.MockStorageService)
			if tt.setup != nil {
				tt.setup(mockStorage)
			}

			// Act
			pdf, err := GeneratePDFWithTypst(ctx, testGuide(), tt.steps, mockStorage, bucket, tt.opts)

			// Assert
			require.NoError(t, err)
			require.NotEmpty(t, pdf)
			assert.True(t, bytes.HasPrefix(pdf, []byte("%PDF-")), "output should be a PDF document")

			if tt.expectCall {
				mockStorage.AssertExpectations(t)
			}
		})
	}
}

func TestGeneratePDFWithTypst_CleansUpTempDir(t *testing.T) {
	requireTypst(t)

	// Arrange
	tmpDir := t.TempDir()
	t.Setenv("TMPDIR", tmpDir)

	// Act
	_, err := GeneratePDFWithTypst(context.Background(), testGuide(), testSteps(), new(tests.MockStorageService), "bucket", nil)

	// Assert
	require.NoError(t, err)

	entries, readErr := os.ReadDir(tmpDir)
	require.NoError(t, readErr)
	assert.Empty(t, entries, "temp dir should be removed after generation")
}

func TestGeneratePDFWithTypst_MediaFailures(t *testing.T) {
	t.Parallel()

	bucket := "test-bucket"
	ctx := context.Background()

	steps := func() []*models.Step {
		return []*models.Step{
			{
				ID:          uuid.New(),
				Type:        models.StepTypeInteraction,
				Action:      new(models.StepActionClick),
				MediaAssets: []*models.MediaAsset{{StoragePath: "uploads/shot.png"}},
			},
		}
	}

	cases := []struct {
		name    string
		setup   func(*tests.MockStorageService)
		wantErr string
	}{
		{
			name: "download error",
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, bucket, "uploads/shot.png").
					Return(io.NopCloser(bytes.NewReader(nil)), assert.AnError).
					Once()
			},
			wantErr: "download media",
		},
		{
			name: "empty download",
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, bucket, "uploads/shot.png").
					Return(io.NopCloser(bytes.NewReader(nil)), nil).
					Once()
			},
			wantErr: "is empty",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			mockStorage := new(tests.MockStorageService)
			tt.setup(mockStorage)

			// Act
			_, err := GeneratePDFWithTypst(ctx, testGuide(), steps(), mockStorage, bucket, nil)

			// Assert
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantErr)
			mockStorage.AssertExpectations(t)
		})
	}
}

func TestGeneratePDFWithTypst_TypstUnavailable(t *testing.T) {
	// t.Setenv cannot be combined with t.Parallel.
	t.Setenv("PATH", "")

	// Act
	_, err := GeneratePDFWithTypst(context.Background(), testGuide(), testSteps(), new(tests.MockStorageService), "bucket", nil)

	// Assert
	require.Error(t, err)
	assert.Contains(t, err.Error(), "typst compile failed")
}
