# @property (with setter), @staticmethod, @classmethod, super() in a diamond
class Temperature:
    def __init__(self, celsius):
        self._celsius = celsius
    @property
    def celsius(self):
        return self._celsius
    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value
    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32
t = Temperature(25)
print("getter:", t.celsius, t.fahrenheit)
t.celsius = 100
print("setter:", t.celsius, t.fahrenheit)
t.celsius += 10
print("augmented assignment through property:", t.celsius)
try:
    t.celsius = -300
except ValueError as e:
    print("validation:", e, "| value kept:", t.celsius)
try:
    t.fahrenheit = 10
except AttributeError:
    print("property without setter: AttributeError")
class Date:
    def __init__(self, year, month, day):
        self.year, self.month, self.day = year, month, day
    @classmethod
    def from_string(cls, text):
        year, month, day = (int(part) for part in text.split("-"))
        return cls(year, month, day)
    @staticmethod
    def is_leap(year):
        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    def __repr__(self):
        return f"{type(self).__name__}({self.year}, {self.month}, {self.day})"
class Stamp(Date):
    made = 0
    @classmethod
    def create(cls, text):
        cls.made += 1
        return cls.from_string(text)
d = Date.from_string("2024-02-29")
print("classmethod constructor:", d)
print("staticmethod:", Date.is_leap(2024), d.is_leap(1900), Date.is_leap(2000))
print("classmethod builds the subclass:", Stamp.from_string("1999-12-31"))
Stamp.create("2001-01-01"); Stamp.create("2002-02-02")
print("class-level counter:", Stamp.made)
class Base:
    def hello(self):
        return ["Base"]
class Left(Base):
    def hello(self):
        return ["Left"] + super().hello()
class Right(Base):
    def hello(self):
        return ["Right"] + super().hello()
class Both(Left, Right):
    def hello(self):
        return ["Both"] + super().hello()
print("diamond super() chain:", Both().hello())
print("each class alone:", Left().hello(), Right().hello())
