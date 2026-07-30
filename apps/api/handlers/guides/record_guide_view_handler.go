package guides

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"
	"github.com/Authula/authula/util"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/utils"
)

type RecordGuideViewHandler struct {
	appConfig         *config.AppConfig
	guideViewsUseCase interfaces.GuideViewsUseCase
}

func NewRecordGuideViewHandler(appConfig *config.AppConfig, guideViewsUseCase interfaces.GuideViewsUseCase) *RecordGuideViewHandler {
	return &RecordGuideViewHandler{appConfig: appConfig, guideViewsUseCase: guideViewsUseCase}
}

func (h *RecordGuideViewHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID, err := uuid.Parse(r.PathValue("id"))
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "invalid guide ID"})
			reqCtx.Handled = true
			return
		}

		ipHash := util.SHA256Hex(reqCtx.ClientIP)
		userAgent := r.UserAgent()
		viewedAt := time.Now().UTC().Format(time.RFC3339)

		if err := h.guideViewsUseCase.RecordView(ctx, actor, guideID, ipHash, userAgent, viewedAt); err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusNoContent, "")
	}
}
