package worker

import (
	"github.com/go-co-op/gocron/v2"
)

type CronService struct {
	scheduler gocron.Scheduler
}

func NewCronService() (*CronService, error) {
	s, err := gocron.NewScheduler()
	if err != nil {
		return nil, err
	}
	return &CronService{scheduler: s}, nil
}

func (c *CronService) Scheduler() gocron.Scheduler {
	return c.scheduler
}

func (c *CronService) Start() {
	c.scheduler.Start()
}

func (c *CronService) Shutdown() error {
	return c.scheduler.Shutdown()
}
