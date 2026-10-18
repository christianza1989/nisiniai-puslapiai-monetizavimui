"""Real PostgreSQL negative proof of the final native JSONB admission boundary."""
import os
from copy import deepcopy

import pytest
from test_acquisition_external_binding_pg import external_native  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import model_authority, native_chain
from pinet_core.acquisition.model_contract import PrepareModel
from pinet_core.control.routes import scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.tasks.codex import RunnerError

pytestmark = pytest.mark.skipif(os.environ.get('PINET_PRIVATE_PREVIEW_QA') != '1',
    reason='Dedicated restricted-runtime retained QA, no provider')

async def test_final_native_json_fence_rejects_wrong_peer_fingerprint(external_native):  # noqa: F811
    p = external_native
    request = deepcopy(p['request'])
    request.update(native=deepcopy(p['pair']), stage='research')
    request['campaign']['mode'] = 'research_only'
    request['native']['email_fingerprint'] = '0' * 64
    value = PrepareModel.model_validate(request)
    async with scope(token=token_hash(p['token'])) as tx:
        actor = await customer_session(tx, p['token'])
        async with model_authority.current(tx, value.authorization_id, actor.id, execution=True) as work:
            # The earlier Python check_pair is intentionally absent: exercise
            # this actual last SQL fence's own negative proof.
            with pytest.raises(RunnerError, match='acquisition_native_pair_changed'):
                await native_chain.final_fence(tx, value, work)
