# FizzBuzz, several ways
for i in range(1, 16):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)

def fizzbuzz(n):
    out = ""
    if n % 3 == 0:
        out += "Fizz"
    if n % 5 == 0:
        out += "Buzz"
    return out or str(n)

def fizzbuzz_rules(n, rules):
    words = [word for divisor, word in rules if n % divisor == 0]
    return "".join(words) if words else str(n)

print("function:", " ".join(fizzbuzz(n) for n in range(1, 16)))
print("comprehension:", ["Fizz" * (n % 3 == 0) + "Buzz" * (n % 5 == 0) or n for n in range(10, 16)])
rules = [(3, "Fizz"), (5, "Buzz"), (7, "Bazz")]
print("custom rules:", [fizzbuzz_rules(n, rules) for n in (9, 10, 14, 15, 21, 35, 105, 11)])
counts = {"Fizz": 0, "Buzz": 0, "FizzBuzz": 0, "number": 0}
for n in range(1, 101):
    result = fizzbuzz(n)
    counts[result if result in counts else "number"] += 1
print("counts up to 100:", counts)
print("sum of plain numbers:", sum(n for n in range(1, 101) if fizzbuzz(n) == str(n)))
print("FizzBuzz values:", [n for n in range(1, 61) if fizzbuzz(n) == "FizzBuzz"])
n = 1
line = []
while len(line) < 5:
    if fizzbuzz(n) != str(n):
        line.append(f"{n}={fizzbuzz(n)}")
    n += 1
print("first five words:", ", ".join(line))
