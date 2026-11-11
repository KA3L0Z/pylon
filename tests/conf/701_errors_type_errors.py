# TypeError messages beginners meet most often
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
def add(a, b):
    return a + b
def greet(name, greeting="hi"):
    return greeting + " " + name
def no_args():
    return 1
def list_as_key():
    d = {}
    d[[1, 2]] = "x"
def assign_into_str():
    word = "abc"
    word[0] = "x"
class Dog:
    def bark():
        return "woof"
nothing = None
number = 5
text = "abc"
items = [1, 2]
show("str + int", lambda: "age: " + number)
show("int + str", lambda: number + "5")
show("None + int", lambda: nothing + 1)
show("list + int", lambda: items + 2)
show("str - str", lambda: text - "a")
name_only("str * str", lambda: text * text)
show("for over int", lambda: [x for x in number])
show("list(int)", lambda: list(number))
show("sum(int)", lambda: sum(number))
name_only("unpack int", lambda: [a for a, b in [number]])
show("None[0]", lambda: nothing[0])
show("None['key']", lambda: nothing["key"])
show("index sort() result", lambda: items.sort()[0])
show("int[0]", lambda: number[0])
show("call int", lambda: number())
show("call str", lambda: text())
show("call None", lambda: nothing())
show("call list", lambda: items(0))
show("missing one argument", lambda: add(1))
show("missing two arguments", lambda: add())
show("too many arguments", lambda: add(1, 2, 3))
show("argument to no-arg function", lambda: no_args(1))
show("missing with default", lambda: greet())
name_only("unexpected keyword", lambda: add(1, c=2))
name_only("argument given twice", lambda: add(1, a=2))
show("list as dict key", list_as_key)
show("list in set", lambda: {items})
show("dict in set", lambda: {1, 2}.add({}))
show("str < int", lambda: text < number)
show("int < str", lambda: number < text)
show("None < int", lambda: nothing < number)
name_only("len(int)", lambda: len(number))
name_only("str index with str", lambda: text["1"])
name_only("list index with str", lambda: items["0"])
name_only("assign into str", assign_into_str)
name_only("int(None)", lambda: int(nothing))
name_only("abs(str)", lambda: abs(text))
show("forgot self", lambda: Dog().bark())
