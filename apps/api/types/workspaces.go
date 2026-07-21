package types

import (
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type WorkspaceID struct {
	ID string `path:"workspaceId" validate:"required,uuid"`
}

func (r *WorkspaceID) Validate() error {
	return validator.Validate.Struct(r)
}

type WorkspaceFilter struct {
	Type *models.WorkspaceType
}

type CreateWorkspaceRequest struct {
	Name string                `json:"name" validate:"required,lte=255" required:"true"`
	Type *models.WorkspaceType `json:"type,omitempty" nullable:"true"`
}

func (r *CreateWorkspaceRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateWorkspaceDTO struct {
	OrganizationID string
	Name           string
	Type           models.WorkspaceType
	OwnerID        *string
}

type CreateWorkspaceResponse struct {
	Workspace *models.Workspace `json:"workspace" required:"true" nullable:"false"`
}

type UpdateWorkspaceRequest struct {
	Name *string `json:"name,omitempty" validate:"omitempty,gt=0,lte=255" nullable:"true"`
}

func (r *UpdateWorkspaceRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type UpdateWorkspaceDTO struct {
	ID   string
	Name *string
}

type UpdateWorkspaceResponse struct {
	Workspace *models.Workspace `json:"workspace" required:"true" nullable:"false"`
}

type GetAllWorkspacesResponse struct {
	Workspaces []*models.Workspace `json:"workspaces" required:"true" nullable:"false"`
}

type GetWorkspaceByIDResponse struct {
	Workspace *models.Workspace `json:"workspace" required:"true" nullable:"true"`
}

type DeleteWorkspaceResponse struct {
	Message string `json:"message" required:"true"`
}
