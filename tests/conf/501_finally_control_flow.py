# finally combined with return / break / continue, and cleanup ordering
def returns_in_try():
    try:
        return "from try"
    finally:
        print("  finally runs before the function returns")
def return_in_except():
    try:
        1 / 0
    except ZeroDivisionError:
        return "handled"
    finally:
        print("  cleanup after except")
def modify_after_return():
    items = [1]
    try:
        return items
    finally:
        items.append(2)
print("return in try:", returns_in_try())
print("return in except:", return_in_except())
print("finally mutates the returned list:", modify_after_return())
log = []
for i in range(5):
    try:
        if i == 1:
            continue
        if i == 3:
            break
        log.append(f"body {i}")
    finally:
        log.append(f"finally {i}")
print("break/continue through finally:", log)
def find_first_even(nums):
    for n in nums:
        try:
            if n % 2 == 0:
                return n
        finally:
            print("  checked", n)
    return None
def nested():
    try:
        try:
            raise KeyError("k")
        finally:
            print("  inner finally")
    except KeyError:
        print("  outer except")
        return "recovered"
    finally:
        print("  outer finally")
print("return inside loop + finally:", find_first_even([3, 5, 6, 8]))
print("nested:", nested())
i = 0
while True:
    try:
        i += 1
        if i < 3:
            continue
        break
    finally:
        print("  while finally", i)
print("while exited at", i)
