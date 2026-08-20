package tests

import (
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
)

// StubGuideDurationRecalculation registers permissive expectations for the guide
// duration recalculation that follows every step mutation. Tests that assert on the
// recalculation should register their own expectations before calling this.
func StubGuideDurationRecalculation(stepsRepo *MockStepsRepository, guidesRepo *MockGuidesRepository) {
	stepsRepo.On("GetByGuideID", mock.Anything, mock.Anything).
		Return([]*models.Step{}, nil).
		Maybe()
	guidesRepo.On("UpdateDuration", mock.Anything, mock.Anything, mock.Anything).
		Return(&models.Guide{}, nil).
		Maybe()
}
