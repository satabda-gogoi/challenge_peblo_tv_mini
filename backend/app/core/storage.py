import os
from abc import ABC, abstractmethod
from pathlib import Path


class StorageService(ABC):
    """
    Abstract storage service for media assets and catalogue artifacts.
    Enables zero-code-change swapping between Local Disk, Cloudflare R2, MinIO, or S3.
    """

    @abstractmethod
    async def save_file(
        self,
        content: bytes,
        destination_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Save raw bytes to storage and return accessible URI."""
        pass

    @abstractmethod
    async def get_file(self, key: str) -> bytes | None:
        """Retrieve raw bytes from storage by key."""
        pass

    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        """Delete file from storage by key."""
        pass

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Generate public or mount-accessible URL for a key."""
        pass


class LocalStorageService(StorageService):
    """
    Local filesystem storage implementation.
    Files are stored in the local catalogue media directory and served
    via FastAPI's /media static mount.
    """

    def __init__(self, base_dir: str | Path = "data/catalogue/uploads", url_prefix: str = "/media"):
        self.base_dir = Path(base_dir)
        self.url_prefix = url_prefix.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(
        self,
        content: bytes,
        destination_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        clean_key = destination_key.lstrip("/\\")
        file_path = self.base_dir / clean_key
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Atomic file write to avoid half-written files
        temp_path = file_path.with_suffix(f"{file_path.suffix}.tmp")
        temp_path.write_bytes(content)
        temp_path.replace(file_path)

        return self.get_url(clean_key)

    async def get_file(self, key: str) -> bytes | None:
        clean_key = key.lstrip("/\\")
        file_path = self.base_dir / clean_key
        if file_path.exists() and file_path.is_file():
            return file_path.read_bytes()
        return None

    async def delete_file(self, key: str) -> bool:
        clean_key = key.lstrip("/\\")
        file_path = self.base_dir / clean_key
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    def get_url(self, key: str) -> str:
        clean_key = key.lstrip("/\\")
        return f"{self.url_prefix}/{clean_key}"


class CloudflareR2StorageService(StorageService):
    """
    Cloudflare R2 (S3-compatible) object storage implementation for production.
    Requires R2 account credentials and bucket configuration.
    """

    def __init__(
        self,
        account_id: str = "",
        access_key_id: str = "",
        secret_access_key: str = "",
        bucket_name: str = "peblo-catalogue",
        public_url: str = "https://assets.peblo.tv",
    ):
        self.account_id = account_id
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.bucket_name = bucket_name
        self.public_url = public_url.rstrip("/")

    def _get_client(self):
        try:
            import boto3
        except ImportError:
            raise RuntimeError(
                "boto3 package required for Cloudflare R2 storage. Install via `pip install boto3`."
            )

        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name="auto",
        )

    async def save_file(
        self,
        content: bytes,
        destination_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        clean_key = destination_key.lstrip("/")
        client = self._get_client()
        client.put_object(
            Bucket=self.bucket_name,
            Key=clean_key,
            Body=content,
            ContentType=content_type,
        )
        return self.get_url(clean_key)

    async def get_file(self, key: str) -> bytes | None:
        clean_key = key.lstrip("/")
        client = self._get_client()
        try:
            response = client.get_object(Bucket=self.bucket_name, Key=clean_key)
            return response["Body"].read()
        except Exception:
            return None

    async def delete_file(self, key: str) -> bool:
        clean_key = key.lstrip("/")
        client = self._get_client()
        try:
            client.delete_object(Bucket=self.bucket_name, Key=clean_key)
            return True
        except Exception:
            return False

    def get_url(self, key: str) -> str:
        clean_key = key.lstrip("/")
        return f"{self.public_url}/{clean_key}"


# Singleton instance factory
_storage_instance: StorageService | None = None


def get_storage_service() -> StorageService:
    global _storage_instance
    if _storage_instance is None:
        backend_type = os.getenv("STORAGE_BACKEND", "local").lower()
        if backend_type == "r2":
            _storage_instance = CloudflareR2StorageService(
                account_id=os.getenv("R2_ACCOUNT_ID", ""),
                access_key_id=os.getenv("R2_ACCESS_KEY_ID", ""),
                secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
                bucket_name=os.getenv("R2_BUCKET_NAME", "peblo-catalogue"),
                public_url=os.getenv("R2_PUBLIC_URL", "https://assets.peblo.tv"),
            )
        else:
            upload_path = Path(os.getenv("MEDIA_DIR", "data/catalogue/uploads"))
            _storage_instance = LocalStorageService(
                base_dir=upload_path,
                url_prefix="/media",
            )
    return _storage_instance
