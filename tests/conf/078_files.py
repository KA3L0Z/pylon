# Files: open, with, read, readline, readlines, iteration, write, append, errors
with open("notes.txt", "w") as handle:
    count = handle.write("first line\n")
    handle.write("second line\n")
    handle.write("third")
print(count, handle.closed)

with open("notes.txt") as handle:
    text = handle.read()
print(repr(text))
print(text.splitlines())

with open("notes.txt", "r") as handle:
    print(repr(handle.readline()))
    print(repr(handle.readline()))
    print(repr(handle.readline()))
    print(repr(handle.readline()))

with open("notes.txt") as handle:
    lines = handle.readlines()
print(lines)

with open("notes.txt") as handle:
    for number, line in enumerate(handle, start=1):
        print(number, line.rstrip("\n"))

with open("notes.txt", "a") as handle:
    handle.write("\nfourth\n")
    print("fifth", 5, file=handle)
    handle.writelines(["sixth\n", "seventh\n"])
print(open("notes.txt").read().count("\n"))

with open("notes.txt") as handle:
    print(repr(handle.read(5)), repr(handle.read(6)), repr(handle.readline()))
    rest = handle.read()
    print(len(rest), repr(handle.read()))

handle = open("numbers.txt", "w")
for n in range(4):
    handle.write(str(n * n) + "\n")
handle.close()
print(handle.closed, handle.name, handle.mode)
total = 0
for line in open("numbers.txt"):
    total += int(line)
print(total)
print([int(line) for line in open("numbers.txt")])
print(sum(1 for _ in open("numbers.txt")), next(open("numbers.txt")).strip())

try:
    open("missing.txt")
except FileNotFoundError as error:
    print("FileNotFoundError:", error)
try:
    open("missing.txt")
except OSError as error:
    print(type(error).__name__, error.filename)
try:
    handle.write("late")
except ValueError as error:
    print("ValueError:", error)
try:
    with open("numbers.txt") as reader:
        reader.write("x")
except OSError as error:
    print(type(error).__name__, error)
print(repr(open("numbers.txt").read()))
try:
    with open("scratch.txt", "w") as writer:
        writer.read()
except OSError as error:
    print(type(error).__name__, error)
try:
    open("numbers.txt", "x")
except FileExistsError as error:
    print("FileExistsError:", error)
with open("empty.txt", "w"):
    pass
print(repr(open("empty.txt").read()), open("empty.txt").readlines(), repr(open("empty.txt").readline()))
with open("pairs.csv", "w") as table:
    for name, load in [("north", 40), ("south", 55)]:
        table.write(f"{name},{load}\n")
rows = [line.strip().split(",") for line in open("pairs.csv")]
print(rows, {name: int(load) for name, load in rows})
try:
    open("notes.txt", "q")
except ValueError as error:
    print("ValueError:", error)
with open("notes.txt", mode="w") as handle:
    handle.write("replaced\n")
print(open("notes.txt").read().strip(), isinstance(handle.write, object))
