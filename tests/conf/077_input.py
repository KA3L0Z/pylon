# input(): the lines come from 077_input.in
name = input()
count = int(input())
print("Hello,", name)
print(count * 2)
reply = input("Mode? ")
print()
print(reply.upper())
values = input().split()
print(values, len(values))
total = 0
for part in input().split(","):
    total += float(part)
print(total)
blank = input()
print(repr(blank))
spaced = input()
print(repr(spaced), repr(spaced.strip()))
try:
    input("more? ")
except EOFError as error:
    print()
    print("EOFError:", error)
