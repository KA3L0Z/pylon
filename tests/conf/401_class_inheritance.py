# Inheritance: overriding, super(), multiple inheritance, isinstance / issubclass
from abc import ABC, abstractmethod
class Animal:
    sound = "..."
    def __init__(self, name):
        self.name = name
    def speak(self):
        return f"{self.name} says {self.sound}"
    def __repr__(self):
        return f"{type(self).__name__}({self.name!r})"
class Dog(Animal):
    sound = "woof"
    def fetch(self):
        return self.name + " fetches"
class Puppy(Dog):
    def __init__(self, name, weeks):
        super().__init__(name)
        self.weeks = weeks
    def speak(self):
        return super().speak() + " (squeaky)"
class Cat(Animal):
    sound = "meow"
pets = [Animal("generic"), Dog("Rex"), Puppy("Bit", 8), Cat("Tom")]
for p in pets:
    print("speak:", p.speak())
print("repr:", pets)
print("inherited method:", pets[2].fetch(), pets[2].weeks)
print("isinstance:", isinstance(pets[2], Puppy), isinstance(pets[2], Dog), isinstance(pets[2], Animal),
      isinstance(pets[1], Puppy))
print("isinstance tuple:", isinstance(pets[3], (Dog, Cat)), isinstance(pets[0], (Dog, Cat)))
print("issubclass:", issubclass(Puppy, Animal), issubclass(Dog, Puppy), issubclass(Dog, Dog))
print("type is exact:", type(pets[2]) is Puppy, type(pets[2]) is Dog, type(pets[2]) == Puppy)
print("hasattr:", hasattr(pets[3], "fetch"), hasattr(pets[1], "fetch"))
class Shape(ABC):
    @abstractmethod
    def area(self):
        ...
    def describe(self):
        return f"{type(self).__name__} with area {self.area()}"
class Rect(Shape):
    def __init__(self, w, h):
        self.w, self.h = w, h
    def area(self):
        return self.w * self.h
class Square(Rect):
    def __init__(self, side):
        super().__init__(side, side)
print("abstract base:", Rect(2, 3).describe(), "|", Square(4).describe())
print("polymorphism:", sum(s.area() for s in [Rect(1, 2), Square(3)]), isinstance(Square(1), Shape))
class Walker:
    def move(self):
        return "walk"
    def legs(self):
        return 4
class Swimmer:
    def move(self):
        return "swim"
    def fins(self):
        return 2
class Duck(Walker, Swimmer):
    def legs(self):
        return 2
d = Duck()
print("multiple inheritance:", d.move(), d.legs(), d.fins(), isinstance(d, Swimmer))
