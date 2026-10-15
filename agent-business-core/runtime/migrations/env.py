import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.acquisition import models as acquisition_models  # noqa: F401
from pinet_core.acquisition import module_models as acquisition_module_models  # noqa: F401
from pinet_core.acquisition import task_models as acquisition_task_models  # noqa: F401
from pinet_core.acquisition import work_models as acquisition_work_models  # noqa: F401
from pinet_core.business_discovery import models as business_discovery_models  # noqa: F401
from pinet_core.config import settings
from pinet_core.content_work import models as content_work_models  # noqa: F401
from pinet_core.control import models as control_models  # noqa: F401
from pinet_core.creation import execution_profile_models as pipeline_profile_models  # noqa: F401
from pinet_core.creation import models as creation_models  # noqa: F401
from pinet_core.creation_registration import models as creation_registration_models  # noqa: F401
from pinet_core.customer import models as customer_models  # noqa: F401
from pinet_core.customer_agents import models as customer_agent_models  # noqa: F401
from pinet_core.customer_profile import models as customer_profile_models  # noqa: F401
from pinet_core.customer_profile import refresh_models as customer_source_refresh_models  # noqa: F401
from pinet_core.director import models as director_models  # noqa: F401
from pinet_core.facebook import models as facebook_models  # noqa: F401
from pinet_core.models import Base
from pinet_core.public_projects import models as public_models  # noqa: F401
from pinet_core.site_build import continuation_models as site_continuation_models  # noqa: F401
from pinet_core.site_build import models as site_foundation_models  # noqa: F401
from pinet_core.tasks import models as task_models  # noqa: F401
from pinet_core.workspace_team import models as workspace_team_models  # noqa: F401
from pinet_core.workspace_topics import models as workspace_topic_models  # noqa: F401


def run(connection):
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def online():
    engine = create_async_engine(settings().admin_database_url)
    async with engine.connect() as connection:
        await connection.run_sync(run)
    await engine.dispose()


asyncio.run(online())
