/* Pylon reference cards for the levels that were written before cards existed, plus a few extra cards for the newer ones.
   A card explains one tool: what it does, how to call it, and a small example that prints.
   The game shows a level's cards one level EARLY, as the briefing for what comes next, and keeps every card the player
   has been shown in the Toolbox. A level never names the tools it needs: the player picks them from the Toolbox.

   Card: { key, also, name, what, code }
     key    the tool this card teaches, as tools/check_curriculum.js names it (a function, ".method", "module.name",
            or "kw:..." for syntax). null for a technique. "also" lists more tools the same card covers.
     name   plain text, the call or the syntax as you would type it
     what   one or two sentences, HTML with b, i and code only
     code   Python that runs on its own and prints (checked against CPython by tools/check_curriculum.js)
   js/curriculum.js attaches these to their levels. */
(function (root) {
  const py = String.raw;

  const CARDS = {
    // ---------------------------------------------------------------- floor 2: Logic Gardens
    'z2-status-report': { tools: [
      { key: 'print', name: 'print(value, ...)', what: py`Shows its values on the output, with a space between them, and then starts a new line. It is how a program reports what it has worked out.`, code: py`print("Tower", 7)
print("online")` },
      { key: 'kw:assign', name: 'name = value', what: py`Stores a value under a name. Use the name wherever you need the value. Assigning again replaces what was stored.`, code: py`floor = 2
floor = floor + 1
print(floor)` },
      { key: 'kw:string', name: '"text"', what: py`Text between quotes is a <b>string</b>. A number is written without quotes. <code>"35"</code> is text and <code>35</code> is a number, and they behave differently.`, code: py`print("35" + "1")
print(35 + 1)` },
      { key: 'str', name: 'str(value)', what: py`Turns a number into text. Text can be joined to text with <code>+</code>, but not to a number, so convert the number first.`, code: py`charge = 35
print("Charge: " + str(charge) + "%")` },
      { key: 'kw:comment', name: '# a comment', what: py`Python ignores everything after a <code>#</code> on a line. Comments are notes for people: the next reader, or yourself in a month.`, code: py`# the number of the tower
tower = 7   # still seven
print(tower)` },
    ] },
    'z2-name-plates': { tools: [
      { key: null, name: 'value.method()', what: py`A method is a function that belongs to a value. Write the value, a dot, and the method. Methods can be chained: each one works on the result of the one before.`, code: py`print("  hi ".strip().upper())` },
      { key: '.strip', also: ['.lstrip', '.rstrip'], name: 'text.strip()', what: py`A copy of the text without the spaces and line breaks at both ends. Spaces in the middle stay. <code>lstrip()</code> and <code>rstrip()</code> clean one end only.`, code: py`name = "   ada lovelace  "
print("[" + name.strip() + "]")
print("[" + name.rstrip() + "]")` },
      { key: '.upper', also: ['.lower', '.title'], name: 'text.upper()   ·   text.lower()', what: py`A copy in capital letters, or in small letters. The original is not changed. Strings never change: every string method returns a new string.`, code: py`word = "Pylon"
print(word.upper(), word.lower(), word)` },
      { key: 'len', name: 'len(thing)', what: py`How many items it has: the characters of a string, the items of a list, the pairs of a dictionary.`, code: py`print(len("tower"), len([4, 5, 6]), len(""))` },
      { key: 'kw:index', name: 'text[position]', what: py`One character of a string, or one item of a list. Positions start at 0, so the last one is at <code>len(text) - 1</code>.`, code: py`word = "relay"
print(word[0], word[1], word[len(word) - 1])` },
      { key: 'kw:f-string', name: 'f"text {value} text"', what: py`An f-string builds text from values. Put an <code>f</code> before the opening quote, and every <code>{...}</code> is replaced by the value of what is inside it.`, code: py`name = "PIP"
charge = 80
print(f"{name} is at {charge}%")
print(f"{charge + 5} soon")` },
    ] },
    'z2-shelf-slots': { tools: [
      { key: 'kw:return', name: 'def name(inputs):   return value', what: py`A function takes inputs and hands a result back with <code>return</code>. The tests call your function and look at what it returns, not at what it prints. <code>return</code> also ends the function on the spot.`, code: py`def double(number):
    return number * 2

print(double(4), double(10))` },
      { key: 'kw://', also: ['kw:%'], name: 'a // b   ·   a % b', what: py`Whole-number division and its remainder. <code>17 // 5</code> is 3, the number of times 5 fits, and <code>17 % 5</code> is 2, what is left over.`, code: py`print(17 // 5, 17 % 5)
print(20 // 5, 20 % 5)` },
      { key: 'kw:/', also: ['kw:**'], name: 'a / b   ·   a ** b', what: py`<code>/</code> is ordinary division and always gives a number with a decimal point, a <b>float</b>. <code>**</code> raises to a power.`, code: py`print(7 / 2, 8 / 2)
print(2 ** 10, 3 ** 2)` },
      { key: null, name: 'n % d == 0', what: py`The remainder test. A number is even when dividing it by 2 leaves nothing, and a multiple of 5 when dividing it by 5 leaves nothing.`, code: py`print(10 % 2 == 0, 7 % 2 == 0, 35 % 5 == 0)` },
    ] },
    'z2-relay-modes': { tools: [
      { key: 'kw:compare', name: '==   !=   <   <=   >   >=', what: py`Comparisons give <code>True</code> or <code>False</code>. "Equal" is written with two equals signs, because a single one stores a value.`, code: py`charge = 60
print(charge == 60, charge != 60, charge >= 61)` },
      { key: 'kw:elif', name: 'if ...   elif ...   else', what: py`Checks the conditions from top to bottom and runs the first branch that is true. The rest are skipped, so the order of the tests matters.`, code: py`heat = 72
if heat > 90:
    print("danger")
elif heat > 60:
    print("warm")
else:
    print("fine")` },
    ] },
    'z2-fizz-buzz': { tools: [
      { key: 'kw:list', name: '[item, item, ...]', what: py`A list holds several values in order. <code>[]</code> is an empty list. Unlike a string, a list can grow, shrink and change.`, code: py`parts = ["gear", "bolt"]
empty = []
print(parts, len(parts), empty)` },
      { key: '.append', name: 'items.append(value)', what: py`Adds one value to the end of a list. It changes the list itself and returns nothing, so never write <code>items = items.append(...)</code>.`, code: py`log = []
log.append("start")
log.append("stop")
print(log)` },
      { key: 'kw:range-start', name: 'range(start, stop)', what: py`The whole numbers from <code>start</code> up to, but not including, <code>stop</code>. With a single number it starts at 0.`, code: py`for number in range(1, 4):
    print(number)` },
    ] },
    'z2-running-sum': { tools: [
      { key: 'kw:for-items', name: 'for item in items:', what: py`Runs the block once for every item of a list, or every character of a string, in order. No position is needed.`, code: py`for part in ["gear", "bolt"]:
    print(part)
for letter in "ok":
    print(letter)` },
      { key: 'kw:aug-assign', name: 'total += value', what: py`Short for <code>total = total + value</code>. The same works with <code>-=</code>, <code>*=</code> and <code>//=</code>.`, code: py`total = 10
total += 5
total -= 2
total *= 3
print(total)` },
      { key: null, name: 'a running total', what: py`Create a variable before the loop, update it inside the loop, use it after the loop. The same shape counts things, adds them up, or finds the largest.`, code: py`total = 0
for load in [4, 9, 2]:
    total += load
print(total)` },
    ] },
    'z2-palindrome-number': { tools: [
      { key: null, name: 'the digits of a number', what: py`<code>n % 10</code> is the last digit, and <code>n // 10</code> is the number without it. Repeating both takes the digits one by one, starting from the right.`, code: py`number = 472
print(number % 10, number // 10)
print(47 % 10, 47 // 10)` },
      { key: 'kw:bool', name: 'True   ·   False', what: py`The two truth values. A comparison produces one of them, so a function can return a comparison directly.`, code: py`def is_big(number):
    return number > 100

print(is_big(5), is_big(500))` },
    ] },
    'z2-two-sum': { tools: [
      { key: null, name: 'items[position]', what: py`Lists are indexed like strings: the first item is <code>items[0]</code>. <code>range(len(items))</code> gives every valid position.`, code: py`loads = [30, 45, 12]
for i in range(len(loads)):
    print(i, loads[i])` },
      { key: null, name: 'a loop inside a loop', what: py`The inner loop runs from start to finish for every round of the outer one. Starting the inner loop at <code>i + 1</code> visits every pair of positions exactly once.`, code: py`for i in range(3):
    for j in range(i + 1, 3):
        print(i, j)` },
    ] },

    // ---------------------------------------------------------------- floor 3: Cipher Hall (extra cards)
    'z7-reverse-words': { tools: [
      { key: '.replace', also: ['.count'], name: 'text.replace(old, new)   ·   text.count(piece)', what: py`A copy with every <code>old</code> swapped for <code>new</code>, and the number of times a piece occurs.`, code: py`line = "red alert, red team"
print(line.replace("red", "blue"))
print(line.count("red"), line.count("e"))` },
    ] },
    'z7-flexible-functions': { tools: [
      { key: 'kw:tuple', name: '(a, b)', what: py`A <b>tuple</b> is a fixed group of values. The comma makes it, the brackets are optional. It is indexed like a list, but it cannot be changed.`, code: py`span = (3, 9)
print(span[0], span[1], len(span))
low, high = span
print(high - low)` },
      { key: null, name: 'print(..., sep=..., end=...)', what: py`Two keyword arguments of <code>print</code>: <code>sep</code> is what goes between the values (normally a space) and <code>end</code> is what goes after the last one (normally a new line).`, code: py`print("a", "b", "c", sep="-")
print("no new line", end="")
print("!")` },
      { key: null, name: '"""what this function does"""', what: py`A string on the first line of a function is its <b>docstring</b>: one sentence that says what the function does. Editors and <code>help()</code> show it.`, code: py`def area(width, height):
    """Return the area of a rectangle."""
    return width * height

print(area(3, 4))
print(area.__doc__)` },
    ] },
    'z7-bug-hunt': { tools: [
      { key: 'kw:assert', name: 'assert condition, "message"', what: py`States something that must be true at this point. If it is not, the program stops right there with an AssertionError, instead of carrying a wrong value on to somewhere far away.`, code: py`def average(readings):
    assert readings, "no readings"
    return sum(readings) / len(readings)

print(average([4, 6]))` },
    ] },

    // ---------------------------------------------------------------- floor 4: Data Vaults
    'z3-contains-duplicate': { tools: [
      { key: 'set', also: ['kw:set-literal'], name: 'set()   ·   {1, 2, 3}', what: py`A set holds each value at most once and keeps no order. Asking whether a value is in a set takes one step, however large the set. An empty set is <code>set()</code>, because <code>{}</code> is an empty dictionary.`, code: py`seen = {3, 5}
print(5 in seen, 9 in seen)
print(len(set([1, 1, 2, 2, 2])))` },
      { key: '.add', name: 'group.add(value)', what: py`Puts a value into a set. Adding a value that is already there changes nothing.`, code: py`seen = set()
seen.add("ada")
seen.add("ada")
seen.add("pip")
print(len(seen), "pip" in seen)` },
      { key: null, name: 'in: a list or a set?', what: py`<code>value in items</code> walks a list from the front, one item at a time. On a set it is a single lookup. When a loop keeps asking "have I met this before?", ask a set.`, code: py`names = ["ada", "pip", "max"]
fast = set(names)
print("max" in names, "max" in fast)` },
    ] },
    'z8-pythonic-loops': { tools: [
      { key: 'kw:ternary', name: 'a if condition else b', what: py`A choice between two values inside one expression. Use it for short choices only: when it stops fitting on one line, write an ordinary <code>if</code>.`, code: py`charge = 15
mode = "saver" if charge < 20 else "normal"
print(mode)` },
    ] },
    'z3-valid-anagram': { tools: [
      { key: 'kw:dict-literal', also: ['dict'], name: '{key: value, ...}', what: py`A dictionary stores a value under a key. <code>{}</code> is an empty one. Looking a key up, adding one and changing one each take a single step.`, code: py`stock = {"gear": 4, "bolt": 9}
stock["nut"] = 12
stock["gear"] = 5
print(stock["gear"], len(stock), "bolt" in stock)` },
      { key: '.get', name: 'table.get(key, default)', what: py`The value stored under the key, or the default when the key is missing. Plain <code>table[key]</code> stops with a KeyError for a missing key.`, code: py`stock = {"gear": 4}
print(stock.get("gear", 0), stock.get("bolt", 0))` },
      { key: null, name: 'counting with a dictionary', what: py`One line counts anything: read the old count, or 0 if there is none yet, and store one more.`, code: py`counts = {}
for letter in "banana":
    counts[letter] = counts.get(letter, 0) + 1
print(counts)` },
      { key: null, name: 'a helper function', what: py`When the same steps are needed twice, give them a name. A function may call any other function in the file.`, code: py`def area(width, height):
    return width * height

def wall_area(side):
    return area(side, side) + area(side, 2)

print(wall_area(3))` },
    ] },
    'z3-two-sum-fast': { tools: [
      { key: null, name: 'key in table', what: py`<code>in</code> asks whether a key is in a dictionary, in one step. It looks at the keys, never at the values.`, code: py`seen = {"ada": 0, "pip": 1}
print("pip" in seen, 1 in seen)` },
      { key: null, name: 'remember what you have passed', what: py`Store each item as you pass it, together with what you will want to know about it later. A question about an earlier item is then one lookup instead of a second loop.`, code: py`first_seen = {}
for position, name in enumerate(["ada", "pip", "ada"]):
    if name in first_seen:
        print(name, "again, first at", first_seen[name])
    first_seen[name] = position` },
    ] },
    'z3-sorted-squares': { tools: [
      { key: 'kw:comprehension', name: '[expression for item in items]', what: py`Builds a new list in one line: the expression is worked out for every item. An <code>if</code> at the end keeps only some of them.`, code: py`loads = [3, 8, 5]
print([load * 2 for load in loads])
print([load for load in loads if load > 4])` },
      { key: 'sorted', name: 'sorted(items)', what: py`A new list with the items in order, smallest first. The original is left alone. It works on anything you can loop over, strings included.`, code: py`loads = [30, 12, 45]
print(sorted(loads), loads)
print(sorted("pylon"))` },
      { key: '.sort', name: 'items.sort()', what: py`Sorts the list itself and returns nothing. Use <code>sorted()</code> when the original order is still needed.`, code: py`loads = [30, 12, 45]
loads.sort()
print(loads)` },
      { key: 'any', also: ['all'], name: 'any(checks)   ·   all(checks)', what: py`True when at least one of the values is true, and when every one of them is. Usually fed with a comprehension written without its square brackets.`, code: py`loads = [3, 8, 5]
print(any(load > 7 for load in loads))
print(all(load > 7 for load in loads))` },
      { key: '.extend', also: ['.insert', '.index', '.reverse'], name: 'more list methods', what: py`<code>extend(other)</code> adds every item of another list. <code>insert(position, value)</code> adds in the middle. <code>index(value)</code> finds a position. <code>reverse()</code> turns the list around in place.`, code: py`parts = ["b", "c"]
parts.extend(["d", "e"])
parts.insert(0, "a")
print(parts, parts.index("c"))
parts.reverse()
print(parts)` },
    ] },
    'z3-max-profit': { tools: [
      { key: null, name: 'the lowest so far', what: py`One pass can carry a running minimum or maximum along. At every item it answers "what is the smallest value up to here?" without looking back.`, code: py`readings = [5, 9, 3, 7]
lowest = readings[0]
for reading in readings:
    lowest = min(lowest, reading)
    print(reading, lowest)` },
    ] },
    'z3-rotate-array': { tools: [
      { key: null, name: 'items[-k:]   ·   items[:-k]', what: py`Negative numbers in a slice count from the end: the last k items, and everything except the last k.`, code: py`parts = [1, 2, 3, 4, 5]
print(parts[-2:], parts[:-2])` },
      { key: null, name: 'changing a list in place', what: py`A function receives the list itself, not a copy. Assigning to a position, or calling <code>append</code>, changes it for the caller too. Such a function usually returns nothing.`, code: py`def double_all(items):
    for i in range(len(items)):
        items[i] = items[i] * 2

loads = [1, 2, 3]
double_all(loads)
print(loads)` },
      { key: 'kw:slice-assign', name: 'items[:] = new_items', what: py`Replaces the whole contents of a list while it stays the same list. Plain <code>items = ...</code> only points the name at a new list, and the caller would see no change.`, code: py`def drop_first(items):
    items[:] = items[1:]

parts = ["a", "b", "c"]
drop_first(parts)
print(parts)` },
    ] },
    'z3-top-k-frequent': { tools: [
      { key: '.items', also: ['.keys', '.values'], name: 'table.items()   ·   .keys()   ·   .values()', what: py`The pairs, the keys and the values of a dictionary. Loop over <code>items()</code> with two names to get each key together with its value.`, code: py`stock = {"gear": 4, "bolt": 9}
for part, count in stock.items():
    print(part, count)
print(list(stock.keys()), list(stock.values()))` },
      { key: 'kw:lambda', name: 'lambda item: expression', what: py`A small function without a name, written right where it is used. <code>lambda pair: pair[1]</code> takes a pair and gives back its second part.`, code: py`pairs = [("gear", 4), ("bolt", 9), ("nut", 1)]
print(sorted(pairs, key=lambda pair: pair[1]))` },
      { key: 'kw:key=', also: ['kw:reverse='], name: 'sorted(items, key=..., reverse=True)', what: py`<code>key</code> is a function applied to each item to decide the order. <code>reverse=True</code> puts the largest first. Both also work with <code>items.sort()</code>, and <code>key</code> with <code>min()</code> and <code>max()</code>.`, code: py`words = ["relay", "hub", "tower"]
print(sorted(words, key=len))
print(sorted(words, reverse=True))
print(max(words, key=len))` },
    ] },
    'z3-group-anagrams': { tools: [
      { key: 'tuple', name: 'tuple(items)', what: py`Turns a list into a tuple. A tuple cannot change, and that is exactly why it may be a dictionary key or a member of a set, which a list may not.`, code: py`visited = {(0, 0): "start"}
spot = tuple([0, 0])
print(spot, spot in visited)` },
      { key: 'collections.defaultdict', name: 'defaultdict(list)', what: py`A dictionary that creates a missing entry by itself the first time you touch it: an empty list for <code>defaultdict(list)</code>, 0 for <code>defaultdict(int)</code>. Import it from <code>collections</code>.`, code: py`from collections import defaultdict

by_length = defaultdict(list)
for word in ["hub", "relay", "pip", "tower"]:
    by_length[len(word)].append(word)
print(dict(by_length))` },
      { key: 'kw:dict-comprehension', name: '{key: value for item in items}', what: py`A comprehension that builds a dictionary: give a key and a value, separated by a colon, for every item.`, code: py`words = ["hub", "relay"]
print({word: len(word) for word in words})` },
      { key: 'map', also: ['filter'], name: 'map(function, items)   ·   filter(function, items)', what: py`<code>map</code> applies a function to every item. <code>filter</code> keeps the items for which the function says True. A comprehension does both and is usually easier to read.`, code: py`print(list(map(len, ["hub", "relay"])))
print(list(filter(lambda n: n > 2, [1, 2, 3, 4])))` },
    ] },

    // ---------------------------------------------------------------- floor 5: Pattern Forge
    'z4-valid-palindrome': { tools: [
      { key: '.isalnum', name: 'text.isalnum()', what: py`True when every character is a letter or a digit. Spaces and punctuation make it False. Used on a single character, it says whether that character counts.`, code: py`print("a".isalnum(), "7".isalnum(), "!".isalnum(), " ".isalnum())` },
      { key: null, name: 'two pointers', what: py`Keep two positions in the same sequence and move them according to what they find, most often one from each end towards the middle. One pass, and no second list.`, code: py`loads = [1, 4, 6, 9]
left, right = 0, len(loads) - 1
while left < right:
    print(loads[left], loads[right])
    left += 1
    right -= 1` },
    ] },
    'z4-valid-parentheses': { tools: [
      { key: '.pop', name: 'items.pop()', what: py`Removes the last item of a list and hands it back. <code>append</code> and <code>pop</code> together turn a list into a <b>stack</b>: the last thing put on is the first to come off.`, code: py`stack = ["a", "b", "c"]
top = stack.pop()
print(top, stack)
stack.append("z")
print(stack[-1])` },
      { key: null, name: 'a dictionary as a lookup table', what: py`When every item has exactly one partner, store the partners in a dictionary and look them up, instead of writing a chain of <code>if</code> tests.`, code: py`opposite = {"north": "south", "east": "west"}
for heading in ["east", "north"]:
    print(heading, opposite[heading])` },
    ] },
    'z4-binary-search': { tools: [
      { key: null, name: 'halving a range', what: py`Keep the lowest and the highest position that can still hold the answer, look at the middle, and drop the half that cannot. A million items need about twenty looks. It only works on sorted data.`, code: py`low, high = 1, 100
looks = 0
while low < high:
    middle = (low + high) // 2
    looks += 1
    if middle < 37:
        low = middle + 1
    else:
        high = middle
print(low, looks)` },
    ] },
    'z4-maximum-subarray': { tools: [
      { key: null, name: 'a run that can start again', what: py`Some answers are about the best stretch of neighbours. Walk once and keep a value for the stretch that ends at the current item. At every item decide whether that stretch goes on or starts again, and track the best value separately.`, code: py`readings = [3, 5, 0, 4, 6, 8, 0]
streak = 0
longest = 0
for reading in readings:
    if reading > 0:
        streak += 1
    else:
        streak = 0
    longest = max(longest, streak)
print(longest)` },
    ] },
    'z4-longest-substring': { tools: [
      { key: '.remove', also: ['.discard'], name: 'group.remove(value)', what: py`Takes a value out of a set, or the first matching item out of a list. It is an error if the value is not there. On a set, <code>discard</code> removes it only if it is there.`, code: py`window = {"a", "b", "c"}
window.remove("b")
window.discard("z")
print(sorted(window))` },
      { key: null, name: 'a sliding window', what: py`Two positions mark a stretch of the sequence. The right one moves forward one step at a time. Whenever the stretch breaks the rule, the left one moves forward until the rule holds again. No position is passed more than twice.`, code: py`loads = [4, 2, 5, 1, 6]
left, total, longest = 0, 0, 0
for right, load in enumerate(loads):
    total += load
    while total > 8:
        total -= loads[left]
        left += 1
    longest = max(longest, right - left + 1)
print(longest)` },
    ] },
    'z4-merge-intervals': { tools: [
      { key: 'kw:grid', name: 'pairs[i][0]   ·   pairs[-1][1]', what: py`A list of lists is indexed twice: first the inner list, then the item inside it. <code>pairs[-1]</code> is the last inner list, so <code>pairs[-1][1]</code> is its second item.`, code: py`spans = [[1, 4], [6, 9]]
print(spans[0][1], spans[-1][0])
spans[-1][1] = 12
print(spans)` },
      { key: null, name: 'sort first', what: py`Many problems about ranges or neighbours become easy once the items are in order: whatever can touch an item then sits right next to it. Lists of lists are sorted by their first item, then by the second.`, code: py`spans = [[5, 7], [1, 9], [1, 3]]
print(sorted(spans))` },
      { key: null, name: 'for start, end in pairs:', what: py`When every item is itself a pair, the loop can unpack it into two names.`, code: py`for start, end in [[1, 4], [6, 9]]:
    print(end - start)` },
    ] },
    'z4-three-sum': { tools: [
      { key: null, name: 'two pointers on sorted data', what: py`In a sorted list, a pair with a wanted sum is found from both ends. A sum that is too small moves the low pointer up, and a sum that is too large moves the high pointer down.`, code: py`loads = [1, 3, 4, 6, 9]
low, high = 0, len(loads) - 1
while low < high:
    total = loads[low] + loads[high]
    if total == 10:
        print(loads[low], loads[high])
        low += 1
    elif total < 10:
        low += 1
    else:
        high -= 1` },
      { key: null, name: 'skipping repeats', what: py`After sorting, equal values sit side by side. Comparing an item with the one before it is enough to skip a value that has been handled already.`, code: py`codes = [2, 2, 5, 7, 7, 7]
for i in range(len(codes)):
    if i > 0 and codes[i] == codes[i - 1]:
        continue
    print(codes[i])` },
    ] },

    // ---------------------------------------------------------------- floor 6: Structure Works
    'z5-min-stack': { tools: [
      { key: 'kw:class', also: ['kw:__init__', 'kw:self'], name: 'class Name:   def __init__(self, ...):', what: py`A class describes a kind of object. <code>__init__</code> runs when one is created and stores its starting values on <code>self</code>, which is the object itself. Every method takes <code>self</code> as its first input.`, code: py`class Counter:
    def __init__(self, start):
        self.count = start

    def bump(self):
        self.count += 1

clicks = Counter(10)
clicks.bump()
print(clicks.count)` },
      { key: null, name: 'data that moves together', what: py`An object can keep extra information beside its main data and update both in every method. A question that would need a search can then be answered at once.`, code: py`class Tally:
    def __init__(self):
        self.items = []
        self.total = 0

    def add(self, value):
        self.items.append(value)
        self.total += value

tally = Tally()
tally.add(4)
tally.add(6)
print(tally.total)` },
    ] },
    'z5-reverse-linked-list': { tools: [
      { key: 'ListNode', name: 'ListNode(val, next=None)', what: py`One node of a linked list. <code>node.val</code> is its value and <code>node.next</code> is the following node, or <code>None</code> at the end. <code>linked([...])</code> builds a chain from a list and <code>unlinked(node)</code> turns one back into a list.`, code: py`head = ListNode(1, ListNode(2))
print(head.val, head.next.val, head.next.next)
print(unlinked(linked([4, 5, 6])))` },
      { key: 'kw:is None', name: 'value is None   ·   value is not None', what: py`<code>None</code> means "nothing here". Test for it with <code>is</code>, not with <code>==</code>.`, code: py`node = None
print(node is None, node is not None)` },
      { key: null, name: 'walking a chain', what: py`A name that steps from node to node visits the whole list. Assigning to <code>node.next</code> changes where a node points, so save the old value first if you still need it.`, code: py`node = linked([7, 8, 9])
while node is not None:
    print(node.val)
    node = node.next` },
    ] },
    'z5-max-depth': { tools: [
      { key: 'TreeNode', name: 'TreeNode(val, left=None, right=None)', what: py`One node of a binary tree, with up to two children: <code>node.left</code> and <code>node.right</code>, each a node or <code>None</code>. <code>tree([...])</code> builds a tree from a list written level by level, and <code>untree(node)</code> turns one back.`, code: py`root = tree([1, 2, 3, None, 4])
print(root.val, root.left.val, root.right.val)
print(root.left.left, root.left.right.val)` },
      { key: null, name: 'recursion on a tree', what: py`A tree is a node with two smaller trees below it, so most tree questions have the same shape: the answer for an empty tree, and otherwise a combination of the answers for the left and the right subtree.`, code: py`def count(node):
    if node is None:
        return 0
    return 1 + count(node.left) + count(node.right)

print(count(tree([1, 2, 3, None, 4])))` },
    ] },
    'z5-level-order': { tools: [
      { key: 'collections.deque', also: ['.popleft', '.appendleft'], name: 'deque()   ·   queue.popleft()', what: py`A queue: add at the right with <code>append</code> and take from the left with <code>popleft</code>, each in one step. Taking from the front of a plain list shifts every other item. Import it from <code>collections</code>.`, code: py`from collections import deque

queue = deque(["a", "b"])
queue.append("c")
print(queue.popleft(), queue.popleft(), len(queue))` },
      { key: null, name: 'breadth first', what: py`Put the start in a queue. Again and again, take the oldest entry, deal with it, and add whatever it leads to. Things are reached in order of their distance from the start.`, code: py`from collections import deque

queue = deque([1])
while queue:
    number = queue.popleft()
    print(number)
    if number < 4:
        queue.append(number * 2)
        queue.append(number * 2 + 1)` },
    ] },
    'z5-lru-cache': { tools: [
      { key: 'collections.OrderedDict', also: ['.popitem', '.move_to_end'], name: 'OrderedDict()', what: py`A dictionary whose entries can be reordered. <code>move_to_end(key)</code> makes an entry the newest, and <code>popitem(last=False)</code> removes the oldest. Import it from <code>collections</code>.`, code: py`from collections import OrderedDict

recent = OrderedDict()
recent["a"] = 1
recent["b"] = 2
recent.move_to_end("a")
print(list(recent))
recent.popitem(last=False)
print(list(recent))` },
    ] },

    // ---------------------------------------------------------------- floor 7: Path Reactor
    'z4-climbing-stairs': { tools: [
      { key: null, name: 'remembering answers', what: py`A recursive function that meets the same input again and again can store each answer in a dictionary the first time, and look it up afterwards. This is called <b>memoization</b>, and it can turn an impossible amount of work into one calculation per input.`, code: py`known = {}

def square(n):
    if n not in known:
        print("working out", n)
        known[n] = n * n
    return known[n]

print(square(12), square(12))` },
      { key: null, name: 'names inside and outside a function', what: py`A function can read names defined outside it. A name it assigns is its own and disappears when the call ends. To keep something between calls, change the contents of a list or dictionary that lives outside.`, code: py`limit = 10

def over(value):
    doubled = value * 2
    return doubled > limit

print(over(3), over(8))` },
    ] },
    'z5-coin-change': { tools: [
      { key: null, name: 'a table of smaller answers', what: py`When the answer for a number depends on the answers for smaller numbers, fill a list from the bottom up: position <code>i</code> holds the answer for <code>i</code>, built from entries that are already filled in.`, code: py`ways = [1, 1] + [0] * 4
for i in range(2, len(ways)):
    ways[i] = ways[i - 1] + ways[i - 2]
print(ways)` },
    ] },
    'z5-number-of-islands': { tools: [
      { key: null, name: 'flood fill', what: py`To visit everything connected to a cell: mark the cell, then do the same for each of its neighbours. A cell that is off the edge, or already marked, ends that branch.`, code: py`def spread(row, i):
    if i < 0 or i >= len(row) or row[i] != "~":
        return
    row[i] = "#"
    spread(row, i - 1)
    spread(row, i + 1)

pipe = list("..~~~.~")
spread(pipe, 3)
print("".join(pipe))` },
    ] },
    'z6-course-schedule': { tools: [
      { key: null, name: 'a graph as lists of neighbours', what: py`Number the things from 0 and keep one list for each, holding the things it leads to. <code>[[] for _ in range(n)]</code> makes n separate empty lists.`, code: py`links = [[] for _ in range(3)]
for start, end in [(0, 1), (0, 2), (1, 2)]:
    links[start].append(end)
print(links)` },
      { key: null, name: 'counting what each one waits for', what: py`When some things must come before others, count for each one how many it still waits for. Whatever waits for nothing can go now, and finishing it lowers the count of everything that depended on it.`, code: py`waiting = {"walls": 1, "roof": 2, "floor": 0}
ready = [job for job in waiting if waiting[job] == 0]
print(ready)` },
    ] },

    // ---------------------------------------------------------------- floor 8: Summit Core
    'z6-fibonacci-generator': { tools: [
      { key: 'kw:yield', also: ['next'], name: 'yield value', what: py`A function with <code>yield</code> is a <b>generator</b>. It hands out one value, pauses on that line, and goes on from there when the next value is asked for. <code>next()</code> asks for one value, and a <code>for</code> loop asks until none are left.`, code: py`def countdown(start):
    while start > 0:
        yield start
        start -= 1

for number in countdown(3):
    print(number)
ticks = countdown(2)
print(next(ticks), next(ticks))` },
      { key: null, name: 'while True:', what: py`A loop with no end of its own. Inside a generator that is fine: it only ever runs as far as somebody asks.`, code: py`def evens():
    number = 0
    while True:
        yield number
        number += 2

stream = evens()
print(next(stream), next(stream), next(stream))` },
    ] },
    'z6-memoize-decorator': { tools: [
      { key: 'kw:*args', name: 'def f(*args):   ·   f(*values)', what: py`In a definition, <code>*args</code> collects all the positional arguments into one tuple. In a call, <code>*values</code> spreads a list or tuple out into separate arguments.`, code: py`def total(*numbers):
    return sum(numbers)

print(total(1, 2), total(1, 2, 3, 4))
pair = [3, 4]
print(max(*pair))` },
      { key: null, name: 'a function that returns a function', what: py`A function can build another function and return it. The inner one keeps access to the variables of the call that created it.`, code: py`def make_adder(amount):
    def add(number):
        return number + amount
    return add

add_five = make_adder(5)
print(add_five(1), add_five(10))` },
      { key: 'kw:decorator', name: '@decorator', what: py`A decorator takes a function and returns a replacement for it. Writing <code>@name</code> above a <code>def</code> is short for <code>f = name(f)</code>.`, code: py`def shout(fn):
    def wrapper(text):
        return fn(text).upper()
    return wrapper

@shout
def greet(name):
    return "hello " + name

print(greet("pip"))` },
    ] },
    'z6-vector-class': { tools: [
      { key: 'kw:dunder', name: '__repr__   ·   __eq__   ·   __add__', what: py`Methods with two underscores on each side are called by Python itself: <code>__repr__</code> when the object is printed, <code>__eq__</code> for <code>==</code>, <code>__add__</code> for <code>+</code>, <code>__mul__</code> for <code>*</code>, <code>__abs__</code> for <code>abs()</code>.`, code: py`class Money:
    def __init__(self, cents):
        self.cents = cents

    def __repr__(self):
        return f"Money({self.cents})"

    def __add__(self, other):
        return Money(self.cents + other.cents)

print(Money(150) + Money(75))` },
      { key: 'hash', name: 'hash(value)   ·   __hash__', what: py`A number worked out from a value, which sets and dictionaries use to find things fast. Objects that are equal must have equal hashes, so a class with its own <code>__eq__</code> needs a <code>__hash__</code> built from the same fields.`, code: py`print(hash((1, 2)) == hash((1, 2)))
print(len({(1, 2), (1, 2), (2, 1)}))` },
    ] },
    'z6-longest-increasing-subsequence': { tools: [
      { key: null, name: 'the best answer that ends here', what: py`For problems about picking items in order, let position <code>i</code> hold the best answer that ends exactly at item <code>i</code>. It is built from the earlier positions that item <code>i</code> may follow, and the final answer is the best entry of the whole table.`, code: py`heights = [3, 1, 4]
longest = [1] * len(heights)
print(longest, max(longest))` },
    ] },
    'z5-kth-largest': { tools: [
      { key: 'heapq.heappush', also: ['heapq.heappop'], name: 'heapq.heappush(heap, value)   ·   heapq.heappop(heap)', what: py`A heap is a plain list that these two functions keep in a special order, so that the smallest item is always at <code>heap[0]</code>. A push or a pop takes about log n steps, far fewer than sorting again.`, code: py`import heapq

heap = []
for load in [5, 1, 8, 3]:
    heapq.heappush(heap, load)
print(heap[0])
print(heapq.heappop(heap), heapq.heappop(heap), heap[0])` },
    ] },
    'z6-trapping-rain-water': { tools: [
      { key: null, name: 'a = b = 0', what: py`Gives several names the same starting value in one line. Use it for numbers and text only: with a list, both names would point at the same list.`, code: py`low = high = 0
high += 5
print(low, high)` },
    ] },
    'z6-merge-k-sorted-lists': { tools: [
      { key: null, name: 'tuples in a heap', what: py`Tuples are compared item by item, from the left. Push <code>(priority, tiebreak, thing)</code> and the heap orders by priority, then by the tiebreak. The tiebreak keeps Python from ever having to compare the things themselves.`, code: py`import heapq

heap = []
heapq.heappush(heap, (5, 0, "low"))
heapq.heappush(heap, (1, 1, "high"))
heapq.heappush(heap, (1, 0, "first"))
print(heapq.heappop(heap))
print((1, 0) < (1, 1), (2, 0) < (1, 9))` },
    ] },
  };

  // A lesson is read one level before the level it prepares, so it must not speak of "this level".
  // [level id, the words as they stand in the level file, the words to show instead]
  const WORDING = [
    ['z4-valid-palindrome', 'Two string methods help in this level.', 'Two string methods will help as well.'],
  ];

  root.PYLON_TOOLCARDS = CARDS;
  root.PYLON_LESSON_WORDING = WORDING;
})(typeof window !== 'undefined' ? window : globalThis);
