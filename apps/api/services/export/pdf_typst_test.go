package export

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
)

// Independent, real-world image headers. These intentionally mirror the
// production signatures so the tests fail if a signature regresses.
var (
	pngMagic  = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	jpegMagic = []byte{0xFF, 0xD8, 0xFF}
	jfifMagic = []byte{0xFF, 0xD8, 0xFF, 0xE0} // SOI + APP0, as written by JFIF encoders
	gifMagic  = []byte("GIF8")
	webpMagic = []byte("RIFF____WEBP")
)

func testGuide() *models.Guide {
	return &models.Guide{
		Title:           "Getting started",
		Description:     new("A guide"),
		DurationSeconds: 90,
		CreatedAt:       time.Date(2026, time.January, 2, 0, 0, 0, 0, time.UTC),
	}
}

func testSteps() []*models.Step {
	return []*models.Step{
		{Type: models.StepTypeInteraction, SortOrder: "a"},
		{Type: models.StepTypeCanvas, SortOrder: "b", CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeHeader}},
	}
}

func TestBuildTypstInput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		opts      *PDFRenderOptions
		wantTheme *typstInputTheme
	}{
		{
			name:      "nil options omit the theme",
			opts:      nil,
			wantTheme: nil,
		},
		{
			name: "accent colour and hidden watermark",
			opts: &PDFRenderOptions{AccentColor: "#00bcff", HideWatermark: true},
			wantTheme: &typstInputTheme{
				AccentColor:   "#00bcff",
				HideWatermark: true,
			},
		},
		{
			name: "custom logo sets the theme logo file",
			opts: &PDFRenderOptions{Logo: jpegMagic},
			wantTheme: &typstInputTheme{
				LogoFile: "org-logo.jpg",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			input := buildTypstInput(testGuide(), testSteps(), tt.opts)

			// Assert
			assert.Equal(t, "Getting started", input.Guide.Title)
			assert.Equal(t, 1, input.Guide.StepCount)
			assert.Len(t, input.Steps, 2)
			assert.Equal(t, tt.wantTheme, input.Theme)
		})
	}
}

func TestBuildTypstInput_Marshal(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		opts      *PDFRenderOptions
		wantTheme *typstInputTheme
	}{
		{
			name:      "nil options serialise without a theme key",
			opts:      nil,
			wantTheme: nil,
		},
		{
			name: "options serialise the theme block",
			opts: &PDFRenderOptions{AccentColor: "#00bcff", HideWatermark: true, Logo: pngMagic},
			wantTheme: &typstInputTheme{
				AccentColor:   "#00bcff",
				HideWatermark: true,
				LogoFile:      "org-logo.png",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			data, err := json.Marshal(buildTypstInput(testGuide(), testSteps(), tt.opts))
			require.NoError(t, err)

			// Assert
			var decoded struct {
				Theme *typstInputTheme `json:"theme"`
			}
			require.NoError(t, json.Unmarshal(data, &decoded))
			assert.Equal(t, tt.wantTheme, decoded.Theme)
		})
	}
}

func TestOrgLogoFileName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		data []byte
		want string
	}{
		{name: "png", data: pngMagic, want: "org-logo.png"},
		{name: "jpeg", data: jpegMagic, want: "org-logo.jpg"},
		{name: "jpeg with jfif app0 marker", data: jfifMagic, want: "org-logo.jpg"},
		{name: "gif", data: gifMagic, want: "org-logo.gif"},
		{name: "webp", data: webpMagic, want: "org-logo.webp"},
		{name: "unknown defaults to png", data: []byte("nope"), want: "org-logo.png"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Act
			got := orgLogoFileName(tt.data)

			// Assert
			assert.Equal(t, tt.want, got)
		})
	}
}
