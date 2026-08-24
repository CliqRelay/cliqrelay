package teams

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
)

// teamAccessibleWhere is the single source of truth for who can reach a team:
// the owner of the organization the team belongs to, or a member of that
// organization assigned to the team. It mirrors Authula's own
// organizationAccessibleWhere idiom.
//
// EXISTS rather than a LEFT JOIN so a user who is both the org owner and an
// assigned team member yields one row, not two. Note the two hops:
// organization_team_members.member_id references organization_members.id,
// not users.id.
const teamAccessibleWhere = `o.owner_id = ? OR EXISTS (` +
	`SELECT 1 FROM organization_team_members otm ` +
	`INNER JOIN organization_members om ON om.id = otm.member_id ` +
	`WHERE otm.team_id = ot.id AND om.organization_id = o.id AND om.user_id = ?)`

type BunTeamsRepository struct {
	db bun.IDB
}

func NewBunTeamsRepository(db bun.IDB) *BunTeamsRepository {
	return &BunTeamsRepository{db: db}
}

func (r *BunTeamsRepository) accessibleQuery(userID string) *bun.SelectQuery {
	return r.db.NewSelect().
		ColumnExpr("ot.id AS id").
		ColumnExpr("ot.organization_id AS organization_id").
		ColumnExpr("ot.name AS name").
		ColumnExpr("ot.created_at AS created_at").
		ColumnExpr("ot.updated_at AS updated_at").
		ColumnExpr("o.owner_id AS owner_id").
		TableExpr("organization_teams ot").
		Join("INNER JOIN organizations o ON o.id = ot.organization_id").
		Where(teamAccessibleWhere, userID, userID)
}

func (r *BunTeamsRepository) GetAllAccessibleByUserID(ctx context.Context, userID string) ([]*models.Team, error) {
	teams := []*models.Team{}

	// Ordering is a faithful port of the previous nested-loop fan-out: organizations
	// newest first, then teams newest first within each organization. The web app
	// picks teams[0] as the default active team, so re-sorting would silently hand
	// users a different default.
	err := r.accessibleQuery(userID).
		OrderExpr("o.created_at DESC, o.id DESC, ot.created_at DESC, ot.id DESC").
		Scan(ctx, &teams)
	if err != nil {
		return nil, err
	}

	return teams, nil
}

func (r *BunTeamsRepository) GetAccessibleByUserID(ctx context.Context, userID, teamID string) (*models.Team, error) {
	// organization_teams.id is a Postgres uuid, so a malformed id from the query
	// string would raise "invalid input syntax for type uuid" and surface as a 500.
	// A malformed id is definitionally not an accessible team.
	//
	// The parsed value is what goes into the query, not the caller's string:
	// uuid.Parse also accepts the "urn:uuid:" and braced forms, and Postgres
	// rejects the former, so passing the raw input through would reopen the 500
	// this guard exists to close.
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, nil
	}

	team := new(models.Team)
	err = r.accessibleQuery(userID).
		Where("ot.id = ?", parsedTeamID.String()).
		Scan(ctx, team)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return team, nil
}
