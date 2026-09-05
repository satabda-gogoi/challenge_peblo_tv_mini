from dataclasses import dataclass
import io
from PIL import Image

SPECS = {
    "poster": {
        "aspect": "2:3",
        "target_px": (600, 900),
        "target_ratio": 2 / 3,
        "min_px": (300, 450),
        "max_px": (1200, 1800),
        "max_kb": 200,
    },
    "banner": {
        "aspect": "16:9",
        "target_px": (1280, 720),
        "target_ratio": 16 / 9,
        "min_px": (800, 450),
        "max_px": (1920, 1080),
        "max_kb": 200,
    },
    "thumbnail": {
        "aspect": "16:9",
        "target_px": (640, 360),
        "target_ratio": 16 / 9,
        "min_px": (320, 180),
        "max_px": (1280, 720),
        "max_kb": 200,
    },
}


@dataclass
class ArtworkValidationResult:
    valid: bool
    error: str | None = None
    width: int | None = None
    height: int | None = None
    size_bytes: int | None = None
    mime_type: str | None = None
    format: str | None = None


def validate_artwork_image(
    file_bytes: bytes,
    artwork_type: str,
    filename: str = "",
) -> ArtworkValidationResult:
    """
    Validates uploaded artwork against reference.json specifications:
    - Enforces 200 KB ceiling
    - Enforces aspect ratio (2:3 for poster, 16:9 for banner/thumbnail) with 5% tolerance
    - Enforces minimum and maximum dimension constraints
    - Produces user-friendly, actionable error messages for editors
    """
    clean_type = artwork_type.lower().strip()
    if clean_type not in SPECS:
        return ArtworkValidationResult(
            valid=False,
            error=f"Invalid artwork type '{artwork_type}'. Allowed types: {', '.join(SPECS.keys())}.",
        )

    spec = SPECS[clean_type]
    size_bytes = len(file_bytes)
    size_kb = size_bytes / 1024

    # 1. Enforce 200 KB Ceiling
    if size_kb > spec["max_kb"]:
        return ArtworkValidationResult(
            valid=False,
            error=(
                f"File size is {size_kb:.1f} KB, exceeding the maximum allowed limit of {spec['max_kb']} KB. "
                f"Please optimize or compress the image before uploading."
            ),
            size_bytes=size_bytes,
        )

    # 2. Inspect image with Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        # Re-open after verify() as recommended in Pillow documentation
        image = Image.open(io.BytesIO(file_bytes))
    except Exception as exc:
        return ArtworkValidationResult(
            valid=False,
            error=f"The uploaded file is not a valid or readable image. Error: {str(exc)}",
            size_bytes=size_bytes,
        )

    width, height = image.size
    img_format = image.format or "JPEG"
    mime_type = f"image/{img_format.lower()}"
    if mime_type == "image/jpg":
        mime_type = "image/jpeg"

    # 3. Enforce Aspect Ratio
    actual_ratio = width / height
    target_ratio = spec["target_ratio"]
    ratio_error = abs(actual_ratio - target_ratio) / target_ratio

    if ratio_error > 0.06:  # > 6% tolerance
        return ArtworkValidationResult(
            valid=False,
            error=(
                f"Invalid aspect ratio for {clean_type}. Required ratio is {spec['aspect']} "
                f"(recommended {spec['target_px'][0]}×{spec['target_px'][1]} px). "
                f"Uploaded image is {width}×{height} px ({round(actual_ratio, 2)}:1 ratio). "
                f"Please crop the image to {spec['aspect']}."
            ),
            width=width,
            height=height,
            size_bytes=size_bytes,
            mime_type=mime_type,
            format=img_format,
        )

    # 4. Enforce Dimension Constraints
    min_w, min_h = spec["min_px"]
    max_w, max_h = spec["max_px"]

    if width < min_w or height < min_h:
        return ArtworkValidationResult(
            valid=False,
            error=(
                f"{clean_type.capitalize()} resolution {width}×{height} px is too small. "
                f"Minimum resolution required is {min_w}×{min_h} px (target: {spec['target_px'][0]}×{spec['target_px'][1]} px). "
                f"Please upload a higher resolution image."
            ),
            width=width,
            height=height,
            size_bytes=size_bytes,
            mime_type=mime_type,
            format=img_format,
        )

    if width > max_w or height > max_h:
        return ArtworkValidationResult(
            valid=False,
            error=(
                f"{clean_type.capitalize()} resolution {width}×{height} px is too large. "
                f"Maximum resolution allowed is {max_w}×{max_h} px (target: {spec['target_px'][0]}×{spec['target_px'][1]} px). "
                f"Please downscale the image."
            ),
            width=width,
            height=height,
            size_bytes=size_bytes,
            mime_type=mime_type,
            format=img_format,
        )

    return ArtworkValidationResult(
        valid=True,
        error=None,
        width=width,
        height=height,
        size_bytes=size_bytes,
        mime_type=mime_type,
        format=img_format,
    )
