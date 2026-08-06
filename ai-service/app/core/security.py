"""
Security — API key dependency for all authenticated AI service endpoints.

Usage:
    from app.core.security import require_api_key

    @router.get("/some-endpoint")
    def my_endpoint(_: str = Depends(require_api_key)):
        ...

The /health and /cameras/{id}/frame endpoints are intentionally unauthenticated
so monitoring tools and the frontend canvas poller can reach them without headers.
All other endpoints MUST declare Depends(require_api_key).
"""
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from ..config import AI_SERVICE_API_KEY

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str = Security(_api_key_header)) -> str:
    """FastAPI dependency — raises 403 if X-API-Key is missing or wrong."""
    if api_key != AI_SERVICE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return api_key
