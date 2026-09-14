# Copyright (c) 2026 Kruzio
# Licensed under the PolyForm Noncommercial License 1.0.0.
# Non-commercial use only. Commercial use and selling of this code are prohibited.
# Derivative works must retain this license and link to: https://github.com/kruzio1985/Dune-Admin-Server
# https://polyformproject.org/licenses/noncommercial/1.0.0/

"""INI file read/write service."""
import configparser
from io import StringIO

class INIService:
    @staticmethod
    def parse(content: str) -> dict:
        cfg = configparser.ConfigParser()
        cfg.read_string(content)
        return {s: dict(cfg[s]) for s in cfg.sections()}

    @staticmethod
    def dump(data: dict) -> str:
        buf = StringIO()
        for section, values in data.items():
            buf.write(f"[{section}]\n")
            for k, v in values.items():
                buf.write(f"{k}={v}\n")
            buf.write("\n")
        return buf.getvalue()

    @staticmethod
    def merge(current: dict, updates: dict) -> dict:
        result = dict(current)
        for section, values in updates.items():
            result.setdefault(section, {}).update(values)
        return result
