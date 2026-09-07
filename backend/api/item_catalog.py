"""Items Catalog API - serves parsed item catalog."""
import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(tags=["Items Catalog"])

CATALOG_PATH = Path(__file__).parent.parent.parent / "data" / "catalogs" / "item_catalog.json"

@router.get("/catalog")
async def get_catalog():
    """Return full item catalog organized by category."""
    if not CATALOG_PATH.exists():
        return {"categories": {}, "stats": {}, "total": 0}
    with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)
