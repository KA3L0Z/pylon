# Arithmetic dunders: + - * / // % unary minus, abs, reflected and in-place forms
class Vec:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __repr__(self):
        return f"Vec({self.x}, {self.y})"
    def __add__(self, other):
        return Vec(self.x + other.x, self.y + other.y)
    def __sub__(self, other):
        return Vec(self.x - other.x, self.y - other.y)
    def __mul__(self, k):
        return Vec(self.x * k, self.y * k)
    def __rmul__(self, k):
        return self * k
    def __truediv__(self, k):
        return Vec(self.x / k, self.y / k)
    def __floordiv__(self, k):
        return Vec(self.x // k, self.y // k)
    def __mod__(self, k):
        return Vec(self.x % k, self.y % k)
    def __neg__(self):
        return Vec(-self.x, -self.y)
    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5
a, b = Vec(3, 4), Vec(1, 2)
print("add:", a + b)
print("sub:", a - b)
print("mul:", a * 2)
print("rmul:", 2 * a)
print("truediv:", a / 2)
print("floordiv:", a // 2)
print("mod:", a % 3)
print("neg:", -a)
print("abs:", abs(a))
c = a
c += b
print("+= without __iadd__ rebinds:", c, a, c is a)
class Money:
    def __init__(self, cents):
        self.cents = cents
    def __repr__(self):
        return f"Money({self.cents})"
    def __add__(self, other):
        if isinstance(other, Money):
            return Money(self.cents + other.cents)
        return Money(self.cents + other)
    def __radd__(self, other):
        return Money(other + self.cents)
print("add:", Money(150) + Money(250), Money(100) + 5)
print("radd:", 5 + Money(100))
print("sum() starts at 0 and uses radd:", sum([Money(100), Money(200), Money(50)]))
class Basket:
    def __init__(self):
        self.items = []
    def __iadd__(self, item):
        self.items.append(item)
        return self
    def __add__(self, item):
        new = Basket()
        new.items = self.items + [item]
        return new
    def __repr__(self):
        return f"Basket({self.items})"
basket = Basket()
alias = basket
basket += "apple"
basket += "pear"
print("__iadd__ mutates in place:", basket, alias is basket)
other = basket + "fig"
print("__add__ makes a new object:", other, basket, other is basket)
