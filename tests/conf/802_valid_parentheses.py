# Valid parentheses with a stack, plus other stack classics
def is_valid(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
tests = ["()", "()[]{}", "(]", "([)]", "{[]}", "", "(", ")", "((()))", "(()", "a(b[c]{d})e", "}{"]
for t in tests:
    print(repr(t), "->", is_valid(t))

def first_error(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for i, ch in enumerate(text):
        if ch in "([{":
            stack.append((ch, i))
        elif ch in pairs:
            if not stack or stack[-1][0] != pairs[ch]:
                return i
            stack.pop()
    return stack[0][1] if stack else -1

def max_depth(text):
    depth = best = 0
    for ch in text:
        if ch == "(":
            depth += 1
            best = max(best, depth)
        elif ch == ")":
            depth -= 1
    return best
print("first error index:", [first_error(t) for t in ["(a)", "(]", "((", "x)", "{[}]"]])
print("max depth:", max_depth("(1+(2*3)+((8)/4))+1"), max_depth("()()"), max_depth(""))

def evaluate_rpn(tokens):
    stack = []
    for tok in tokens:
        if tok in ("+", "-", "*", "/"):
            b, a = stack.pop(), stack.pop()
            if tok == "+":
                stack.append(a + b)
            elif tok == "-":
                stack.append(a - b)
            elif tok == "*":
                stack.append(a * b)
            else:
                stack.append(int(a / b))
        else:
            stack.append(int(tok))
    return stack[0]
print("RPN calculator:", evaluate_rpn("2 1 + 3 *".split()), evaluate_rpn("4 13 5 / +".split()),
      evaluate_rpn("10 6 9 3 + -11 * / * 17 + 5 +".split()))

def next_greater(nums):
    result = [-1] * len(nums)
    stack = []
    for i, n in enumerate(nums):
        while stack and nums[stack[-1]] < n:
            result[stack.pop()] = n
        stack.append(i)
    return result
print("next greater element:", next_greater([2, 1, 5, 3, 4]), next_greater([3, 2, 1]))
