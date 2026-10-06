import os
import tempfile

# Point the app at a throwaway database before it is imported.
_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_file.name}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    with TestClient(app) as c:
        yield c


GUEST = {"X-User-Id": "7"}  # Aarav, the demo guest
OTHER_GUEST = {"X-User-Id": "8"}
HOST = {"X-User-Id": "1"}  # Ananya, owns listings 1-8
