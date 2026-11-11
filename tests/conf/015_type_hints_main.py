"""Module docstring: type hints are parsed and ignored at run time."""
from typing import Any, Callable, Dict, Iterable, List, Optional, Set, Tuple, Union

count: int = 3
ratio: float = 0.5
name: str = "minipy"
flags: List[bool] = [True, False]
lookup: Dict[str, int] = {"a": 1}
maybe: Optional[int] = None
pair: Tuple[int, str] = (1, "x")
either: Union[int, str] = "text"
seen: Set[int] = set()
declared_only: int
modern: list[int] = [1, 2]
table: dict[str, list[int]] = {"k": [1]}
print("annotated variables:", count, ratio, name, flags, lookup, maybe, pair, either, seen)
print("builtin generics:", modern, table)

def add(a: int, b: int = 2) -> int:
    """Add two numbers."""
    return a + b

def find(values: List[int], target: int) -> Optional[int]:
    for i, v in enumerate(values):
        if v == target:
            return i
    return None

def apply(fn: Callable[[int], int], values: Iterable[int]) -> List[int]:
    return [fn(v) for v in values]

def anything(x: Any, *args: int, **kwargs: str) -> None:
    print("anything:", x, args, kwargs)

def hints_are_not_enforced(n: int) -> str:
    return n

print("add:", add(1), add(1, 5))
print("find:", find([5, 6, 7], 6), find([5, 6, 7], 9))
print("apply:", apply(lambda v: v * v, range(4)))
anything(1, 2, 3, k="v")
print("not enforced:", hints_are_not_enforced(3.5))

class Point:
    x: int
    y: int = 0

    def __init__(self, x: int, y: int = 0) -> None:
        self.x: int = x
        self.y = y

    def moved(self, dx: int, dy: int) -> "Point":
        return Point(self.x + dx, self.y + dy)

    def __repr__(self) -> str:
        return f"Point({self.x}, {self.y})"

p: Point = Point(1, 2).moved(3, 4)
print("class with hints:", p)

def main() -> None:
    total: int = 0
    for i in range(4):
        total += i
    print("main ran, total:", total)

print("__name__ is:", __name__)
if __name__ == "__main__":
    main()
