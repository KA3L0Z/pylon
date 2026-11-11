# try / except / else / finally: which blocks run, and in which order
def check(fn, label):
    try:
        result = fn()
    except ZeroDivisionError:
        print(label, "-> ZeroDivisionError")
    except (KeyError, IndexError) as e:
        print(label, "-> lookup error:", type(e).__name__)
    except ValueError as e:
        print(label, "-> ValueError:", e)
    except Exception as e:
        print(label, "-> other:", type(e).__name__)
    else:
        print(label, "-> ok:", result)
    finally:
        print(label, "-> finally")
check(lambda: 10 / 2, "divide")
check(lambda: 1 / 0, "zero")
check(lambda: {}["k"], "key")
check(lambda: [][0], "index")
check(lambda: int("abc"), "int")
check(lambda: None + 1, "type")
try:
    value = [1, 2, 3][5]
    print("not reached")
except IndexError:
    value = "fallback"
print("after handled error:", value)
order = []
try:
    order.append("try")
    raise RuntimeError("boom")
except RuntimeError as err:
    order.append("except")
    message = str(err)
else:
    order.append("else")
finally:
    order.append("finally")
print("order:", order, "| message:", message)
def parse(text):
    try:
        return int(text)
    except ValueError:
        try:
            return float(text)
        except ValueError:
            return None
print("nested try:", parse("7"), parse("2.5"), parse("x"))
results = []
for raw in ["1", "x", "3", "", "5"]:
    try:
        results.append(int(raw))
    except ValueError:
        continue
print("skip bad items in a loop:", results)
try:
    try:
        {}["inner"]
    except ValueError:
        print("wrong handler")
    finally:
        print("inner finally runs while the error propagates")
except KeyError as e:
    print("outer caught:", repr(e), e.args)
