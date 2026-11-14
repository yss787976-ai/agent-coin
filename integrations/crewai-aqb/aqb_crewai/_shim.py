"""Minimal BaseTool stand-in used when CrewAI is not installed.

It mirrors the small surface the tools need: ``name``, ``description``,
``args_schema``, ``run()`` and ``_run()``. Install CrewAI to get the real
pydantic-backed tool class.
"""

from __future__ import annotations

from typing import Any


class BaseTool:
    name: str = ""
    description: str = ""
    args_schema: Any = None

    def __init__(self, **kwargs: Any) -> None:
        for key, value in kwargs.items():
            if not hasattr(type(self), key):
                raise TypeError(f"unexpected tool argument: {key!r}")
            setattr(self, key, value)

    def _run(self, *args: Any, **kwargs: Any) -> Any:
        raise NotImplementedError("tool subclasses must implement _run")

    def run(self, tool_input: Any = None, **kwargs: Any) -> Any:
        if isinstance(tool_input, dict):
            kwargs = {**tool_input, **kwargs}
        elif tool_input is not None:
            return self._run(tool_input)
        return self._run(**kwargs)

    def __call__(self, **kwargs: Any) -> Any:
        return self.run(**kwargs)
