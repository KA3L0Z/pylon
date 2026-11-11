# Classes: attributes, methods, class attributes, __init__, __repr__ / __str__
class Dog:
    species = "canine"
    count = 0
    def __init__(self, name, age=1):
        self.name = name
        self.age = age
        self.tricks = []
        Dog.count += 1
    def speak(self):
        return self.name + " says woof"
    def learn(self, trick):
        self.tricks.append(trick)
        return self
    def birthday(self):
        self.age += 1
    def __str__(self):
        return f"{self.name} ({self.age})"
    def __repr__(self):
        return f"Dog({self.name!r}, {self.age})"
rex = Dog("Rex", 3)
fido = Dog("Fido")
print("attributes:", rex.name, rex.age, fido.age)
print("method:", rex.speak())
print("str:", rex, str(fido))
print("repr:", repr(rex), [rex, fido])
print("f-string uses str:", f"{rex} and {fido!r}")
rex.birthday()
rex.age += 1
print("mutated:", rex.age)
rex.learn("sit").learn("roll")
print("chained methods:", rex.tricks, fido.tricks)
print("class attribute:", Dog.species, rex.species, Dog.count)
fido.species = "robot"
print("instance shadows class attr:", fido.species, rex.species, Dog.species)
Dog.species = "dog"
print("class attr changed:", rex.species, fido.species)
rex.nickname = "T-Rex"
print("new attribute on the fly:", rex.nickname, hasattr(fido, "nickname"))
print("type/isinstance:", type(rex).__name__, isinstance(rex, Dog), isinstance("rex", Dog))
print("call via class:", Dog.speak(fido))
speak = rex.speak
print("bound method value:", speak())
print("default equality is identity:", rex == rex, rex == Dog("Rex", 3), rex is rex)
other = rex
other.name = "Max"
print("alias:", rex.name)

class Empty:
    pass

class Shared:
    items = []
    def __init__(self):
        self.own = []
e = Empty()
e.x = 1
e.y = e.x + 1
print("empty class as record:", e.x, e.y)
s1, s2 = Shared(), Shared()
s1.items.append("shared")
s1.own.append("mine")
print("mutable class attr is shared:", s2.items, s2.own)
print("truthy by default:", bool(e), bool(Empty()))
dogs = [Dog("b", 2), Dog("a", 5), Dog("c", 1)]
print("sort objects by attribute:", sorted(dogs, key=lambda d: d.age))
print("oldest:", max(dogs, key=lambda d: d.age).name, "| dogs created:", Dog.count)
print("class name:", Dog.__name__, type(e).__name__)
