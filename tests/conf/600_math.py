# math module
import math
from math import sqrt, pi, floor as fl

print("constants:", math.pi, math.e, math.inf, -math.inf)
print("sqrt:", math.sqrt(16), math.sqrt(2), math.sqrt(0), sqrt(6.25), math.sqrt(10 ** 10))
print("floor/ceil:", math.floor(2.7), math.ceil(2.1), math.floor(-2.7), math.ceil(-2.1), math.floor(5), math.ceil(5.0))
print("floor/ceil types:", type(math.floor(2.7)).__name__, type(math.ceil(2.1)).__name__)
print("trunc:", math.trunc(2.9), math.trunc(-2.9), math.trunc(7))
print("fabs:", math.fabs(-3), math.fabs(2.5), type(math.fabs(-3)).__name__)
print("gcd:", math.gcd(12, 18), math.gcd(17, 5), math.gcd(0, 9), math.gcd(-12, 18))
print("lcm:", math.lcm(4, 6), math.lcm(3, 7), math.lcm(5, 5))
print("factorial:", math.factorial(0), math.factorial(5), math.factorial(20), math.factorial(30))
print("isqrt:", math.isqrt(16), math.isqrt(17), math.isqrt(0), math.isqrt(10 ** 20), math.isqrt(99))
print("comb/perm:", math.comb(5, 2), math.comb(10, 0), math.comb(52, 5), math.perm(5, 2), math.perm(10, 3))
print("prod:", math.prod([1, 2, 3, 4]), math.prod([]), math.prod([2.5, 2]), math.prod(range(1, 6)))
print("hypot:", math.hypot(3, 4), math.hypot(5, 12), math.hypot(0, 0))
print("log exact:", math.log(1), math.log2(8), math.log2(1024), math.log10(1000), math.log10(1))
print("log rounded:", round(math.log(10), 6), round(math.log(math.e), 6), round(math.log2(10), 6),
      round(math.log10(2), 6), round(math.log(8, 2), 6), round(math.log(100, 10), 6))
print("sin/cos exact:", math.sin(0), math.cos(0))
print("sin/cos rounded:", round(math.sin(math.pi / 2), 6), round(math.cos(math.pi), 6),
      round(math.sin(math.pi / 6), 6), round(math.cos(math.pi / 3), 6), round(math.sin(1), 6), round(math.cos(1), 6))
print("isinf:", math.isinf(math.inf), math.isinf(-math.inf), math.isinf(1e308))
print("isnan:", math.isnan(float("nan")), math.isnan(1.0), math.isnan(math.inf))
print("inf compare:", math.inf > 10 ** 100, -math.inf < -10 ** 100, math.inf == float("inf"),
      min(3, math.inf), max(-math.inf, -5), math.inf + 1 == math.inf)
print("imported names:", sqrt(81), round(pi, 4), fl(9.99))
print("pi formatting:", f"{math.pi:.4f}", round(math.pi, 2), int(math.pi), math.floor(math.pi * 100) / 100)
print("circle:", round(math.pi * 2 ** 2, 3), round(2 * math.pi * 2, 3))
print("distance:", math.sqrt((4 - 1) ** 2 + (6 - 2) ** 2), math.hypot(4 - 1, 6 - 2))
print("perfect squares:", [n for n in range(1, 30) if math.isqrt(n) ** 2 == n])
print("is prime 97:", all(97 % d for d in range(2, math.isqrt(97) + 1)))
print("ceil division:", math.ceil(7 / 2), -(-7 // 2), math.ceil(10 / 5))
print("digit count:", math.floor(math.log10(12345)) + 1, len(str(12345)))
print("reduce a fraction:", 12 // math.gcd(12, 18), 18 // math.gcd(12, 18))
print("sqrt vs power:", math.sqrt(49) == 49 ** 0.5, math.isqrt(50), int(math.sqrt(50)))
print("e:", round(math.e, 5), round(math.e ** 2, 4))
print("sum of sqrt:", round(sum(math.sqrt(n) for n in range(1, 5)), 4))
best = math.inf
for cost in [7, 3, 9]:
    if cost < best:
        best = cost
print("running minimum from inf:", best)
try:
    math.sqrt(-1)
except ValueError:
    print("sqrt of a negative raises ValueError")
try:
    math.factorial(-1)
except ValueError:
    print("factorial of a negative raises ValueError")
try:
    math.log(0)
except ValueError:
    print("log(0) raises ValueError")
