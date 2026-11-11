# @dataclass: generated __init__, __repr__, __eq__; defaults; field(default_factory=...)
from dataclasses import dataclass, field
@dataclass
class Point:
    x: int
    y: int = 0
p = Point(1, 2)
q = Point(5)
print("repr:", p, q, [p, q])
print("fields:", p.x, p.y, q.y)
print("keyword init:", Point(y=7, x=3), Point(x=1))
print("eq:", p == Point(1, 2), p == q, p != q, p == (1, 2))
p.x = 10
p.y += 1
print("mutable:", p)
@dataclass
class Student:
    name: str
    grades: list = field(default_factory=list)
    tags: dict = field(default_factory=dict)
    active: bool = True
    def average(self):
        return sum(self.grades) / len(self.grades) if self.grades else 0.0
    def add(self, grade):
        self.grades.append(grade)
        return self
ann = Student("Ann")
bob = Student("Bob", [90, 80], active=False)
ann.add(100).add(95)
print("default_factory gives separate lists:", ann.grades, bob.grades, Student("Cy").grades)
print("methods:", ann.average(), bob.average(), Student("Cy").average())
print("repr with defaults:", ann)
print("repr full:", bob)
print("eq compares all fields:", Student("X", [1]) == Student("X", [1]), Student("X") == Student("Y"))
@dataclass
class Rect:
    width: float
    height: float
    label: str = "rect"
    def area(self) -> float:
        return self.width * self.height
    @property
    def is_square(self) -> bool:
        return self.width == self.height
    def __str__(self):
        return f"{self.label} {self.width}x{self.height}"
r = Rect(2.0, 3.5)
print("str override:", r, "| repr still generated:", repr(r))
print("method/property:", r.area(), r.is_square, Rect(2, 2).is_square)
shapes = [Rect(3, 1, "c"), Rect(1, 1, "a"), Rect(2, 5, "b")]
print("sort by key:", [s.label for s in sorted(shapes, key=lambda s: s.area())])
print("list search uses eq:", Rect(1, 1, "a") in shapes, Rect(9, 9) in shapes, shapes.index(Rect(2, 5, "b")))
@dataclass
class Team:
    name: str
    lead: Point
    members: list = field(default_factory=list)
t = Team("core", Point(0, 0))
t.members.append("ann")
print("nested dataclass:", t)
print("nested eq:", t == Team("core", Point(0, 0), ["ann"]), t.lead == Point(0, 0))
print("isinstance:", isinstance(p, Point), type(t).__name__)
try:
    Point()
except TypeError:
    print("missing required field raises TypeError")
print("different classes are never equal:", Point(1, 2) == Rect(1, 2))
