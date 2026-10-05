import argparse
import json
from pathlib import Path

from pinet_core import adaptive_instructions, agent_instructions

parser = argparse.ArgumentParser()
parser.add_argument('incumbent', type=Path)
parser.add_argument('candidate', type=Path)
parser.add_argument('patch', type=Path)
parser.add_argument('--site', default='traktoriupadangos')
parser.add_argument('--activate-local', action='store_true')
args = parser.parse_args()
before = json.loads(args.incumbent.read_text(encoding='utf-8'))
after = json.loads(args.candidate.read_text(encoding='utf-8'))
patch = json.loads(args.patch.read_text(encoding='utf-8'))
result = adaptive_instructions.compare(before, after, patch['instruction'], patch['scope'])
if args.activate_local and result['state'] == 'local_eligible':
    adaptive_instructions.activate_local(args.site, patch['instruction'], patch['scope'], result,
        agent_instructions.compose(args.site, 'conversation').hash)
    result['local_activated'] = True
else:
    result['local_activated'] = False
output = args.candidate.parent / 'adoption-decision.json'
output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result))
