# bool (a subclass of int) and None
print("literals:", True, False, None)
print("bool is int:", isinstance(True, int), issubclass(bool, int))
print("as numbers:", True + True, True * 10, False + 1, True / 2, -True)
print("equality with ints:", True == 1, False == 0, True == 2)
print("sum of bools:", sum([True, False, True, True]))
print("count matches:", sum(n > 2 for n in [1, 2, 3, 4]))
print("index with bool:", ["no", "yes"][True], ["no", "yes"][False])
print("int/str of bool:", int(True), str(True), repr(False), str(False) + "!")
print("bool as dict key:", {True: "t", False: "f"})
print("bool():", bool(1), bool(0), bool(-3), bool(0.0), bool("x"), bool(""))
print("bool of containers:", bool([]), bool([0]), bool(()), bool({}), bool({0: 0}), bool(set()))
print("bool of None:", bool(None))
print("bool of strings:", bool("False"), bool("0"), bool(" "))
print("no-arg bool:", bool())
print("not:", not True, not None, not 0, not "a")
print("and/or results:", True and 5, False or "x", None or 0, None and 1)
print("comparison gives bool:", 1 < 2, type(1 < 2).__name__)
print("result types:", type(True + True).__name__, type(True and False).__name__)
print("ops on bools:", True and False, True or False, True ^ False, True & True)
print("all/any:", all([True, 1, "a"]), all([]), any([0, "", None]), any([]))
print("sort bools:", sorted([True, False, True]))
print("min/max:", min(True, False), max(True, False))
print("format:", f"{True}", "%s" % False, "{}".format(None))

x = None
print("is None:", x is None, x is not None)
print("None equality:", x == None, None == 0, None == "", None == False)
print("None in list:", [None, None], None in [1, None], [1, None].count(None))
print("str/repr of None:", str(None), repr(None), str(None) + "!")
print("type names:", type(None).__name__, type(True).__name__)

def nothing():
    pass

def maybe(flag):
    if flag:
        return "value"

r = nothing()
print("function without return:", r, r is None)
print("missing return path:", maybe(True), maybe(False))
print("print returns None:", print("inside"))
print("list.sort returns None:", [3, 1].sort())
print("dict.get missing:", {"a": 1}.get("b"), {"a": 1}.get("b") is None)
print("None with or:", None or "fallback", 0 or None)
d = {None: "none key"}
print("None as dict key:", d[None])
value = None
result = value if value is not None else "default"
print("explicit None check:", result)
flags = [True, False, None, 0, 1, "", "a"]
print("truthy filter:", [f for f in flags if f])
print("only None removed:", [f for f in flags if f is not None])
print("singletons:", True is True, None is None, (1 == 1) is True)
print("bools as ints:", int(3 > 2) + int(2 > 3), (5 > 3) + (5 > 4))
is_ready = False
is_ready = not is_ready
print("toggled flag:", is_ready, not not is_ready)
