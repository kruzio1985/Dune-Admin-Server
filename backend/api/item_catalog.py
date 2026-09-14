# Copyright (c) 2026 Kruzio
# Licensed under the PolyForm Noncommercial License 1.0.0.
# Non-commercial use only. Commercial use and selling of this code are prohibited.
# https://polyformproject.org/licenses/noncommercial/1.0.0/

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
