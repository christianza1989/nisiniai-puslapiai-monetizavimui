"""One fresh Git process observes both HEAD and all dirty states."""
import subprocess

import pytest

from pinet_core import source_observation as source


def test_one_process_per_fresh_observation_and_no_unscoped_memory(tmp_path, monkeypatch):
    calls = []
    def command(arguments, **kwargs):
        calls.append(arguments)
        if arguments[1:] == ['rev-parse', 'HEAD']:
            return 'a'*40
        if arguments[1:] == ['status', '--porcelain']:
            return ''
        return '# branch.oid '+'a'*40+'\0# branch.head main\0'
    monkeypatch.setattr(subprocess, 'check_output', command)
    assert source.git_source_observation(tmp_path).head == 'a'*40
    assert len(calls) == 1
    source.git_source_observation(tmp_path)
    assert len(calls) == 2


@pytest.mark.parametrize('frame', [
    '', '# branch.head main\0', '# branch.oid (initial)\0# branch.head main\0',
    '# branch.oid '+'a'*40+'\0# branch.oid '+'a'*40+'\0',
    '# branch.oid '+'a'*40+'\0? secret-name\nwith-newline.txt\0',
    '# branch.oid '+'a'*40+'\0'+'1 M. N... tracked-change\0',
    '# branch.oid '+'a'*40+'\0'+'2 R. N... destination\0original\0',
    '# branch.oid '+'a'*40+'\0u UU N... conflict\0',
    '# branch.oid '+'a'*40+'\0# unknown future-field\0',
    '# branch.oid '+'a'*39+'\0# branch.head main\0',
])
def test_invalid_or_dirty_frames_refuse_without_exposing_git_output(tmp_path, monkeypatch, frame):
    monkeypatch.setattr(subprocess, 'check_output', lambda *args, **kwargs: frame)
    with pytest.raises(source.SourceObservationError, match='^source_unavailable$'):
        source.git_source_observation(tmp_path)


@pytest.mark.parametrize('branch', ['main', '(detached)'])
def test_valid_branch_and_optional_tracking_metadata(tmp_path, monkeypatch, branch):
    frame = '# branch.oid '+'a'*40+'\0# branch.head '+branch+'\0# branch.upstream origin/main\0# branch.ab +2 -1\0'
    monkeypatch.setattr(subprocess, 'check_output', lambda *args, **kwargs: frame)
    assert source.git_source_observation(tmp_path).head == 'a'*40


@pytest.mark.parametrize('key', ['oid', 'head', 'upstream', 'ab'])
def test_malformed_branch_key_is_refused(tmp_path, monkeypatch, key):
    frame = '# branch.oid '+'a'*40+'\0# branch.head main\0# branch.upstream origin/main\0# branch.ab +2 -1\0'
    frame = frame.replace('branch.'+key, 'branchX'+key)
    monkeypatch.setattr(subprocess, 'check_output', lambda *args, **kwargs: frame)
    with pytest.raises(source.SourceObservationError):
        source.git_source_observation(tmp_path)


@pytest.mark.parametrize('dirty', ['tracked', 'untracked-newline', 'rename', 'unborn'])
def test_real_git_clean_head_and_supported_dirty_states(tmp_path, dirty):
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=tmp_path, text=True, stderr=subprocess.DEVNULL).strip()
    git('init', '--quiet')
    if dirty == 'unborn':
        with pytest.raises(source.SourceObservationError):
            source.git_source_observation(tmp_path)
        return
    file = tmp_path/'tracked.txt'
    file.write_text('owned inert Git fixture', encoding='utf-8')
    git('add', '--', 'tracked.txt')
    git('-c', 'user.name=Codex', '-c', 'user.email=codex@openai.com', 'commit', '--quiet', '-m', 'inert source observation fixture')
    expected = git('rev-parse', 'HEAD')
    assert source.git_source_observation(tmp_path).head == expected
    if dirty == 'tracked':
        file.write_text('changed fixture', encoding='utf-8')
    elif dirty == 'untracked-newline':
        # Windows filenames cannot contain a newline; spaces still exercise the
        # same NUL-framed path entry without relying on line-oriented parsing.
        (tmp_path/'untracked name.txt').write_text('inert', encoding='utf-8')
    else:
        git('mv', '--', 'tracked.txt', 'renamed fixture.txt')
    with pytest.raises(source.SourceObservationError, match='^source_unavailable$'):
        source.git_source_observation(tmp_path)
