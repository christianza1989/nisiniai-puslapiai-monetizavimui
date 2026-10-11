"""Native plan admission, dependency graph and historical draft compatibility; no provider."""
import re
from copy import deepcopy

import pytest
from test_creation_review import draft as draft_fixture

from pinet_core.creation.adapter import INSTRUCTION_FILES, instructions
from pinet_core.creation.renderer import (
    ContentPlanItem,
    CreatorDraft,
    Research,
    artifacts,
    context_projection,
    language_screening,
    normalize,
    normalize_creator,
    plan_markdown,
    structural_repair_context,
)
from pinet_core.tasks.codex_transport import RunnerError

draft = draft_fixture


@pytest.mark.parametrize('url', ['https://example.com/event?autoRsvp=true', 'https://example.com/event#join',
                                'http://example.com/event', 'https://example.com/a b'])
def test_provider_source_schema_exposes_existing_url_shape_rejections(url):
    definitions = CreatorDraft.model_json_schema()['$defs']
    research = definitions['Research']['properties']['url']
    plan = definitions['ContentPlanItem']['properties']['source_urls']['items']
    assert research['pattern'] == plan['pattern']
    assert re.fullmatch(research['pattern'], url) is None


@pytest.mark.parametrize('url', ['https://example.com/event?', 'https://example.com/event#'])
def test_provider_schema_does_not_add_constraints_to_historical_readers(url):
    from pinet_core.public_projects.projection import public_url
    assert public_url(url) == url
    value = {'title': 'Synthetic primary source', 'url': url, 'market': 'Lietuva',
             'finding': 'Tai sintetinis šaltinio nuorodos tikrinimo atvejis.', 'is_counterevidence': False}
    assert Research.model_validate(value).url == url
    plan = brief('/uzduotis/', 'Kaip pasirinkti darbo užduotį?')
    plan['source_urls'] = [url]
    assert ContentPlanItem.model_validate(plan).source_urls == [url]


@pytest.mark.parametrize('url', ['https://example.com/event', 'HTTPS://example.com/event'])
def test_provider_source_schema_retains_previously_valid_url_and_full_server_validation(draft, url):
    definitions = CreatorDraft.model_json_schema()['$defs']
    value = planned(draft)
    value['research'] = [{'title': 'Synthetic primary source', 'url': url, 'market': 'Lietuva',
                          'finding': 'Tai sintetinis šaltinio nuorodos tikrinimo atvejis.',
                          'is_counterevidence': False}]
    value['content_plan'][0]['source_urls'] = [url]
    assert re.fullmatch(definitions['Research']['properties']['url']['pattern'], url)
    assert normalize_creator(value)['research'][0]['url'] == url
    for unsafe in ('https://user:secret@example.com/event', 'https://127.0.0.1/event'):
        value['research'][0]['url'] = unsafe
        with pytest.raises(RunnerError):
            normalize_creator(value)


def brief(path, question):
    return {
        "path": path, "title": question, "head_query": question,
        "intent": "Padėti komandai pasirinkti vieną konkrečią mokymo užduotį.",
        "audience_problem": "Komanda nori sumažinti pasikartojantį darbą ir palyginti galimus mokymo būdus.",
        "business_goal": "Patikrinti tikrą tinkamų komandų susidomėjimą siauru praktinio mokymo pasiūlymu.",
        "primary_topic": "Komandos mokymas",
        "reason": "Šis gidas atsako į atskirą sprendimo klausimą; tikrą vykdymo galimybę dar reikia patikrinti.",
        "month": "", "seasonal_hook": "", "pillar_path": "",
        "outline": ["Pasirinkti konkrečią užduotį.", "Palyginti darbo būdus.", "Nustatyti bandymo kriterijus."],
        "source_queries": ["Praktinio komandos mokymo užduoties pasirinkimas"], "source_urls": [],
        "internal_links": ["/"], "media_brief": "Parodyti tris skirtingus komandos darbo užduoties pasirinkimo žingsnius, be išgalvotų žmonių ar rezultatų.",
        "media_alt": "Trys komandos darbo užduoties pasirinkimo žingsniai", "priority": "initial",
    }


def planned(draft):
    draft = deepcopy(draft)
    draft["content_plan"] = [brief(path, title) for path, title in (
        ("/uzduotis/", "Kaip pasirinkti komandos mokymo užduotį?"),
        ("/duomenys/", "Kokius duomenis saugiai naudoti mokymo metu?"),
        ("/rezultatas/", "Kaip įvertinti praktinio mokymo rezultatą?"),
    )]
    return draft


def test_legacy_payload_readable_but_new_creator_must_supply_real_plan(draft):
    assert normalize(draft)["content_plan"] == []
    with pytest.raises(RunnerError) as error:
        normalize_creator(draft)
    assert error.value.code == "output_invalid"
    assert len(normalize_creator(planned(draft))["content_plan"]) == 3


@pytest.mark.parametrize("defect", ["duplicate", "unknown_link", "self_link", "unknown_parent", "cycle", "seasonal_without_month", "bad_month", "unsafe_source"])
def test_invalid_or_invented_plan_dependencies_fail_closed(draft, defect):
    value = planned(draft)
    first, second = value["content_plan"][:2]
    if defect == "duplicate":
        second["path"] = first["path"]
    elif defect == "unknown_link":
        first["internal_links"] = ["/isgalvota/"]
    elif defect == "self_link":
        first["internal_links"] = [first["path"]]
    elif defect == "unknown_parent":
        first["pillar_path"] = "/isgalvota/"
    elif defect == "cycle":
        first["pillar_path"], second["pillar_path"] = second["path"], first["path"]
    elif defect == "seasonal_without_month":
        first["seasonal_hook"] = "Sezoninė data dar nepatikrinta."
    elif defect == "bad_month":
        first["month"] = "2026-13"
    elif defect == "unsafe_source":
        first["source_urls"] = ["http://127.0.0.1/private"]
    with pytest.raises(RunnerError):
        normalize_creator(value)


def test_real_broad_root_precedes_support_and_plan_is_not_public_package(draft):
    value = planned(draft)
    value["content_plan"][1]["pillar_path"] = value["content_plan"][0]["path"]
    value["content_plan"][1]["internal_links"] += [value["content_plan"][0]["path"]]
    value = normalize_creator(value)
    assert "Kaip pasirinkti komandos" in plan_markdown(value, "Tyrimas neatliktas.")
    output = artifacts(value, creation_id="fixture", revision=1, receipt={})
    assert '"schemaVersion": "verslomatika.business-draft.v2"' in output[2]["content"]
    assert '"publicationApproved": false' in output[2]["content"]


def test_nested_intent_paths_normalize_before_identity_and_dependency_checks(draft):
    value = planned(draft)
    paths = ["/gidai/uzduotis", "/gidai/duomenys/", "/gidai/rezultatas"]
    for item, path in zip(value["content_plan"], paths):
        item["path"] = path
    value["content_plan"][1]["pillar_path"] = paths[0]
    value["content_plan"][1]["internal_links"].append(paths[0])
    result = normalize_creator(value)
    assert [item["path"] for item in result["content_plan"]] == [path.rstrip("/") + "/" for path in paths]
    assert result["content_plan"][1]["pillar_path"] == "/gidai/uzduotis/"
    assert result["content_plan"][1]["internal_links"] == ["/", "/gidai/uzduotis/"]
    value["content_plan"][1]["path"] = paths[0] + "/"
    with pytest.raises(RunnerError):
        normalize_creator(value)


@pytest.mark.parametrize("path", ["/api/uzduotis/", "/niche/uzduotis/", "/../uzduotis/",
    "/gidai//uzduotis/", "/gidai/uzduotis?x=1", "/gidai/uzduotis#tema", "https://example.org/uzduotis/",
    "/gidai/" + "a" * 145 + "/", "/" + "a" * 149])
@pytest.mark.parametrize("field", ["path", "pillar_path", "internal_links", "page_path"])
def test_unsafe_or_reserved_paths_never_enter_shared_studio(draft, path, field):
    value = planned(draft)
    if field == "page_path":
        value["pages"][1]["path"] = path
    else:
        value["content_plan"][0][field] = [path] if field == "internal_links" else path
    with pytest.raises(RunnerError):
        normalize_creator(value)


def test_unknown_nested_destination_still_fails_closed(draft):
    value = planned(draft)
    value["content_plan"][0]["internal_links"] = ["/gidai/neparengtas/"]
    with pytest.raises(RunnerError):
        normalize_creator(value)


def test_actual_self_parent_shape_yields_feedback_without_mutation_or_promotion(draft):
    value = planned(draft)
    value["content_plan"][0]["pillar_path"] = value["content_plan"][0]["path"]
    original = deepcopy(value)
    with pytest.raises(RunnerError):
        normalize_creator(value)
    correction = structural_repair_context(value)
    assert value == original
    assert correction["issues"][0]["field"] == "draft:/content_plan/0/pillar_path"
    assert correction["candidate"]["content_plan"][0]["pillar_path"] == value["content_plan"][0]["path"]
    assert len(correction["unaccepted_candidate_sha256"]) == 64
    assert "assistant_reply" not in correction["candidate"]
    with pytest.raises(RunnerError):
        normalize_creator(value)
    value["content_plan"][0]["pillar_path"] = ""
    assert structural_repair_context(value) is None
    value["content_plan"][0]["path"] = "/api/private/"
    assert structural_repair_context(value) is None


def test_plan_prose_and_titles_are_included_in_independent_language_screen(draft):
    value = normalize_creator(planned(draft))
    assert language_screening(value)["status"] == "PASS"
    value["content_plan"][0]["title"] = "Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto"
    with pytest.raises(RunnerError) as error:
        language_screening(value)
    assert error.value.code == "language_quality_failed"


def test_actual_creator_snapshot_contains_canonical_planner_and_common_handover():
    value, digest = instructions()
    assert len(digest) == 64 and len(value.encode()) < 262144
    assert "SKILLS/niche-content-planner/SKILL.md" in INSTRUCTION_FILES
    for reference in ("planning-decisions.md", "studio-contract.md", "media-workflow.md", "studio-integration.md", "geo-publishing.md"):
        assert reference in value
    assert "month=''" in value and "business-draft.v2" in value


def test_private_international_search_queries_are_not_lithuanian_public_prose(draft):
    import json

    from pinet_core.creation.review import critic_prompt
    value = normalize_creator(planned(draft))
    query = "generative AI training for businesses team workshop price Europe"
    value["content_plan"][0]["source_queries"] = [query]
    assert language_screening(value)["status"] == "PASS"
    prior, _ = context_projection(value)
    assert prior["content_plan"][0]["source_queries"] == [query]
    prompt = critic_prompt(draft=value, stage="private_draft", round_number=1)
    projected = json.loads(prompt.split("NEPATIKIMI_DUOMENYS_JSON\n", 1)[1])
    assert projected["draft"]["content_plan"][0]["source_queries"] == [query]
    value["content_plan"][0]["business_goal"] = query
    with pytest.raises(RunnerError, match="language_quality_failed"):
        language_screening(value)
