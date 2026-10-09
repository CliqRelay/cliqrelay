package export

import (
	"bytes"
	"context"
	"io"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestExportService_GeneratePDF(t *testing.T) {
	t.Parallel()

	bucket := "test-bucket"
	guideID := uuid.New()
	exportID := uuid.New()
	storagePath := "exports/guides/" + guideID.String() + "/" + exportID.String() + ".pdf"

	guide := &models.Guide{
		ID:              guideID,
		Title:           "Getting started",
		Description:     new("A guide"),
		DurationSeconds: 90,
		CreatedAt:       time.Date(2026, time.January, 2, 0, 0, 0, 0, time.UTC),
	}

	cases := []struct {
		name      string
		needTypst bool
		setup     func(
			*tests.MockGuideExportsRepository,
			*tests.MockGuidesRepository,
			*tests.MockStepsRepository,
			*tests.MockStorageService,
		)
		wantErr string
	}{
		{
			name:      "renders and uploads the PDF",
			needTypst: true,
			setup: func(
				exports *tests.MockGuideExportsRepository,
				guides *tests.MockGuidesRepository,
				steps *tests.MockStepsRepository,
				storage *tests.MockStorageService,
			) {
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusProcessing, "", "").Return(nil).Once()
				guides.On("GetByID", mock.Anything, guideID.String()).Return(guide, nil).Once()
				steps.On("GetByGuideID", mock.Anything, guideID.String()).Return([]*models.Step{}, nil).Once()
				storage.On("PutObject", mock.Anything, bucket, storagePath, mock.Anything, "application/pdf").Return(nil).Once()
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusCompleted, storagePath, "").Return(nil).Once()
			},
		},
		{
			name: "guide not found marks the export failed",
			setup: func(
				exports *tests.MockGuideExportsRepository,
				guides *tests.MockGuidesRepository,
				_ *tests.MockStepsRepository,
				_ *tests.MockStorageService,
			) {
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusProcessing, "", "").Return(nil).Once()
				guides.On("GetByID", mock.Anything, guideID.String()).Return(nil, nil).Once()
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusFailed, "", mock.Anything).Return(nil).Once()
			},
			wantErr: "guide not found",
		},
		{
			name: "fetch guide error marks the export failed",
			setup: func(
				exports *tests.MockGuideExportsRepository,
				guides *tests.MockGuidesRepository,
				_ *tests.MockStepsRepository,
				_ *tests.MockStorageService,
			) {
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusProcessing, "", "").Return(nil).Once()
				guides.On("GetByID", mock.Anything, guideID.String()).Return(nil, assert.AnError).Once()
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusFailed, "", mock.Anything).Return(nil).Once()
			},
			wantErr: "fetch guide",
		},
		{
			name: "fetch steps error marks the export failed",
			setup: func(
				exports *tests.MockGuideExportsRepository,
				guides *tests.MockGuidesRepository,
				steps *tests.MockStepsRepository,
				_ *tests.MockStorageService,
			) {
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusProcessing, "", "").Return(nil).Once()
				guides.On("GetByID", mock.Anything, guideID.String()).Return(guide, nil).Once()
				steps.On("GetByGuideID", mock.Anything, guideID.String()).Return([]*models.Step{}, assert.AnError).Once()
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusFailed, "", mock.Anything).Return(nil).Once()
			},
			wantErr: "fetch steps",
		},
		{
			name: "renderer failure marks the export failed",
			setup: func(
				exports *tests.MockGuideExportsRepository,
				guides *tests.MockGuidesRepository,
				steps *tests.MockStepsRepository,
				storage *tests.MockStorageService,
			) {
				stepsWithMedia := []*models.Step{
					{
						ID:          uuid.New(),
						Type:        models.StepTypeInteraction,
						Action:      new(models.StepActionClick),
						MediaAssets: []*models.MediaAsset{{StoragePath: "uploads/shot.png"}},
					},
				}
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusProcessing, "", "").Return(nil).Once()
				guides.On("GetByID", mock.Anything, guideID.String()).Return(guide, nil).Once()
				steps.On("GetByGuideID", mock.Anything, guideID.String()).Return(stepsWithMedia, nil).Once()
				storage.On("GetObject", mock.Anything, bucket, "uploads/shot.png").
					Return(io.NopCloser(bytes.NewReader(nil)), assert.AnError).
					Once()
				exports.On("UpdateStatus", mock.Anything, exportID, models.ExportStatusFailed, "", mock.Anything).Return(nil).Once()
			},
			wantErr: "generate PDF",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if tt.needTypst {
				requireTypst(t)
			}

			// Arrange
			exports := new(tests.MockGuideExportsRepository)
			guides := new(tests.MockGuidesRepository)
			steps := new(tests.MockStepsRepository)
			storage := new(tests.MockStorageService)
			tt.setup(exports, guides, steps, storage)

			svc := NewExportService(exports, guides, steps, storage, nil, nil, bucket)

			// Act
			err := svc.GeneratePDF(context.Background(), exportID, guideID)

			// Assert
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			} else {
				require.NoError(t, err)
			}

			exports.AssertExpectations(t)
			guides.AssertExpectations(t)
			steps.AssertExpectations(t)
			storage.AssertExpectations(t)
		})
	}
}
