package teams

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
)

type BunTeamsRepository struct {
	db bun.IDB
}

func NewBunTeamsRepository(db bun.IDB) *BunTeamsRepository {
	return &BunTeamsRepository{db: db}
}

func (r *BunTeamsRepository) accessibleTeamIDs(userID string, teamID *string) *bun.SelectQuery {
	owned := r.db.NewSelect().
		ColumnExpr("t.id").
		TableExpr("organizations org").
		Join("INNER JOIN organization_teams t ON t.organization_id = org.id").
		Where("org.owner_id = ?", userID)

	assigned := r.db.NewSelect().
		ColumnExpr("t.id").
		TableExpr("organization_members m").
		Join("INNER JOIN organization_team_members tm ON tm.member_id = m.id").
		Join("INNER JOIN organization_teams t ON t.id = tm.team_id").
		Where("m.user_id = ?", userID).
		Where("m.organization_id = t.organization_id")

	if teamID != nil {
		owned = owned.Where("t.id = ?", *teamID)
		assigned = assigned.Where("t.id = ?", *teamID)
	}

	return owned.Union(assigned)
}

func (r *BunTeamsRepository) accessibleQuery(userID string, teamID *string) *bun.SelectQuery {
	return r.db.NewSelect().
		// models.Team embeds Authula's OrganizationTeam, so the projection follows
		// their schema rather than pinning a column list here.
		ColumnExpr("ot.*").
		ColumnExpr("o.owner_id AS owner_id").
		TableExpr("organization_teams ot").
		Join("INNER JOIN organizations o ON o.id = ot.organization_id").
		Where("ot.id IN (?)", r.accessibleTeamIDs(userID, teamID))
}

func (r *BunTeamsRepository) GetAllAccessibleByUserID(ctx context.Context, userID string) ([]*models.Team, error) {
	teams := []*models.Team{}

	err := r.accessibleQuery(userID, nil).
		OrderExpr("o.created_at DESC, o.id DESC, ot.created_at DESC, ot.id DESC").
		Scan(ctx, &teams)
	if err != nil {
		return nil, err
	}

	return teams, nil
}

func (r *BunTeamsRepository) GetAccessibleByUserID(ctx context.Context, userID, teamID string) (*models.Team, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, nil
	}
	normalizedTeamID := parsedTeamID.String()

	team := new(models.Team)
	err = r.accessibleQuery(userID, &normalizedTeamID).
		Where("ot.id = ?", normalizedTeamID).
		Scan(ctx, team)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return team, nil
}
