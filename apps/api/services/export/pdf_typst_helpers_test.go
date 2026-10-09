package export

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/tests"
)

// validPNG returns a real, decodable PNG so Typst can render it. Magic-byte
// fixtures are not enough for the template, which actually draws the image.
func validPNG(t *testing.T) []byte {
	t.Helper()

	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	require.NoError(t, png.Encode(&buf, img))

	return buf.Bytes()
}

// validJPEG returns a real, decodable JPEG for the same reason as validPNG.
func validJPEG(t *testing.T) []byte {
	t.Helper()

	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	require.NoError(t, jpeg.Encode(&buf, img, nil))

	return buf.Bytes()
}

func TestFormatDuration(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		seconds int
		want    string
	}{
		{name: "zero", seconds: 0, want: "0s"},
		{name: "negative", seconds: -30, want: "0s"},
		{name: "seconds only", seconds: 45, want: "45s"},
		{name: "exactly one minute", seconds: 60, want: "1m"},
		{name: "minutes and seconds", seconds: 90, want: "1m 30s"},
		{name: "large value", seconds: 3600, want: "60m"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got := formatDuration(tt.seconds)

			// Assert
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestToFloat64(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		input  any
		want   float64
		wantOK bool
	}{
		{name: "float64", input: float64(1.5), want: 1.5, wantOK: true},
		{name: "int", input: 3, want: 3, wantOK: true},
		{name: "string is invalid", input: "1.5", want: 0, wantOK: false},
		{name: "nil is invalid", input: nil, want: 0, wantOK: false},
		{name: "bool is invalid", input: true, want: 0, wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got, ok := toFloat64(tt.input)

			// Assert
			assert.Equal(t, tt.wantOK, ok)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestCanvasContentToTypst(t *testing.T) {
	t.Parallel()

	heading := "Heads up"
	body := "Some body copy"

	tests := []struct {
		name string
		cc   *models.StepCanvasContent
		want *typstInputCanvasContent
	}{
		{name: "nil", cc: nil, want: nil},
		{
			name: "all fields set",
			cc: &models.StepCanvasContent{
				Type:        models.StepCanvasTypeCallout,
				HeadingText: &heading,
				BodyText:    &body,
			},
			want: &typstInputCanvasContent{
				Type:        string(models.StepCanvasTypeCallout),
				HeadingText: &heading,
				BodyText:    &body,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got := canvasContentToTypst(tt.cc)

			// Assert
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMapToTargetElement(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		m    map[string]any
		want *typstInputTargetElement
	}{
		{name: "nil", m: nil, want: nil},
		{name: "empty map yields zero struct", m: map[string]any{}, want: &typstInputTargetElement{}},
		{
			name: "float64 values are truncated to int",
			m: map[string]any{
				"click_x":         float64(10.9),
				"click_y":         float64(20.1),
				"viewport_width":  float64(1280),
				"viewport_height": float64(720),
			},
			want: &typstInputTargetElement{
				ClickX:         new(10),
				ClickY:         new(20),
				ViewportWidth:  new(1280),
				ViewportHeight: new(720),
			},
		},
		{
			name: "int values are supported",
			m: map[string]any{
				"click_x": 5,
				"click_y": 6,
			},
			want: &typstInputTargetElement{
				ClickX: new(5),
				ClickY: new(6),
			},
		},
		{
			name: "missing keys stay nil",
			m:    map[string]any{"click_x": 1},
			want: &typstInputTargetElement{ClickX: new(1)},
		},
		{
			name: "wrong types are ignored",
			m: map[string]any{
				"click_x":         "nope",
				"click_y":         true,
				"viewport_width":  nil,
				"viewport_height": []int{1},
			},
			want: &typstInputTargetElement{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got := mapToTargetElement(tt.m)

			// Assert
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestSafeStringPtr(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input *string
		want  string
	}{
		{name: "nil", input: nil, want: ""},
		{name: "non-nil", input: new("value"), want: "value"},
		{name: "empty string", input: new(""), want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got := safeStringPtr(tt.input)

			// Assert
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestDetectImageExt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		data []byte
		want string
	}{
		{name: "png", data: pngMagic, want: "png"},
		{name: "jpeg three byte prefix", data: jpegMagic, want: "jpg"},
		{name: "jpeg jfif app0 marker", data: jfifMagic, want: "jpg"},
		{name: "gif", data: gifMagic, want: "gif"},
		{name: "webp", data: webpMagic, want: "webp"},
		{name: "nil defaults to png", data: nil, want: "png"},
		{name: "empty defaults to png", data: []byte{}, want: "png"},
		{name: "short prefix defaults to png", data: []byte{0x89, 0x50}, want: "png"},
		{name: "unknown defaults to png", data: []byte("not-an-image"), want: "png"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got := detectImageExt(tt.data)

			// Assert
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestWriteMediaFiles(t *testing.T) {
	t.Parallel()

	pngData := validPNG(t)
	ctx := context.Background()

	stepWithMedia := func() *models.Step {
		return &models.Step{
			ID:   uuid.New(),
			Type: models.StepTypeInteraction,
			MediaAssets: []*models.MediaAsset{
				{
					ID:          uuid.New(),
					StoragePath: "uploads/screenshot.png",
					MimeType:    new("image/png"),
					Width:       new(100),
					Height:      new(200),
					AltText:     new("a screenshot"),
				},
			},
		}
	}

	cases := []struct {
		name       string
		steps      []*models.Step
		setup      func(*tests.MockStorageService)
		wantErr    string
		wantFile   string
		wantNoFile bool
	}{
		{
			name:  "downloads and writes media",
			steps: []*models.Step{stepWithMedia()},
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, "bucket", "uploads/screenshot.png").
					Return(io.NopCloser(bytes.NewReader(pngData)), nil).
					Once()
			},
			wantFile: "step-0.png",
		},
		{
			name:  "empty download is an error",
			steps: []*models.Step{stepWithMedia()},
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, "bucket", "uploads/screenshot.png").
					Return(io.NopCloser(bytes.NewReader(nil)), nil).
					Once()
			},
			wantErr: "is empty",
		},
		{
			name:  "download error propagates",
			steps: []*models.Step{stepWithMedia()},
			setup: func(m *tests.MockStorageService) {
				m.On("GetObject", mock.Anything, "bucket", "uploads/screenshot.png").
					Return(io.NopCloser(bytes.NewReader(nil)), assert.AnError).
					Once()
			},
			wantErr: "download media",
		},
		{
			name:       "steps without media are skipped",
			steps:      []*models.Step{{ID: uuid.New(), Type: models.StepTypeInteraction}},
			setup:      func(*tests.MockStorageService) {},
			wantNoFile: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			mockStorage := new(tests.MockStorageService)
			tt.setup(mockStorage)
			tmpDir := t.TempDir()
			input := buildTypstInput(testGuide(), tt.steps, nil)

			// Act
			err := writeMediaFiles(ctx, mockStorage, "bucket", tmpDir, tt.steps, &input)

			// Assert
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				mockStorage.AssertExpectations(t)
				return
			}

			require.NoError(t, err)
			mockStorage.AssertExpectations(t)

			if tt.wantNoFile {
				entries, readErr := os.ReadDir(tmpDir)
				require.NoError(t, readErr)
				assert.Empty(t, entries)
				assert.Nil(t, input.Steps[0].Media)
				return
			}

			written, readErr := os.ReadFile(filepath.Join(tmpDir, tt.wantFile))
			require.NoError(t, readErr)
			assert.Equal(t, pngData, written)

			require.NotNil(t, input.Steps[0].Media)
			assert.Equal(t, tt.wantFile, input.Steps[0].Media.FileName)
			assert.Equal(t, "image/png", input.Steps[0].Media.MimeType)
			assert.Equal(t, 100, *input.Steps[0].Media.Width)
			assert.Equal(t, 200, *input.Steps[0].Media.Height)
			assert.Equal(t, "a screenshot", *input.Steps[0].Media.AltText)
		})
	}
}
