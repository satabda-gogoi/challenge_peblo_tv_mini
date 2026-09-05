import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import User
from app.models.enums import UserRole


engine = create_engine(
    settings.database_url_sync
)


USERNAME = "admin"
PASSWORD = "admin123"
FULL_NAME = "Administrator"
EMAIL = "admin@example.com"


with Session(engine) as db:

    existing = db.execute(
        select(User).where(
            User.username == USERNAME
        )
    ).scalar_one_or_none()

    if existing:
        print("User already exists.")
    else:
        user = User(
            username=USERNAME,
            full_name=FULL_NAME,
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            role=UserRole.ADMIN,
        )

        db.add(user)
        db.commit()

        print("Admin user created.")
        print("Username:", USERNAME)
        print("Password:", PASSWORD)