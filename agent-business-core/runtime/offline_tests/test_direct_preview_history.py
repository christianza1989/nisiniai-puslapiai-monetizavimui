"""Old script-run evidence must never pretend a future DM descriptor is a script."""
def test_script_evidence_excludes_only_the_explicit_incremental_preview_version():
    from pinet_core.customer_agents.evidence import scripted_runs_only
    condition = scripted_runs_only().compile()
    assert "IS DISTINCT FROM" in str(condition)
    assert "customer-agent-direct-preview.v1" in condition.params.values()
