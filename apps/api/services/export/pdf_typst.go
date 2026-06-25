package export

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/CliqRelay/cliqrelay/assets"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/templates/guides"
)

const (
	typstFontFile   = "inter.ttf"
	typstInputFile  = "guide.typ"
	typstOutputFile = "output.pdf"
	typstDataFile   = "data.json"
	typstLogoFile   = "logo.png"
)

// -------- Typst input JSON structures --------

type typstInputGuide struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Duration    string  `json:"duration"`
	CreatedAt   string  `json:"created_at"`
}

type typstInputTargetElement struct {
	ClickX         *int `json:"click_x"`
	ClickY         *int `json:"click_y"`
	ViewportWidth  *int `json:"viewport_width"`
	ViewportHeight *int `json:"viewport_height"`
}

type typstInputCanvasContent struct {
	Type        string  `json:"type"`
	HeadingText *string `json:"heading_text"`
	BodyText    *string `json:"body_text"`
}

type typstInputMedia struct {
	FileName string  `json:"file_name"`
	MimeType string  `json:"mime_type"`
	Width    *int    `json:"width"`
	Height   *int    `json:"height"`
	AltText  *string `json:"alt_text"`
}

type typstInputStep struct {
	Type          string                   `json:"type"`
	SortOrder     string                   `json:"sort_order"`
	Action        *string                  `json:"action"`
	ActionText    *string                  `json:"action_text"`
	Notes         *string                  `json:"notes"`
	URL           *string                  `json:"url"`
	TargetElement *typstInputTargetElement `json:"target_element"`
	CanvasContent *typstInputCanvasContent `json:"canvas_content"`
	Media         *typstInputMedia         `json:"media"`
}

type typstInput struct {
	Guide typstInputGuide  `json:"guide"`
	Steps []typstInputStep `json:"steps"`
}

func generatePDFWithTypst(
	ctx context.Context,
	guide *models.Guide,
	steps []*models.Step,
	storageService interfaces.StorageService,
	bucket string,
) ([]byte, error) {
	input := buildTypstInput(guide, steps)

	tmpDir, err := os.MkdirTemp("", "guide-typst-*")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Write the typst template
	if err := os.WriteFile(filepath.Join(tmpDir, typstInputFile), guides.GuideTyp, 0644); err != nil {
		return nil, fmt.Errorf("write %s: %w", typstInputFile, err)
	}

	// Write the font
	if err := os.WriteFile(filepath.Join(tmpDir, typstFontFile), assets.InterTTF, 0644); err != nil {
		return nil, fmt.Errorf("write %s: %w", typstFontFile, err)
	}

	// Write the logo
	if err := os.WriteFile(filepath.Join(tmpDir, typstLogoFile), assets.LogoPNG, 0644); err != nil {
		return nil, fmt.Errorf("write %s: %w", typstLogoFile, err)
	}

	// Write media images and populate file names
	if err := writeMediaFiles(ctx, storageService, bucket, tmpDir, steps, &input); err != nil {
		return nil, fmt.Errorf("write media files: %w", err)
	}

	// Write data.json
	jsonBytes, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("marshal input: %w", err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, typstDataFile), jsonBytes, 0644); err != nil {
		return nil, fmt.Errorf("write %s: %w", typstDataFile, err)
	}

	// Run typst compile
	outputPath := filepath.Join(tmpDir, typstOutputFile)
	cmd := exec.CommandContext(
		ctx,
		"typst", "compile",
		"--font-path", tmpDir,
		typstInputFile,
		outputPath,
	)
	cmd.Dir = tmpDir

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("typst compile failed: %w\nstderr: %s", err, stderr.String())
	}

	pdfBytes, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("read output pdf: %w", err)
	}

	return pdfBytes, nil
}

func buildTypstInput(guide *models.Guide, steps []*models.Step) typstInput {
	input := typstInput{
		Guide: typstInputGuide{
			Title:       guide.Title,
			Description: guide.Description,
			Duration:    formatDuration(guide.DurationSeconds),
			CreatedAt:   guide.CreatedAt.Format("January 2, 2006"),
		},
		Steps: make([]typstInputStep, 0, len(steps)),
	}

	for _, step := range steps {
		s := typstInputStep{
			Type:       string(step.Type),
			SortOrder:  step.SortOrder,
			ActionText: step.ActionText,
			Notes:      step.Notes,
			URL:        step.URL,
		}

		if step.Action != nil {
			a := string(*step.Action)
			s.Action = &a
		}

		s.TargetElement = mapToTargetElement(step.TargetElement)
		s.CanvasContent = canvasContentToTypst(step.CanvasContent)

		input.Steps = append(input.Steps, s)
	}

	return input
}

func writeMediaFiles(
	ctx context.Context,
	storageService interfaces.StorageService,
	bucket string,
	tmpDir string,
	steps []*models.Step,
	input *typstInput,
) error {
	for i, step := range steps {
		if len(step.MediaAssets) == 0 {
			continue
		}

		media := step.MediaAssets[0]

		data, err := downloadMedia(ctx, storageService, bucket, media.StoragePath)
		if err != nil {
			return fmt.Errorf("download media for step %s: %w", step.ID, err)
		}

		if len(data) == 0 {
			return fmt.Errorf("downloaded media for step %s is empty", step.ID)
		}

		fileName := fmt.Sprintf("step-%d.%s", i, detectImageExt(data))
		if err := os.WriteFile(filepath.Join(tmpDir, fileName), data, 0644); err != nil {
			return fmt.Errorf("write %s: %w", fileName, err)
		}

		input.Steps[i].Media = &typstInputMedia{
			FileName: fileName,
			MimeType: safeStringPtr(media.MimeType),
			Width:    media.Width,
			Height:   media.Height,
			AltText:  media.AltText,
		}
	}

	return nil
}

// Image format magic bytes.
var (
	pngSignature  = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	jpegSignature = []byte{0xFF, 0xD8, 0xFF}
	gifSignature  = []byte{0x47, 0x49, 0x46, 0x38}
)

func detectImageExt(data []byte) string {
	switch {
	case len(data) >= len(pngSignature) && bytes.Equal(data[:len(pngSignature)], pngSignature):
		return "png"
	case len(data) >= len(jpegSignature) && bytes.Equal(data[:len(jpegSignature)], jpegSignature):
		return "jpg"
	case len(data) >= len(gifSignature) && bytes.Equal(data[:len(gifSignature)], gifSignature):
		return "gif"
	case len(data) >= 12 && bytes.HasPrefix(data, []byte("RIFF")) && string(data[8:12]) == "WEBP":
		return "webp"
	default:
		return "png"
	}
}

func canvasContentToTypst(cc *models.StepCanvasContent) *typstInputCanvasContent {
	if cc == nil {
		return nil
	}

	return &typstInputCanvasContent{
		Type:        string(cc.Type),
		HeadingText: cc.HeadingText,
		BodyText:    cc.BodyText,
	}
}

func mapToTargetElement(m map[string]any) *typstInputTargetElement {
	if m == nil {
		return nil
	}

	t := &typstInputTargetElement{}

	if v, ok := m["click_x"]; ok {
		if f, ok := toFloat64(v); ok {
			iv := int(f)
			t.ClickX = &iv
		}
	}

	if v, ok := m["click_y"]; ok {
		if f, ok := toFloat64(v); ok {
			iv := int(f)
			t.ClickY = &iv
		}
	}

	if v, ok := m["viewport_width"]; ok {
		if f, ok := toFloat64(v); ok {
			iv := int(f)
			t.ViewportWidth = &iv
		}
	}

	if v, ok := m["viewport_height"]; ok {
		if f, ok := toFloat64(v); ok {
			iv := int(f)
			t.ViewportHeight = &iv
		}
	}

	return t
}

func toFloat64(v any) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case int:
		return float64(val), true
	default:
		return 0, false
	}
}

func formatDuration(seconds int) string {
	if seconds <= 0 {
		return "0s"
	}

	mins := seconds / 60
	secs := seconds % 60

	if mins > 0 && secs > 0 {
		return fmt.Sprintf("%dm %ds", mins, secs)
	}

	if mins > 0 {
		return fmt.Sprintf("%dm", mins)
	}

	return fmt.Sprintf("%ds", secs)
}

func downloadMedia(
	ctx context.Context,
	storageService interfaces.StorageService,
	bucket, storagePath string,
) ([]byte, error) {
	reader, err := storageService.GetObject(ctx, bucket, storagePath)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	return io.ReadAll(reader)
}

func safeStringPtr(s *string) string {
	if s == nil {
		return ""
	}

	return *s
}
