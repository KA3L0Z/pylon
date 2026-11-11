# if / elif / else and conditional expressions
def classify(n):
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    elif n < 10:
        return "small"
    else:
        return "large"
for n in [-5, 0, 7, 10, 99]:
    print("classify", n, "->", classify(n))

def grade(score):
    if score >= 90:
        g = "A"
    elif score >= 80:
        g = "B"
    elif score >= 70:
        g = "C"
    else:
        g = "F"
    return g
print("grades:", [grade(s) for s in [95, 90, 85, 70, 69, 0]])
x = 7
if x > 5:
    print("simple if: x > 5")
if x > 10:
    print("not printed")
else:
    print("else branch")
if x % 2 == 0:
    print("even")
elif x % 3 == 0:
    print("divisible by 3")
elif x % 7 == 0:
    print("divisible by 7")
if x > 0 and x < 10: print("one-line if")
if x: print("truthy int")
if not []: print("empty list is falsy")
if "a" in "cat" and len("cat") == 3:
    print("combined condition")
if x > 5:
    if x > 6:
        if x > 7:
            print("x > 7")
        else:
            print("nested: x is 7")
    else:
        print("x is 6")
print("ternary:", "even" if x % 2 == 0 else "odd")
print("nested ternary:", "neg" if x < 0 else "zero" if x == 0 else "pos")
sign = -1 if x < 0 else 1
print("ternary assign:", sign)
print("ternary in list:", [("fizz" if i % 3 == 0 else i) for i in range(1, 7)])
value = None
print("ternary none:", "missing" if value is None else value)
print("ternary is lazy:", 1 if True else 1 / 0)
age = 20
label = "minor" if age < 18 else "adult" if age < 65 else "senior"
print("label:", label)
items = []
if items:
    print("has items")
elif items is None:
    print("none")
else:
    print("empty list branch")
