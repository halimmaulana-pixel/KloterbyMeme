from collections import defaultdict
from collections.abc import Callable


Handler = Callable[[dict], None]


class EventBus:
    def __init__(self):
        self._handlers: dict[str, list[Handler]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: Handler) -> None:
        self._handlers[event_name].append(handler)

    def emit(self, event_name: str, payload: dict) -> None:
        for handler in self._handlers[event_name]:
            handler(payload)


event_bus = EventBus()
