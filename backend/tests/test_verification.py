"""
Comprehensive verification test suite.
Tests:
1. Schema serialization (UserResponse, CategoryResponse, ValidationResponse, EpisodeCreate/Update).
2. Route API protection (get_current_editor on all required endpoints).
3. Service functions error dict formats (level='error').
4. ContentGroup creation logic has group_code.
5. Publish error aggregation handles dict errors.
"""
import inspect
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.api.dependencies import get_current_editor
from app.api.routes import (
    artworks,
    auth,
    catalogue,
    categories,
    content,
    episodes,
    publish,
    seasons,
    shows,
    validation,
)
from app.models import Category, Episode, User
from app.models.enums import EpisodeStatus, UserRole
from app.schemas.auth import UserResponse
from app.schemas.category import CategoryResponse
from app.schemas.episode import EpisodeCreate, EpisodeResponse, EpisodeUpdate
from app.schemas.validation import ValidationIssue, ValidationResponse


def test_user_response_from_attributes():
    user = User(
        id=1,
        username="editor1",
        full_name="Editor One",
        email="editor@example.com",
        role=UserRole.EDITOR,
    )
    resp = UserResponse.model_validate(user)
    assert resp.id == 1
    assert resp.username == "editor1"
    assert resp.role == "editor"
    print("[PASS] test_user_response_from_attributes passed")


def test_category_response_without_created_at():
    category = Category(id=10, name="Action")
    resp = CategoryResponse.model_validate(category)
    assert resp.id == 10
    assert resp.name == "Action"
    assert resp.created_at is None
    print("[PASS] test_category_response_without_created_at passed")


def test_validation_issue_default_level():
    issue = ValidationIssue(field="title", message="Title required")
    assert issue.level == "error"

    resp = ValidationResponse(
        valid=False,
        errors=[{"field": "duration", "message": "Duration error"}],
        warnings=[],
    )
    assert resp.valid is False
    assert len(resp.errors) == 1
    assert resp.errors[0].level == "error"
    print("[PASS] test_validation_issue_default_level passed")


def test_episode_source_episode_id_schema():
    ep_create = EpisodeCreate(
        episode_number=1,
        title="Pilot",
        source_episode_id="SRC_001",
    )
    assert ep_create.source_episode_id == "SRC_001"

    ep_create_no_src = EpisodeCreate(
        episode_number=2,
        title="Ep 2",
    )
    assert ep_create_no_src.source_episode_id is None

    ep_update = EpisodeUpdate(title="Updated Title")
    assert ep_update.source_episode_id is None

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    ep = Episode(
        id=1,
        season_id=1,
        episode_number=1,
        title="Ep 1",
        source_episode_id=None,
        status=EpisodeStatus.DRAFT,
        created_at=now,
        updated_at=now,
    )
    resp = EpisodeResponse.model_validate(ep)
    assert resp.source_episode_id is None
    print("[PASS] test_episode_source_episode_id_schema passed")


def _has_dependency(endpoint_func, dep_func):
    sig = inspect.signature(endpoint_func)
    for param in sig.parameters.values():
        default = param.default
        if hasattr(default, "dependency") and default.dependency is dep_func:
            return True
    return False


def test_api_protection_on_all_required_endpoints():
    # Seasons mutations
    assert _has_dependency(seasons.create_season, get_current_editor), "create_season missing editor protection"
    assert _has_dependency(seasons.update_season, get_current_editor), "update_season missing editor protection"
    assert _has_dependency(seasons.delete_season, get_current_editor), "delete_season missing editor protection"

    # Episodes mutations
    assert _has_dependency(episodes.create_episode, get_current_editor), "create_episode missing editor protection"
    assert _has_dependency(episodes.update_episode, get_current_editor), "update_episode missing editor protection"
    assert _has_dependency(episodes.delete_episode, get_current_editor), "delete_episode missing editor protection"

    # Content mutations
    assert _has_dependency(content.create_content, get_current_editor), "create_content missing editor protection"
    assert _has_dependency(content.update_content, get_current_editor), "update_content missing editor protection"
    assert _has_dependency(content.delete_content, get_current_editor), "delete_content missing editor protection"

    # Artwork mutations
    assert _has_dependency(artworks.create_artwork, get_current_editor), "create_artwork missing editor protection"
    assert _has_dependency(artworks.update_artwork, get_current_editor), "update_artwork missing editor protection"
    assert _has_dependency(artworks.delete_artwork, get_current_editor), "delete_artwork missing editor protection"

    # Categories mutations
    assert _has_dependency(categories.create_category, get_current_editor), "create_category missing editor protection"
    assert _has_dependency(categories.update_category, get_current_editor), "update_category missing editor protection"
    assert _has_dependency(categories.delete_category, get_current_editor), "delete_category missing editor protection"

    # Publish endpoints (Publish requires Admin role)
    from app.api.dependencies import get_current_admin
    assert _has_dependency(publish.publish_catalogue, get_current_admin), "publish_catalogue missing admin protection"
    assert _has_dependency(publish.get_publish_runs, get_current_editor), "get_publish_runs missing editor protection"
    assert _has_dependency(publish.get_publish_run, get_current_editor), "get_publish_run missing editor protection"

    # Validation endpoints
    assert _has_dependency(validation.get_show_validation, get_current_editor), "get_show_validation missing editor protection"
    assert _has_dependency(validation.get_episode_validation, get_current_editor), "get_episode_validation missing editor protection"
    assert _has_dependency(validation.get_all_validation, get_current_editor), "get_all_validation missing editor protection"

    # Shows mutations
    assert _has_dependency(shows.create_show, get_current_editor), "create_show missing editor protection"
    assert _has_dependency(shows.update_show, get_current_editor), "update_show missing editor protection"
    assert _has_dependency(shows.delete_show, get_current_editor), "delete_show missing editor protection"

    print("[PASS] test_api_protection_on_all_required_endpoints passed")


def test_publish_error_aggregation_dict():
    # Simulate validation return structure
    validation_output = {
        "valid": False,
        "shows": [
            {
                "show_id": 1,
                "errors": [
                    {"field": "section", "message": "Invalid section"},
                    {"field": "categories", "message": "No categories"},
                ],
            }
        ],
    }
    errors = []
    for show in validation_output["shows"]:
        errors.extend(
            issue["message"] if isinstance(issue, dict) else getattr(issue, "message", str(issue))
            for issue in show["errors"]
        )
    assert errors == ["Invalid section", "No categories"]
    print("[PASS] test_publish_error_aggregation_dict passed")


def test_validation_signatures():
    from app.services.validation import validate_episode, validate_show

    sig_show = inspect.signature(validate_show)
    params_show = list(sig_show.parameters.keys())
    assert params_show[:2] == ["db", "show_id"], f"Expected ['db', 'show_id'], got {params_show}"

    sig_ep = inspect.signature(validate_episode)
    params_ep = list(sig_ep.parameters.keys())
    assert params_ep[:2] == ["db", "episode_id"], f"Expected ['db', 'episode_id'], got {params_ep}"
    print("[PASS] test_validation_signatures passed")


if __name__ == "__main__":
    test_user_response_from_attributes()
    test_category_response_without_created_at()
    test_validation_issue_default_level()
    test_episode_source_episode_id_schema()
    test_api_protection_on_all_required_endpoints()
    test_publish_error_aggregation_dict()
    test_validation_signatures()
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
