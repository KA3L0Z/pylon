# Comparisons, boolean operators returning operands, identity and membership
print("eq/ne:", 3 == 3, 3 != 4, "a" == "a", [1, 2] == [1, 2])
print("order:", 2 < 3, 3 <= 3, 5 > 7, 7 >= 7)
x = 5
print("chained:", 1 < x < 10, 1 < x < 3, 0 <= x <= 5 < 6)
print("chained eq:", 1 == 1 == 1, 1 < 2 > 1, 3 > 2 > 1 > 0)
print("chained mixed:", 1 < 2 == 2, 5 != 4 != 5)
print("str compare:", "apple" < "banana", "Zebra" < "apple", "abc" < "abd", "ab" < "abc")
print("seq compare:", [1, 2] < [1, 3], [1, 2] < [1, 2, 0], (2,) > (1, 99))

print("and returns operand:", 1 and 2, 0 and 2, "" and "x", "a" and "b")
print("or returns operand:", 1 or 2, 0 or 2, "" or "default", None or [] or 0)
print("not:", not True, not 0, not "", not "text", not [], not [0])
print("precedence:", True or False and False, not True or True, not (True or True))
print("mixed:", 1 < 2 and 2 < 3, 1 > 2 or 3 > 2, not 1 > 2)


def loud(value, label):
    print("  evaluated", label)
    return value


print("and stops at first falsy:")
r = loud(0, "left") and loud(1, "right")
print("  result", r)
print("or stops at first truthy:")
r = loud(7, "left") or loud(8, "right")
print("  result", r)
print("and evaluates both when left is truthy:")
r = loud(1, "left") and loud(0, "right")
print("  result", r)
print("chained comparison evaluates the middle once:")
r = 1 < loud(5, "middle") < 10
print("  result", r)

a = [1, 2]
b = a
c = [1, 2]
print("is:", a is b, a is c, a == c, a is not c)
n = None
print("is None:", n is None, n is not None, a is None)
print("in list:", 2 in a, 5 in a, 5 not in a)
print("in str:", "ell" in "hello", "" in "hello", "H" in "hello")
print("in dict keys:", "k" in {"k": 1}, 1 in {"k": 1})
print("in tuple/range:", 3 in (1, 2, 3), 4 in range(0, 10, 2), 5 in range(0, 10, 2))
print("in set:", "x" in {"x", "y"}, "z" not in {"x", "y"})
print("falsy:", bool(0), bool(0.0), bool(""), bool([]), bool({}), bool(None))
print("truthy:", bool(1), bool(-1), bool("0"), bool([0]), bool(" "), bool((0,)))
name = ""
print("default idiom:", name or "anonymous")
value = 0
print("careful with zero:", value or 10, value if value is not None else 10)
print("bool is int:", True == 1, False == 0, True + 1)
print("compare int/float:", 1 == 1.0, 2 < 2.5, 0.1 + 0.2 == 0.3)
print("None equality:", None == None, None == 0, None == False)
print("chained with call:", 0 < len("abc") <= 3)
print("not in / is not bind tighter than not:", not 1 in [2], not a is c)
