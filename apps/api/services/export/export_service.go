package export

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	cliqmodels "github.com/CliqRelay/cliqrelay/models"
)

type ExportService struct {
	guideExportsRepo interfaces.GuideExportsRepository
	guidesRepo       interfaces.GuidesRepository
	stepsRepo        interfaces.StepsRepository
	storageService   interfaces.StorageService
	presignService   interfaces.PresignService
	redisClient      *redis.Client
	bucket           string
}

func NewExportService(
	guideExportsRepo interfaces.GuideExportsRepository,
	guidesRepo interfaces.GuidesRepository,
	stepsRepo interfaces.StepsRepository,
	storageService interfaces.StorageService,
	presignService interfaces.PresignService,
	redisClient *redis.Client,
	bucket string,
) *ExportService {
	return &ExportService{
		guideExportsRepo: guideExportsRepo,
		guidesRepo:       guidesRepo,
		stepsRepo:        stepsRepo,
		storageService:   storageService,
		presignService:   presignService,
		redisClient:      redisClient,
		bucket:           bucket,
	}
}

func (s *ExportService) RequestExport(reqCtx *authulamodels.RequestContext, workspaceID string, guideID string, format cliqmodels.ExportGuideFormat) (*uuid.UUID, error) {
	ctx := reqCtx.Request.Context()

	parsedGuideID, err := uuid.Parse(guideID)
	if err != nil {
		return nil, fmt.Errorf("invalid guide ID: %w", err)
	}

	export, err := s.guideExportsRepo.Create(ctx, workspaceID, parsedGuideID, reqCtx.Actor.ID, format)
	if err != nil {
		return nil, fmt.Errorf("create export: %w", err)
	}

	if err := events.Publish(ctx, s.redisClient, events.TopicGuideExports, events.EventTypeGuideExport, &events.GuideExportPayload{
		ExportID: export.ID.String(),
		GuideID:  guideID,
		UserID:   reqCtx.Actor.ID,
		Format:   format.ToString(),
	}); err != nil {
		return nil, fmt.Errorf("publish export event: %w", err)
	}

	return &export.ID, nil
}

func (s *ExportService) GetExportStatus(reqCtx *authulamodels.RequestContext, workspaceID string, exportID string) (*cliqmodels.GuideExport, error) {
	ctx := reqCtx.Request.Context()

	parsedID, err := uuid.Parse(exportID)
	if err != nil {
		return nil, fmt.Errorf("invalid export ID: %w", err)
	}

	export, err := s.guideExportsRepo.GetByID(ctx, workspaceID, parsedID, reqCtx.Actor.ID)
	if err != nil {
		return nil, fmt.Errorf("get export: %w", err)
	}
	if export == nil {
		return nil, nil
	}

	if export.Status == cliqmodels.ExportStatusCompleted && export.StoragePath != nil {
		downloadURL, err := s.presignService.GetURL(ctx, s.bucket, *export.StoragePath)
		if err != nil {
			slog.Error("failed to presign download URL", "export_id", exportID, "path", *export.StoragePath, "err", err)
		} else {
			export.DownloadURL = &downloadURL
		}
	}

	return export, nil
}

func (s *ExportService) GenerateExport(ctx context.Context, exportID uuid.UUID, guideID uuid.UUID, format cliqmodels.ExportGuideFormat) error {
	switch format {
	case cliqmodels.ExportGuideFormatPDF:
		return s.GeneratePDF(ctx, exportID, guideID)
	default:
		errMsg := fmt.Sprintf("unsupported export format: %s", format)
		s.markFailed(ctx, exportID, errMsg)
		return fmt.Errorf("%s", errMsg)
	}
}

func (s *ExportService) GeneratePDF(ctx context.Context, exportID uuid.UUID, guideID uuid.UUID) error {
	if err := s.guideExportsRepo.UpdateStatus(ctx, exportID, cliqmodels.ExportStatusProcessing, "", ""); err != nil {
		return fmt.Errorf("update status to processing: %w", err)
	}

	guide, err := s.guidesRepo.GetByID(ctx, "", guideID.String()) // workspaceID not needed for background export worker
	if err != nil {
		s.markFailed(ctx, exportID, fmt.Sprintf("fetch guide: %v", err))
		return fmt.Errorf("fetch guide: %w", err)
	}
	if guide == nil {
		s.markFailed(ctx, exportID, "guide not found")
		return fmt.Errorf("guide not found")
	}

	steps, err := s.stepsRepo.GetByGuideID(ctx, "", guideID.String()) // workspaceID not needed for background export worker
	if err != nil {
		s.markFailed(ctx, exportID, fmt.Sprintf("fetch steps: %v", err))
		return fmt.Errorf("fetch steps: %w", err)
	}

	pdfBytes, err := generatePDFWithTypst(ctx, guide, steps, s.storageService, s.bucket)
	if err != nil {
		s.markFailed(ctx, exportID, fmt.Sprintf("generate PDF: %v", err))
		return fmt.Errorf("generate PDF: %w", err)
	}

	storagePath := fmt.Sprintf("exports/guides/%s/%s.pdf", guideID.String(), exportID.String())
	if err := s.storageService.PutObject(ctx, s.bucket, storagePath, bytes.NewReader(pdfBytes), "application/pdf"); err != nil {
		s.markFailed(ctx, exportID, fmt.Sprintf("upload PDF: %v", err))
		return fmt.Errorf("upload PDF: %w", err)
	}

	if err := s.guideExportsRepo.UpdateStatus(ctx, exportID, cliqmodels.ExportStatusCompleted, storagePath, ""); err != nil {
		return fmt.Errorf("update status to completed: %w", err)
	}

	return nil
}

func (s *ExportService) markFailed(ctx context.Context, exportID uuid.UUID, errMsg string) {
	if uErr := s.guideExportsRepo.UpdateStatus(ctx, exportID, cliqmodels.ExportStatusFailed, "", errMsg); uErr != nil {
		slog.Error("failed to mark export as failed", "export_id", exportID, "err", uErr)
	}
}
