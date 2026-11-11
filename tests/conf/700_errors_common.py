# Common beginner errors: the exception type and its message
def show(label, fn):
    try:
        fn()
    except Exception as e:
        print(f"{label}: {type(e).__name__}: {e}")
def name_only(label, fn):
    try:
        fn()
    except Exception as e:
        print(f"{label}: {type(e).__name__}")
def assign_past_end():
    items = [1]
    items[3] = 0
def too_many():
    a, b = [1, 2, 3]
def not_enough():
    a, b, c = [1, 2]
def use_undefined():
    return undefined_name + 1
def typo():
    count = 1
    return coutn
def failed_assert():
    age = -1
    assert age >= 0, "age must not be negative"
class InsufficientFunds(Exception):
    pass
def withdraw():
    raise InsufficientFunds("balance is 10, need 25")
show("1/0", lambda: 1 / 0)
name_only("1//0", lambda: 1 // 0)
name_only("1%0", lambda: 1 % 0)
name_only("1.0/0", lambda: 1.0 / 0)
show("list index", lambda: [1, 2, 3][3])
show("negative list index", lambda: [1, 2, 3][-4])
show("index into empty list", lambda: [][0])
show("pop from empty list", lambda: [].pop())
show("string index", lambda: "abc"[5])
name_only("tuple index", lambda: (1, 2)[2])
name_only("list assignment index", assign_past_end)
show("missing str key", lambda: {"a": 1}["b"])
show("missing int key", lambda: {1: "x"}[2])
show("missing tuple key", lambda: {}[(1, 2)])
show("dict.pop missing", lambda: {}.pop("gone"))
name_only("set.remove missing", lambda: {1}.remove(2))
show("int('abc')", lambda: int("abc"))
show("int('3.5')", lambda: int("3.5"))
show("int('')", lambda: int(""))
name_only("float('x')", lambda: float("x"))
show("list.remove", lambda: [1, 2].remove(3))
name_only("list.index", lambda: [1, 2].index(3))
name_only("str.index", lambda: "abc".index("z"))
show("too many values", too_many)
show("not enough values", not_enough)
show("list.push", lambda: [].push(1))
show("str.append", lambda: "abc".append("d"))
show("dict.add", lambda: {}.add(1))
show("None attribute", lambda: None.upper())
show("method on sort() result", lambda: [3, 1].sort().append(2))
show("undefined name", use_undefined)
show("typo in name", typo)
name_only("next on exhausted iterator", lambda: next(iter([])))
show("assert with message", failed_assert)
show("custom exception", withdraw)
try:
    {"a": 1}["b"]
except KeyError as e:
    print("KeyError str is the repr of the key:", str(e), "| key itself:", e.args[0])
