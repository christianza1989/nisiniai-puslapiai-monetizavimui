"""Release-owned code must be able to use an unchanged deployment-owned native case root."""
import sys
from types import SimpleNamespace

import pytest

from pinet_core.creation import studio
from pinet_core.tasks.codex_transport import RunnerError


def setup(monkeypatch,tmp_path,configured):
    release=tmp_path/'new-source'
    script=release/'content-studio/scripts/customer-creation-intake.mjs'
    script.parent.mkdir(parents=True)
    script.write_text('// fixture')
    runtime=release/'agent-business-core/runtime'
    (runtime/'artifacts').mkdir(parents=True)
    public=tmp_path/'public'
    network=public/'config/niche-network.json'
    network.parent.mkdir(parents=True)
    network.write_text('{}')
    monkeypatch.setattr(studio,'ROOT',release)
    monkeypatch.setattr(studio,'RUNTIME',runtime)
    monkeypatch.setattr(studio.shutil,'which',lambda _:sys.executable)
    monkeypatch.setattr(studio,'settings',lambda:SimpleNamespace(customer_content_artifacts_root=configured),raising=False)
    monkeypatch.setenv('PINET_PUBLIC_CORE_PATH',str(public))
    monkeypatch.setenv('STUDIO_NETWORK_SETTINGS',str(network))
    return runtime/'artifacts'


def test_new_source_uses_same_absolute_case_root_without_rewriting_originals(monkeypatch,tmp_path):
    persistent=tmp_path/'old-source/agent-business-core/runtime/artifacts'
    persistent.mkdir(parents=True)
    original=persistent/'accepted-intake-marker.json'
    original.write_bytes(b'{"original":"exact-preserved-bytes"}')
    setup(monkeypatch,tmp_path,str(persistent))
    assert studio.configuration()[2]==persistent
    assert original.read_bytes()==b'{"original":"exact-preserved-bytes"}'


def test_empty_override_keeps_exact_legacy_default(monkeypatch,tmp_path):
    expected=setup(monkeypatch,tmp_path,'')
    assert studio.configuration()[2]==expected


@pytest.mark.parametrize('value',['relative/runtime/artifacts','/missing/runtime/artifacts'])
def test_bad_operator_root_fails_before_provider(monkeypatch,tmp_path,value):
    setup(monkeypatch,tmp_path,value)
    with pytest.raises(RunnerError):
        studio.configuration()


def test_existing_wrong_shape_is_not_accepted(monkeypatch,tmp_path):
    wrong=tmp_path/'other'
    wrong.mkdir()
    setup(monkeypatch,tmp_path,str(wrong))
    with pytest.raises(RunnerError):
        studio.configuration()


def test_existing_absolute_alias_is_not_accepted(monkeypatch,tmp_path):
    (tmp_path/'stable/runtime/artifacts').mkdir(parents=True)
    (tmp_path/'unused').mkdir()
    setup(monkeypatch,tmp_path,str(tmp_path/'unused/../stable/runtime/artifacts'))
    with pytest.raises(RunnerError):
        studio.configuration()
