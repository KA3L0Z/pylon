# format(), str.format() and %-formatting
print("format() numbers:", format(3.14159, ".2f"), format(42, "5d") + "|", format(42, "<5d") + "|", format(42, "05d"))
print("format() bases:", format(255, "b"), format(255, "x"), format(255, "X"), format(255, "o"), format(255, "d"))
print("format() thousands/sign:", format(1234567, ","), format(1234567.891, ",.2f"), format(5, "+"), format(-5, "+"))
print("format() exponent/percent:", format(12345.678, "e"), format(12345.678, ".3e"), format(0.256, "%"),
      format(0.256, ".1%"))
print("format() strings:", format("hi", ">6") + "|", format("hi", "<6") + "|", format("hi", "^6") + "|",
      format("hi", "*^6"))
print("format() no spec:", format(42), format(3.5), format("s"), format(True), format(None), format([1, 2]))
print("format() big int:", format(2 ** 70, ","), format(10 ** 15, "e"))

print("positional: {} {} {}".format("a", "b", "c"))
print("indexed: {0} {1} {0} {2}".format("x", "y", "z"))
print("keyword: {name} is {age}".format(name="Ada", age=36))
print("mixed: {} and {last}".format("first", last="end"))
print("specs: [{:>8}] [{:<8}] [{:^8}] [{:*^8}]".format("r", "l", "c", "f"))
print("numbers: [{:5d}] [{:05d}] [{:+d}] [{:,}] [{:.2f}] [{:8.3f}]".format(42, 42, 42, 1234567, 3.14159, 3.14159))
print("more numbers: [{:e}] [{:.2e}] [{:%}] [{:.1%}]".format(1234.5, 1234.5, 0.5, 0.5))
print("bases: {:b} {:x} {:X} {:o} {:d}".format(10, 255, 255, 8, 7))
print("indexed with spec: {0:.1f} {0:.3f} {1:>5} {1:<5}|".format(2.71828, "ab"))
print("keyword with spec: {price:8.2f}|{qty:03d}|{name:^7}|".format(price=9.5, qty=7, name="tea"))
print("conversion: {!r} {!r:>6}".format("s", "t"))
print("nested width: [{:{}}] [{:>{w}.{p}f}]".format("ab", 5, 3.14159, w=8, p=2))
print("braces: {{}} {{{}}}".format("x"))
template = "{:<6}|{:>4}|{:>7.2f}"
for row in [("tea", 2, 3.5), ("cake", 10, 12.25)]:
    print(template.format(*row))
data = {"city": "Lima", "temp": 18.5}
print("dict unpack: {city} {temp:.0f}".format(**data))
print("reuse:", "{0}-{0}-{1}".format("a", "b"), "{}".format(None), "{}{}".format(1, 2.0))
print("container values: {} {}".format([1, "a"], (2,)))

print("%%s and %%d: %s is %d years" % ("Ada", 36))
print("single value: %s" % "x", "%d items" % 3, "%s" % 3.5, "%s" % [1, 2], "%s" % None)
print("float: %f %.2f %.0f %.3f" % (3.14159, 3.14159, 2.75, 2 / 3))
print("width: [%5d] [%5d] [%3d] [%5.1f]" % (42, -42, 12345, 3.14159))
print("hex: %x %x" % (255, 4096))
print("repr vs str: %r %s" % ("a'b", "a'b"), "%r" % 1.0, "%r" % [None], "%r" % "plain")
print("percent sign: 100%% done, %d%% left" % 0)
print("tuple value needs wrapping: %s" % ((1, 2),))
print("%%s with any type: %s %s %s %s" % (1, 2.50, True, {"k": 1}))
for row in [("apple", 3, 0.5), ("kiwi", 12, 0.25)]:
    print("%s: %5d %.2f" % row)
print("percent of total: %.1f%%" % (45 / 60 * 100))
amount = 1234.5
print("three styles agree:", "%.2f" % amount == "{:.2f}".format(amount) == f"{amount:.2f}" == format(amount, ".2f"))
print("built in a loop:", ", ".join("%d=%s" % (i, c) for i, c in enumerate("abc")))
print("extras: [%-5d] [%05d] [%-6s] [%6s] %X %o %+d" % (42, 42, "ab", "ab", 255, 8, 5))
