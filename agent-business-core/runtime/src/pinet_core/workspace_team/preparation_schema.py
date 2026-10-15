"""Add immutable owner preparation intent to the existing TeamTurn only."""


def upgrade_sql():
    return [
        "ALTER TABLE control_workspace_team_turns ADD COLUMN agent_creation_id VARCHAR",
        "ALTER TABLE control_workspace_team_turns ADD COLUMN agent_purpose VARCHAR",
        """ALTER TABLE control_workspace_team_turns ADD CONSTRAINT workspace_agent_intent_check CHECK(
        (agent_creation_id IS NULL AND agent_purpose IS NULL) OR
        (agent_creation_id IS NOT NULL AND agent_purpose IS NOT NULL AND
        agent_purpose IN('site_chat','customer_research','email','custom')))""",
        """ALTER TABLE control_workspace_team_turns ADD CONSTRAINT fk_workspace_agent_intent_creation
        FOREIGN KEY(agent_creation_id,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_creations(id,user_id,organization_id,portfolio_id,environment_id)
        ON DELETE RESTRICT""",
    ]


def downgrade_sql():
    return [
        "ALTER TABLE control_workspace_team_turns DROP CONSTRAINT fk_workspace_agent_intent_creation",
        "ALTER TABLE control_workspace_team_turns DROP CONSTRAINT workspace_agent_intent_check",
        "ALTER TABLE control_workspace_team_turns DROP COLUMN agent_purpose",
        "ALTER TABLE control_workspace_team_turns DROP COLUMN agent_creation_id",
    ]
