"""Explicit isolated acceptance binding; never reads shared .env credentials."""
import json
import os
import re
from pathlib import Path

from sqlalchemy.engine import make_url


def capture_config():
    path = os.environ.get('PINET_ACQ_TEST_CONFIG')
    if not path:
        raise RuntimeError('Explicit PINET_ACQ_TEST_CONFIG required; no shared .env fallback')
    config = json.loads(Path(path).read_text(encoding='utf-8-sig'))
    if config.get('fixture_only') is not True:
        raise RuntimeError('Isolated fixture config required')
    for field, username in (('database_url', 'pinet_runtime'), ('admin_database_url', 'acqadmin')):
        url = make_url(config[field])
        if (url.host != '127.0.0.1' or url.port != 15439 or url.database != 'acquisition_capture'
                or url.username != username or url.drivername != 'postgresql+asyncpg'
                or not re.fullmatch('[A-Fa-f0-9]{64}', url.password or '')):
            raise RuntimeError('Isolated capture database binding required')
    return config
