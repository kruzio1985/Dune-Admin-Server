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
