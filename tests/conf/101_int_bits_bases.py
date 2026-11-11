# int: bit operations and base conversions
a, b = 12, 10  # 1100 and 1010
print("and:", a & b)
print("or:", a | b)
print("xor:", a ^ b)
print("not:", ~a, ~0, ~-1)
print("left shift:", 1 << 10, 3 << 2)
print("right shift:", 1024 >> 3, 7 >> 1, -8 >> 1)
print("big shift:", 1 << 100)
print("bin:", bin(10), bin(0), bin(255), bin(-5))
print("hex:", hex(255), hex(0), hex(4096), hex(-255))
print("oct:", oct(8), oct(64), oct(0))
print("int from bin str:", int("1010", 2), int("0b1010", 2))
print("int from hex str:", int("ff", 16), int("FF", 16), int("0xff", 16))
print("int from oct str:", int("17", 8))
print("literals:", 0b1010, 0xff, 0o17, 0XFF)
print("strip prefix:", bin(10)[2:], hex(255)[2:])
print("padded binary:", bin(5)[2:].zfill(8))
print("format bin/hex/oct:", format(10, "b"), format(255, "x"), format(255, "X"), format(8, "o"))
print("format padded:", format(5, "08b"), format(255, "04x"))
print("count ones:", bin(255).count("1"), bin(1023).count("1"))
print("powers of two:", [n for n in range(1, 20) if n & (n - 1) == 0])
print("test bits of 5:", (5 >> 0) & 1, (5 >> 1) & 1, (5 >> 2) & 1)
print("set bit:", 5 | (1 << 1))
print("clear bit:", 7 & ~(1 << 1))
print("toggle bit:", 5 ^ 1)
print("low bits mask:", 0b110110 & 0b1111)
print("parity:", [n & 1 for n in range(5)])

x = 0
for n in [4, 1, 2, 1, 2]:
    x ^= n
print("single number via xor:", x)
flags = 0
flags |= 1 << 0
flags |= 1 << 3
print("flags:", flags, bin(flags))
flags &= ~(1 << 0)
print("flag cleared:", flags)
print("shift as multiply/divide:", 5 << 1, 5 >> 1, 20 >> 2)
print("precedence:", 1 << 2 + 1, (1 << 2) + 1, 6 & 3 == 2, (6 & 3) == 2)
print("bool bits:", True & False, True | False, True ^ True)
print("negative and mask:", -1 & 0xFF, -2 & 0xF)
p, q = 5, 9
p ^= q; q ^= p; p ^= q
print("xor swap:", p, q)

def to_binary(n):
    digits = ""
    while n > 0:
        digits = str(n % 2) + digits
        n //= 2
    return digits or "0"

print("manual to binary:", to_binary(37), to_binary(0), to_binary(37) == bin(37)[2:])
print("chr/ord with hex:", hex(ord("A")), chr(0x41))
print("round trip:", int(bin(1234), 2), int(hex(1234), 16), int(oct(1234), 8))
print("subsets by bitmask:", [[c for i, c in enumerate("abc") if mask >> i & 1] for mask in range(8)])
