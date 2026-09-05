from pydantic import BaseModel


class ValidationIssue(BaseModel):
    level: str = "error"
    field: str
    message: str


class ValidationResponse(BaseModel):
    valid: bool
    errors: list[ValidationIssue]
    warnings: list[ValidationIssue]