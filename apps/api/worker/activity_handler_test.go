package worker_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/worker"
)

func activityMessage(t *testing.T, eventType string, payload any) []byte {
	t.Helper()
	ev, err := events.NewEvent(eventType, payload)
	require.NoError(t, err)
	data, err := ev.Marshal()
	require.NoError(t, err)
	return data
}

func TestHandleActivityRecordedEvent(t *testing.T) {
	t.Parallel()

	valid := events.ActivityRecordedPayload{EventID: "e", EventType: "guide.created", TeamID: new("t"), ActorID: "a", ActorType: "user", TargetID: "g", TargetType: "guide"}

	cases := []struct {
		name     string
		message  []byte
		setup    func(*tests.MockActivityLogsService)
		wantMode worker.NackMode
	}{
		{
			name:    "records the activity",
			message: activityMessage(t, events.EventTypeActivityRecorded, valid),
			setup: func(svc *tests.MockActivityLogsService) {
				svc.On("Record", mock.Anything, &valid).Return(nil).Once()
			},
		},
		{
			name:     "unreadable event is fatal",
			message:  []byte("{"),
			wantMode: worker.NackModeFatal,
		},
		{
			name:     "malformed payload is fatal",
			message:  activityMessage(t, events.EventTypeActivityRecorded, "not an object"),
			wantMode: worker.NackModeFatal,
		},
		{
			name:    "invalid ids are fatal",
			message: activityMessage(t, events.EventTypeActivityRecorded, valid),
			setup: func(svc *tests.MockActivityLogsService) {
				svc.On("Record", mock.Anything, mock.Anything).Return(constants.ErrInvalidActivityPayload).Once()
			},
			wantMode: worker.NackModeFatal,
		},
		{
			name:    "transient failure is retried",
			message: activityMessage(t, events.EventTypeActivityRecorded, valid),
			setup: func(svc *tests.MockActivityLogsService) {
				svc.On("Record", mock.Anything, mock.Anything).Return(assert.AnError).Once()
			},
			wantMode: worker.NackModeFail,
		},
		{
			name:     "unknown event type",
			message:  activityMessage(t, "something.else", valid),
			wantMode: worker.NackModeFail,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc := new(tests.MockActivityLogsService)
			if tt.setup != nil {
				tt.setup(svc)
			}

			err := worker.HandleActivityRecordedEvent(svc)(context.Background(), "1-0", tt.message)

			if tt.wantMode == "" {
				assert.NoError(t, err)
			} else {
				var herr *worker.HandlerError
				require.ErrorAs(t, err, &herr)
				assert.Equal(t, tt.wantMode, herr.Mode)
			}
			svc.AssertExpectations(t)
		})
	}
}
