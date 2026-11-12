/* Pylon levels, file 7: fundamentals that the first version skipped (boolean logic, slicing, split and join, text
   searching, character codes, function options, errors, debugging, parsing). js/curriculum.js places them on floors 2 and 3.
   Format and field notes: tools/level-example.js. "tools" are the reference cards shown with the lesson.
   Validate with: python tools/check_levels.py 7 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z7-leap-cycle',
      zone: 7,
      order: 1,
      kind: 'code',
      title: 'Leap Cycle',
      concept: 'Combining conditions: and, or, not',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A comparison such as <code>charge &gt; 60</code> is a value like any other: it is either <code>True</code> or <code>False</code>. You can store it in a variable, print it, and return it from a function.</p>
<p>Three words combine such values. <code>and</code> is true only when both sides are true. <code>or</code> is true when at least one side is. <code>not</code> flips a value.</p>
<pre><code>heat = 72
door_open = False
print(heat &gt; 60 and heat &lt; 80)     # True
print(heat &gt; 90 or door_open)      # False
print(not door_open)                # True</code></pre>
<p>When a rule has an exception, brackets keep it readable. Give each fact a name first, then combine the names:</p>
<pre><code>is_weekend = False
is_holiday = True
alarm_set = True
print(alarm_set and not (is_weekend or is_holiday))   # False</code></pre>
<p>A function that answers yes or no can return the combined value directly. There is no need for <code>if</code> around it.</p>`,
      tools: [
        { key: 'kw:and/or/not', name: 'a and b   ·   a or b   ·   not a', what: '<code>and</code> needs both sides to be true, <code>or</code> needs at least one, <code>not</code> flips True and False. <code>not</code> is applied first, then <code>and</code>, then <code>or</code>; use brackets when in doubt.', code: py`fuel = 40
crew_ready = True
print(fuel > 30 and crew_ready)
print(fuel > 90 or not crew_ready)` },
        { key: null, name: 'return a condition', what: 'A comparison already is True or False, so a yes-or-no function can return it as it stands.', code: py`def is_even(n):
    return n % 2 == 0

print(is_even(10), is_even(7))` },
      ],
      task: py`
<p>The tower counts time in cycles. Most cycles have 365 days, and a <b>leap cycle</b> has 366. The rule has an exception, and the exception has an exception:</p>
<ul><li>A cycle that divides evenly by 4 is a leap cycle.</li><li>Unless it also divides evenly by 100: then it is not.</li><li>Unless it also divides evenly by 400: then it is a leap cycle after all.</li></ul>
<p>Write <code>is_leap(cycle)</code>. Return <code>True</code> or <code>False</code>.</p>
<pre><code>is_leap(2024)   # True
is_leap(1900)   # False
is_leap(2000)   # True</code></pre>`,
      starter: py`def is_leap(cycle):
    pass
`,
      tests: [
        { call: py`is_leap(2024)`, expect: py`True` },
        { call: py`is_leap(2023)`, expect: py`False` },
        { call: py`is_leap(1900)`, expect: py`False` },
        { call: py`is_leap(2000)`, expect: py`True` },
        { call: py`is_leap(2100)`, expect: py`False` },
        { call: py`is_leap(2400)`, expect: py`True` },
        { call: py`[is_leap(c) for c in [1, 4, 100, 400]]`, expect: py`[False, True, False, True]` },
      ],
      hints: [
        py`Three facts decide the answer: does the cycle divide evenly by 4, by 100, by 400? Each one is a comparison with <code>%</code>.`,
        py`Give each fact a name, for example <code>by_four = cycle % 4 == 0</code>. A leap cycle must divide by 4. Dividing by 100 spoils it, unless it divides by 400 as well.`,
        py`In words: by four, <b>and</b> (not a century, <b>or</b> divisible by 400). Return that expression.`,
      ],
      solution: py`def is_leap(cycle):
    by_four = cycle % 4 == 0
    century = cycle % 100 == 0
    by_four_hundred = cycle % 400 == 0
    return by_four and (not century or by_four_hundred)
`,
      explain: py`
<p>Each rule becomes one named fact, and the last line reads almost like the task: divisible by four, and either not a century or one of the special centuries.</p>
<p>The brackets matter. Without them Python would group <code>by_four and not century</code> first, which happens to give the same answer here, but the reader should not have to work that out.</p>
<p><b>Cost:</b> three remainders and a few comparisons, whatever the cycle is. That is <code>O(1)</code>, constant time.</p>`,
    },
    {
      id: 'z7-tape-splice',
      zone: 7,
      order: 2,
      kind: 'code',
      title: 'Tape Splice',
      concept: 'Slicing: text[start:stop:step]',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>An index picks one character. A <b>slice</b> picks a run of them: <code>text[start:stop]</code> gives the characters from <code>start</code> up to, but not including, <code>stop</code>. Leave a side out and the slice runs to that end of the text.</p>
<pre><code>code = "PYLON-7"
print(code[0:5])     # PYLON
print(code[6:])      # 7
print(code[:2])      # PY</code></pre>
<p>Negative positions count from the end: <code>-1</code> is the last character. A third number is the step, and a step of <code>-1</code> walks backwards.</p>
<pre><code>code = "PYLON-7"
print(code[-1], code[-3:])    # 7 N-7
print(code[::2])              # PLN7
print(code[::-1])             # 7-NOLYP</code></pre>
<p>A slice never fails: positions past the end are simply cut off, so <code>code[3:99]</code> is fine. Slices work the same way on lists.</p>
<p>One more thing you will need: an empty string counts as false in an <code>if</code>, and any other string counts as true. The same holds for an empty list.</p>`,
      tools: [
        { key: 'kw:slice', name: 'text[start:stop]', what: 'The part from position <code>start</code> up to, but not including, <code>stop</code>. A missing <code>start</code> means the beginning, a missing <code>stop</code> means the end. Works on strings and lists, and never raises an error for positions that are too large.', code: py`signal = "north-relay"
print(signal[:5])
print(signal[6:])
print(signal[2:4])` },
        { key: 'kw:negative-index', name: 'text[-1]   ·   text[-3:]', what: 'Negative positions count from the end: <code>-1</code> is the last item, <code>-2</code> the one before it.', code: py`signal = "north-relay"
print(signal[-1])
print(signal[-5:])
print(signal[:-6])` },
        { key: null, name: 'text[::step]', what: 'A third number is the step. <code>[::2]</code> takes every second item and <code>[::-1]</code> gives the whole thing backwards.', code: py`print("abcdef"[::2])
print("abcdef"[::-1])
print([1, 2, 3][::-1])` },
        { key: null, name: 'if text:', what: 'Empty things are false: <code>""</code>, <code>[]</code>, <code>0</code> and <code>None</code>. Everything else is true. So <code>if not text:</code> asks whether the text is empty.', code: py`for text in ["relay", ""]:
    if text:
        print("has text")
    else:
        print("empty")` },
      ],
      task: py`
<p>A message tape comes off the reel turned: its first <code>k</code> characters belong at the end.</p>
<p>Write <code>rotate_left(tape, k)</code>. Return the tape with its first <code>k</code> characters moved to the end.</p>
<pre><code>rotate_left("abcdef", 2)   # "cdefab"
rotate_left("signal", 3)   # "nalsig"</code></pre>
<p><code>k</code> can be larger than the tape is long: turning a six-character tape 8 times is the same as turning it twice. The tape can also be empty, and an empty tape stays empty.</p>`,
      starter: py`def rotate_left(tape, k):
    pass
`,
      tests: [
        { call: py`rotate_left("abcdef", 2)`, expect: py`"cdefab"` },
        { call: py`rotate_left("signal", 3)`, expect: py`"nalsig"` },
        { call: py`rotate_left("abcdef", 0)`, expect: py`"abcdef"` },
        { call: py`rotate_left("abcdef", 6)`, expect: py`"abcdef"` },
        { call: py`rotate_left("abcdef", 8)`, expect: py`"cdefab"` },
        { call: py`rotate_left("a", 5)`, expect: py`"a"` },
        { call: py`rotate_left("", 3)`, expect: py`""` },
      ],
      hints: [
        py`The answer is two pieces of the tape glued together in the other order. Which tool cuts a piece out of a string?`,
        py`Everything from position <code>k</code> to the end comes first, then everything before position <code>k</code>. For a <code>k</code> larger than the tape, the remainder after dividing by the length is the real number of turns.`,
        py`Return early for an empty tape, because dividing by a length of 0 is an error. Then <code>k = k % len(tape)</code> and return <code>tape[k:] + tape[:k]</code>.`,
      ],
      solution: py`def rotate_left(tape, k):
    if not tape:
        return tape                # nothing to turn, and no division by zero
    k = k % len(tape)              # full turns change nothing
    return tape[k:] + tape[:k]
`,
      explain: py`
<p>Two slices do the whole job: <code>tape[k:]</code> is what stays in front, and <code>tape[:k]</code> is what moves to the back. Because one starts exactly where the other stops, no character is lost or doubled.</p>
<p>The remainder handles large values of <code>k</code>. Turning a tape of length 6 six times brings it back to the start, so only <code>k % 6</code> turns count.</p>
<p><b>Cost:</b> <code>O(n)</code> for a tape of n characters, since the new string has to be written out once.</p>`,
    },
    {
      id: 'z7-reverse-words',
      zone: 7,
      order: 3,
      kind: 'code',
      title: 'Echo in Reverse',
      concept: 'split() and join()',
      classic: 'Reverse Words in a String (LeetCode #151)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Text usually has to be taken apart before you can work with it. <code>split()</code> cuts a string into a list of pieces, and <code>join()</code> glues a list of strings back into one.</p>
<p>With nothing in the brackets, <code>split()</code> cuts at every run of spaces and throws the spaces away, so extra spaces never produce empty pieces:</p>
<pre><code>line = "  relay 7   online "
parts = line.split()
print(parts)             # ['relay', '7', 'online']
print(len(parts))        # 3</code></pre>
<p>Give it a separator and it cuts at exactly that text, every time it appears:</p>
<pre><code>print("a,b,,c".split(","))    # ['a', 'b', '', 'c']</code></pre>
<p><code>join()</code> is called on the glue, not on the list. The glue goes between the pieces, never at the ends:</p>
<pre><code>parts = ["relay", "7", "online"]
print("-".join(parts))    # relay-7-online
print("".join(parts))     # relay7online</code></pre>`,
      tools: [
        { key: '.split', name: 'text.split()   ·   text.split(sep)', what: 'Cuts the text into a list of pieces. With no argument it cuts at any run of spaces, tabs or line breaks and never gives empty pieces. With a separator it cuts at exactly that text, so two separators in a row give an empty piece.', code: py`print("  north   relay 7 ".split())
print("12:30:05".split(":"))
print("a,,b".split(","))` },
        { key: '.join', name: 'glue.join(pieces)', what: 'Builds one string from a list of strings, with the glue between each pair. Every piece must already be a string. It is the opposite of <code>split()</code>.', code: py`words = ["PIP", "is", "online"]
print(" ".join(words))
print("".join(["a", "b", "c"]))` },
      ],
      task: py`
<p>The relay echoes every message with the words in the opposite order.</p>
<p>Write <code>reverse_words(message)</code>. Return the same words, last word first, with exactly one space between them.</p>
<pre><code>reverse_words("the sky is blue")    # "blue is sky the"
reverse_words("  hello   world ")   # "world hello"</code></pre>
<p>The message can have extra spaces at the ends and between words. None of them belong in the answer. A message with no words gives an empty string.</p>`,
      starter: py`def reverse_words(message):
    pass
`,
      tests: [
        { call: py`reverse_words("the sky is blue")`, expect: py`"blue is sky the"` },
        { call: py`reverse_words("  hello   world ")`, expect: py`"world hello"` },
        { call: py`reverse_words("a good   example")`, expect: py`"example good a"` },
        { call: py`reverse_words("one")`, expect: py`"one"` },
        { call: py`reverse_words("")`, expect: py`""` },
        { call: py`reverse_words("     ")`, expect: py`""` },
        { call: py`reverse_words("PIP reports: all 7 relays online")`, expect: py`"online relays 7 all reports: PIP"` },
      ],
      hints: [
        py`You are not reversing letters, only the order of whole words. First get the words out of the message as a list.`,
        py`Three steps: cut the message into words, put that list in the opposite order, glue it back together with single spaces. You have met a tool for each step.`,
        py`<code>message.split()</code> gives the words and drops every extra space. A slice with a step of <code>-1</code> reverses a list. <code>" ".join(...)</code> glues the result.`,
      ],
      solution: py`def reverse_words(message):
    words = message.split()          # extra spaces disappear here
    return " ".join(words[::-1])     # last word first, one space between
`,
      explain: py`
<p><code>split()</code> without an argument does the cleaning for free: spaces at the ends and runs of spaces in the middle never show up as words.</p>
<p>The slice <code>[::-1]</code> gives the list backwards, and <code>join</code> puts exactly one space between neighbours, so the answer has no stray spaces either.</p>
<p><b>Cost:</b> <code>O(n)</code> time and space for a message of n characters. Each step reads or writes the text once.</p>`,
    },
    {
      id: 'z7-common-prefix',
      zone: 7,
      order: 4,
      kind: 'code',
      title: 'Shared Call Sign',
      concept: 'Searching text: startswith, find, in',
      classic: 'Longest Common Prefix (LeetCode #14)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Strings can answer questions about what they contain. <code>startswith()</code> and <code>endswith()</code> look at the two ends, <code>in</code> looks anywhere, and <code>find()</code> tells you the position.</p>
<pre><code>name = "relay-north"
print(name.startswith("relay"))     # True
print(name.endswith("south"))       # False
print("lay" in name)                # True
print(name.find("north"))           # 6
print(name.find("x"))               # -1, not there</code></pre>
<p>Often you do not know the answer in advance, but you can start with a guess that is too big and shrink it until it fits. A <code>while</code> loop with <code>not</code> does exactly that:</p>
<pre><code>guess = 100
while guess * guess &gt; 2000:     # too big: make it smaller
    guess -= 1
print(guess)                       # 44</code></pre>
<p>A slice makes a string one character shorter: <code>text[:-1]</code> is everything except the last character.</p>`,
      tools: [
        { key: '.startswith', also: ['.endswith'], name: 'text.startswith(start)   ·   text.endswith(end)', what: 'True when the text begins (or ends) with the given piece. Every string starts with the empty string <code>""</code>.', code: py`name = "relay-north"
print(name.startswith("relay"), name.startswith("north"))
print(name.endswith("north"), name.startswith(""))` },
        { key: '.find', name: 'text.find(piece)', what: 'The position where the piece first appears, or <code>-1</code> when it does not appear at all.', code: py`print("relay-north".find("-"))
print("relay-north".find("south"))` },
        { key: 'kw:in-test', name: 'piece in text', what: 'True when the piece appears anywhere in the text. With a list it asks whether the list holds that item.', code: py`print("lay" in "relay", "LAY" in "relay")
print(7 in [3, 7, 9], "x" not in "relay")` },
      ],
      task: py`
<p>Relays in the same family share the start of their call sign. Find that shared start.</p>
<p>Write <code>common_prefix(names)</code>. Return the longest text that every name in the list begins with. If they share nothing, return an empty string.</p>
<pre><code>common_prefix(["flower", "flow", "flight"])   # "fl"
common_prefix(["dog", "racecar", "car"])      # ""</code></pre>
<p>The list always holds at least one name.</p>`,
      starter: py`def common_prefix(names):
    pass
`,
      tests: [
        { call: py`common_prefix(["flower", "flow", "flight"])`, expect: py`"fl"` },
        { call: py`common_prefix(["dog", "racecar", "car"])`, expect: py`""` },
        { call: py`common_prefix(["relay"])`, expect: py`"relay"` },
        { call: py`common_prefix(["relay-1", "relay-2", "relay-30"])`, expect: py`"relay-"` },
        { call: py`common_prefix(["", "abc"])`, expect: py`""` },
        { call: py`common_prefix(["abc", "abc"])`, expect: py`"abc"` },
        { call: py`common_prefix(["interstellar", "internet", "interval", "int"])`, expect: py`"int"` },
      ],
      hints: [
        py`The answer can never be longer than the first name. So the first name is a guess that is, if anything, too long.`,
        py`Compare the guess with each other name in turn. While a name does not begin with the guess, the guess is too long: shorten it by one character and ask again.`,
        py`Start with <code>prefix = names[0]</code>. For every other name, loop <code>while not name.startswith(prefix)</code> and cut the last character off with <code>prefix[:-1]</code>. The empty string ends every loop, because every name starts with it.`,
      ],
      solution: py`def common_prefix(names):
    prefix = names[0]                          # a guess that can only be too long
    for name in names[1:]:
        while not name.startswith(prefix):
            prefix = prefix[:-1]               # one character shorter, try again
    return prefix
`,
      explain: py`
<p>The guess only ever shrinks, and it shrinks just enough for each name. Once it fits a name it still fits all the earlier ones, because a shorter start of a matching start still matches.</p>
<p>The loop always stops: in the worst case the guess becomes the empty string, and every name starts with that.</p>
<p><b>Cost:</b> each name is compared a few times, so the work grows with the total number of characters in the list.</p>`,
    },
    {
      id: 'z7-caesar',
      zone: 7,
      order: 5,
      kind: 'code',
      title: 'Shift Cipher',
      concept: 'Character codes: ord() and chr()',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Inside the machine every character is a number. <code>ord()</code> gives the number of a character and <code>chr()</code> gives the character of a number. The lower-case letters sit in one unbroken row, from 97 for <code>a</code> to 122 for <code>z</code>.</p>
<pre><code>print(ord("a"), ord("b"), ord("z"))    # 97 98 122
print(chr(100))                        # d
print(chr(ord("a") + 4))               # e</code></pre>
<p>Subtracting <code>ord("a")</code> turns a letter into its place in the alphabet, counted from 0. The remainder operator wraps a place that runs off the end back to the start:</p>
<pre><code>place = ord("y") - ord("a")
print(place)                # 24
print((place + 3) % 26)     # 1, which is "b"</code></pre>
<p>Strings can also tell you what kind of characters they hold:</p>
<pre><code>print("r".islower(), "R".islower(), "7".isalpha())   # True False False</code></pre>
<p>To build a new string piece by piece, collect the pieces in a list and <code>join</code> them at the end.</p>`,
      tools: [
        { key: 'ord', name: 'ord(character)', what: 'The number code of one character. Letters that follow each other in the alphabet have codes that follow each other.', code: py`print(ord("a"), ord("c"))
print(ord("c") - ord("a"))` },
        { key: 'chr', name: 'chr(number)', what: 'The character that has that number code. It undoes <code>ord()</code>.', code: py`print(chr(97), chr(122))
print(chr(ord("a") + 25))` },
        { key: '.islower', also: ['.isupper'], name: 'text.islower()   ·   text.isupper()', what: 'True when the letters in the text are all lower case (or all upper case). Digits and punctuation on their own give False.', code: py`print("relay".islower(), "Relay".islower())
print("7".islower(), "OK".isupper())` },
        { key: '.isalpha', also: ['.isdigit'], name: 'text.isalpha()   ·   text.isdigit()', what: 'True when every character is a letter (or every character is a digit), and the text is not empty.', code: py`print("relay".isalpha(), "relay7".isalpha())
print("2024".isdigit(), "20.5".isdigit())` },
      ],
      task: py`
<p>The oldest cipher in the hall moves every letter a fixed number of places along the alphabet. With a key of 3, <code>a</code> becomes <code>d</code>, and <code>y</code> wraps around to <code>b</code>.</p>
<p>Write <code>shift(text, key)</code>. Move every lower-case letter <code>key</code> places forward, wrapping from <code>z</code> back to <code>a</code>. Leave every other character as it is: spaces, digits, punctuation and capital letters.</p>
<pre><code>shift("abc", 1)            # "bcd"
shift("xyz", 3)            # "abc"
shift("hello, world!", 13) # "uryyb, jbeyq!"</code></pre>
<p>A negative key moves backwards, so <code>shift(shift(text, 5), -5)</code> gives the text back.</p>`,
      starter: py`def shift(text, key):
    pass
`,
      tests: [
        { call: py`shift("abc", 1)`, expect: py`"bcd"` },
        { call: py`shift("xyz", 3)`, expect: py`"abc"` },
        { call: py`shift("hello, world!", 13)`, expect: py`"uryyb, jbeyq!"` },
        { call: py`shift("uryyb, jbeyq!", 13)`, expect: py`"hello, world!"` },
        { call: py`shift("pylon 7", 26)`, expect: py`"pylon 7"` },
        { call: py`shift("bcd", -1)`, expect: py`"abc"` },
        { call: py`shift("Relay", 2)`, expect: py`"Rgnca"` },
        { call: py`shift("", 5)`, expect: py`""` },
      ],
      hints: [
        py`Handle one character at a time. A lower-case letter has to become a number before you can move it, and a character again afterwards.`,
        py`For a lower-case letter: find its place in the alphabet (0 to 25), add the key, and wrap the result so it stays between 0 and 25. Then turn the place back into a letter. Other characters go into the answer unchanged.`,
        py`<code>place = (ord(char) - ord("a") + key) % 26</code>, then <code>chr(ord("a") + place)</code>. Collect the characters in a list and return <code>"".join(...)</code>.`,
      ],
      solution: py`def shift(text, key):
    shifted = []
    for char in text:
        if char.islower():
            place = (ord(char) - ord("a") + key) % 26    # 0..25, wrapped
            char = chr(ord("a") + place)
        shifted.append(char)
    return "".join(shifted)
`,
      explain: py`
<p>Each lower-case letter makes a round trip: letter to place in the alphabet, place plus key, wrap, and back to a letter. Everything else is passed through untouched.</p>
<p>The remainder does the wrapping in both directions. In Python <code>-1 % 26</code> is 25, so a negative key steps backwards past <code>a</code> and arrives at <code>z</code> without any extra code.</p>
<p><b>Cost:</b> <code>O(n)</code> for a text of n characters. Collecting pieces in a list and joining once is the efficient way to build a long string.</p>`,
    },
    {
      id: 'z7-flexible-functions',
      zone: 7,
      order: 6,
      kind: 'code',
      title: 'Dial Settings',
      concept: 'Default values and keyword arguments',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A parameter can have a <b>default value</b>. The caller may then leave that argument out, and the function uses the default.</p>
<pre><code>def tag(name, floor=1, sep="-"):
    return f"{name}{sep}{floor}"

print(tag("relay"))              # relay-1
print(tag("relay", 4))           # relay-4
print(tag("relay", sep=":"))     # relay:1</code></pre>
<p>The last call uses a <b>keyword argument</b>: it names the parameter it wants to set, so it can skip <code>floor</code> and still change <code>sep</code>. Parameters with defaults come after the ones without.</p>
<p>A function can also hand back several values at once. Separate them with commas, and the caller can unpack them into separate names:</p>
<pre><code>def span(values):
    return min(values), max(values)

low, high = span([4, 9, 2])
print(low, high)                 # 2 9</code></pre>
<p>Four built-in functions summarise a list of numbers: <code>min()</code>, <code>max()</code>, <code>sum()</code> and <code>len()</code>. <code>round(x, digits)</code> rounds to a number of decimal places.</p>
<pre><code>loads = [3, 8, 4]
print(sum(loads), sum(loads) / len(loads))    # 15 5.0
print(round(2 / 3, 2))                        # 0.67</code></pre>`,
      tools: [
        { key: 'kw:default-arg', name: 'def name(a, b=value):', what: 'A parameter with <code>=value</code> is optional. When the caller leaves it out, the function uses the default. Optional parameters come last.', code: py`def greet(name, greeting="Hello"):
    return f"{greeting}, {name}"

print(greet("PIP"))
print(greet("PIP", "Welcome back"))` },
        { key: 'kw:keyword-arg', name: 'name(a, b=value)', what: 'When calling, <code>parameter=value</code> sets one parameter by name. It lets you skip optional parameters and makes the call say what each value means.', code: py`def tag(name, floor=1, sep="-"):
    return f"{name}{sep}{floor}"

print(tag("relay", sep="/"))
print(tag("relay", floor=3))` },
        { key: 'kw:unpack', name: 'return a, b   ·   a, b = values', what: 'Values separated by commas travel together as a tuple. On the left of <code>=</code>, the same commas unpack them into separate names. The counts must match.', code: py`def halves(n):
    return n // 2, n - n // 2

small, large = halves(7)
print(small, large)` },
        { key: 'min', also: ['max'], name: 'min(items)   ·   max(items)', what: 'The smallest and the largest item of a list. They also accept the values directly: <code>min(a, b)</code>.', code: py`loads = [40, 12, 77]
print(min(loads), max(loads))
print(max(3, 9), min("pear", "apple"))` },
        { key: 'sum', name: 'sum(numbers)', what: 'All the numbers of a list added up. An empty list gives 0.', code: py`print(sum([4, 5, 6]), sum([]))
print(sum([4, 5, 6]) / 3)` },
        { key: 'round', name: 'round(x, digits)', what: 'The number rounded to that many decimal places. Without <code>digits</code> it rounds to a whole number.', code: py`print(round(3.14159, 2), round(2.5678, 1))
print(round(7.8))` },
      ],
      task: py`
<p>Every dial in the hall shows a summary of its sensor readings. Different dials want it slightly differently, so the function takes options.</p>
<p>Write <code>summary(readings, digits=1, skip_zero=False)</code>. Return three values: the lowest reading, the highest reading, and the average rounded to <code>digits</code> decimal places.</p>
<p>When <code>skip_zero</code> is true, readings that are exactly 0 come from dead sensors and must be left out of all three values.</p>
<pre><code>summary([2, 4, 9])                        # (2, 9, 5.0)
summary([1, 2, 2], 2)                     # (1, 2, 1.67)
summary([3, 0, 4, 0], skip_zero=True)     # (3, 4, 3.5)</code></pre>
<p>There is always at least one reading that counts.</p>`,
      starter: py`def summary(readings):
    pass
`,
      tests: [
        { call: py`summary([2, 4, 9])`, expect: py`(2, 9, 5.0)` },
        { call: py`summary([1, 2, 2], 2)`, expect: py`(1, 2, 1.67)` },
        { call: py`summary([3, 0, 4, 0], skip_zero=True)`, expect: py`(3, 4, 3.5)` },
        { call: py`summary([3, 0, 4, 0])`, expect: py`(0, 4, 1.8)` },
        { call: py`summary([7])`, expect: py`(7, 7, 7.0)` },
        { call: py`summary([10, 20, 0], digits=3, skip_zero=True)`, expect: py`(10, 20, 15.0)` },
        { call: py`summary([1, 2, 4], digits=0)`, expect: py`(1, 4, 2.0)` },
      ],
      hints: [
        py`The starter only accepts <code>readings</code>. The tests also pass <code>digits</code> and <code>skip_zero</code>, sometimes by position and sometimes by name, and sometimes not at all. The first line of the function has to allow all of that.`,
        py`Give both options a default value in the <code>def</code> line. Inside, first decide which readings count. Then the three results come from built-in functions you have just met.`,
        py`Build a list <code>kept</code> with every reading that is not 0, or every reading when <code>skip_zero</code> is false. Return <code>min(kept), max(kept), round(sum(kept) / len(kept), digits)</code>.`,
      ],
      solution: py`def summary(readings, digits=1, skip_zero=False):
    kept = []
    for reading in readings:
        if reading != 0 or not skip_zero:      # zeros stay unless we were told to skip them
            kept.append(reading)
    average = round(sum(kept) / len(kept), digits)
    return min(kept), max(kept), average
`,
      explain: py`
<p>The two defaults make every call in the tests legal: <code>summary(r)</code>, <code>summary(r, 2)</code> and <code>summary(r, skip_zero=True)</code> all reach the same function.</p>
<p>Deciding which readings count comes first, so the three results are computed from one clean list. The three values go back together, separated by commas.</p>
<p><b>Cost:</b> <code>O(n)</code>. The list is read a handful of times, once by the loop and once each by <code>min</code>, <code>max</code> and <code>sum</code>.</p>`,
    },
    {
      id: 'z7-safe-parse',
      zone: 7,
      order: 7,
      kind: 'code',
      title: 'Faulty Sensors',
      concept: 'Errors: try, except and raise',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Some operations cannot always succeed. <code>int("42")</code> gives 42, but <code>int("4 2")</code> has no sensible answer, so Python <b>raises</b> an error, here a <code>ValueError</code>. An error that nobody handles stops the program.</p>
<p>You handle one with <code>try</code> and <code>except</code>. Python runs the <code>try</code> block. If the named error happens inside it, Python jumps to the <code>except</code> block and carries on from there.</p>
<pre><code>def to_number(text):
    try:
        return int(text)
    except ValueError:
        return None

print(to_number("42"), to_number("4 2"))    # 42 None</code></pre>
<p>Your own functions can raise errors too, when they are given something they cannot work with. The message says what went wrong:</p>
<pre><code>def check_floor(floor):
    if floor &lt; 1:
        raise ValueError("floors start at 1")
    return floor

try:
    check_floor(0)
except ValueError as problem:
    print("refused:", problem)    # refused: floors start at 1</code></pre>
<p>Name the error you expect after <code>except</code>. A bare <code>except:</code> would also hide mistakes you did not see coming.</p>`,
      tools: [
        { key: 'kw:try/except', also: ['ValueError'], name: 'try: ...   except ErrorType: ...', what: 'Runs the <code>try</code> block. If that kind of error is raised inside it, the rest of the block is skipped and the <code>except</code> block runs. If no error happens, the <code>except</code> block is skipped.', code: py`for text in ["12", "twelve"]:
    try:
        print(int(text) * 2)
    except ValueError:
        print("not a number:", text)` },
        { key: 'kw:raise', name: 'raise ValueError("message")', what: 'Stops the function at once and reports an error to whoever called it. Use it when the input makes the job impossible.', code: py`def half(n):
    if n % 2 != 0:
        raise ValueError("odd number")
    return n // 2

try:
    print(half(10))
    print(half(7))
except ValueError as problem:
    print("error:", problem)` },
        { key: 'int', also: ['float'], name: 'int(text)   ·   float(text)', what: 'Turn text into a number. Spaces around the digits are allowed. Text that is not a number raises <code>ValueError</code>, and <code>int()</code> refuses text with a decimal point.', code: py`print(int(" 42 ") + 1, float("2.5") * 2)
try:
    int("4.5")
except ValueError:
    print("int() cannot read 4.5")` },
      ],
      task: py`
<p>Half the sensors in the hall send garbage. Each reading arrives as text: sometimes a whole number, sometimes <code>"n/a"</code>, sometimes nothing at all.</p>
<p>Write <code>total_power(readings)</code>. Add up every reading that is a whole number and ignore the rest.</p>
<pre><code>total_power(["12", "7", "30"])       # 49
total_power(["12", "n/a", " 8 "])    # 20</code></pre>
<p>If <b>not one</b> reading is a number, the total would be meaningless. In that case raise a <code>ValueError</code> with the message <code>no valid readings</code>.</p>`,
      starter: py`def total_power(readings):
    pass
`,
      tests: [
        { call: py`total_power(["12", "7", "30"])`, expect: py`49` },
        { call: py`total_power(["12", "n/a", " 8 "])`, expect: py`20` },
        { call: py`total_power(["4.5", "3"])`, expect: py`3` },
        { call: py`total_power(["-5", "5", "+2", "two"])`, expect: py`2` },
        { call: py`total_power(["0", "off"])`, expect: py`0` },
        {
          setup: py`def outcome(readings):
    try:
        return total_power(readings)
    except ValueError as problem:
        return "ValueError: " + str(problem)`,
          call: py`outcome(["off", "", "?"])`,
          expect: py`"ValueError: no valid readings"`,
          show: py`total_power(["off", "", "?"])   must raise ValueError("no valid readings")`,
        },
        {
          setup: py`def outcome(readings):
    try:
        return total_power(readings)
    except ValueError as problem:
        return "ValueError: " + str(problem)`,
          call: py`outcome([])`,
          expect: py`"ValueError: no valid readings"`,
          show: py`total_power([])   must raise ValueError("no valid readings")`,
        },
      ],
      hints: [
        py`You cannot tell in advance which readings are numbers. Try to convert each one, and be ready for the conversion to fail.`,
        py`Put the conversion inside <code>try</code>, and in <code>except ValueError</code> do nothing. A total of 0 does not mean there were no valid readings, because <code>"0"</code> is a valid reading. Count the valid ones separately.`,
        py`Keep <code>total</code> and <code>valid</code>, both starting at 0. In the <code>try</code> block add <code>int(text)</code> to the total and 1 to the count. After the loop, <code>raise ValueError("no valid readings")</code> when the count is 0.`,
      ],
      solution: py`def total_power(readings):
    total = 0
    valid = 0
    for text in readings:
        try:
            total += int(text)
            valid += 1
        except ValueError:
            pass                   # not a whole number: leave it out
    if valid == 0:
        raise ValueError("no valid readings")
    return total
`,
      explain: py`
<p>Asking <code>int()</code> to do the conversion, and catching the error when it cannot, is simpler and safer than checking the text by hand. It already knows about spaces, signs and everything else a number may contain.</p>
<p>The count of valid readings is kept apart from the total. The total alone cannot tell "nothing was valid" from "the valid readings add up to 0".</p>
<p><b>Cost:</b> <code>O(n)</code> for n readings: each one is converted once.</p>`,
    },
    {
      id: 'z7-bug-hunt',
      zone: 7,
      order: 8,
      kind: 'code',
      keepStarter: true,
      title: 'Bug Hunt',
      concept: 'Debugging: reproduce, trace, fix',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Code that runs is not the same as code that is right. Finding out why a program gives the wrong answer is called <b>debugging</b>, and it is a skill of its own. Guessing rarely works. A method does:</p>
<ol><li><b>Reproduce.</b> Find the smallest input that gives a wrong answer, and work out by hand what the answer should be.</li><li><b>Trace.</b> Use <b>Step through</b> and watch the variables. Stop at the first line where a value is not what you expected. The bug is on that line or just before it.</li><li><b>Fix one thing.</b> Change it, run again, and look at which tests changed.</li></ol>
<p>Most bugs are one of a few old friends. A loop that stops one item too early or too late:</p>
<pre><code>values = [4, 8, 15]
for i in range(len(values) - 1):    # one short: the 15 is never visited
    print(values[i])</code></pre>
<p>A counter or a total that starts at the wrong value. A comparison that should or should not include the boundary: <code>&gt;</code> against <code>&gt;=</code>. And the two divisions: <code>/</code> keeps the fraction, <code>//</code> throws it away.</p>
<pre><code>print(7 / 2, 7 // 2)    # 3.5 3</code></pre>
<p>Finally, ask what happens with nothing: an empty list, a count of zero. Dividing by a count of zero is an error.</p>`,
      tools: [
        { key: null, name: 'Step through', what: 'The button next to Run replays your code one line at a time and shows every variable. The first line where a value surprises you is where to look.', code: null },
        { key: 'kw:/', name: 'a / b   ·   a // b', what: '<code>/</code> is true division and always gives a number with a decimal point. <code>//</code> divides and throws the fraction away.', code: py`print(9 / 2, 9 // 2)
print(8 / 2, 8 // 2)` },
        { key: null, name: 'range(len(items))', what: 'Counts from 0 to the last position. <code>range(len(items) - 1)</code> stops one early, and <code>range(1, len(items))</code> starts one late. When you only need the items, loop over the list itself.', code: py`items = ["a", "b", "c"]
print(list(range(len(items))))
print(list(range(len(items) - 1)))` },
      ],
      task: py`
<p>The night shift left this function behind. It should return the <b>average of the readings that are above the limit</b>, or <code>0</code> when no reading is above it.</p>
<pre><code>average_above([5, 9, 12], 6)    # 10.5, the average of 9 and 12
average_above([1, 2, 3], 5)     # 0</code></pre>
<p>It runs without an error and gives wrong answers. It has several bugs. Find and fix them all. Do not start again from an empty function: reading and repairing someone else's code is the job here.</p>`,
      starter: py`def average_above(readings, limit):
    total = 0
    count = 1
    for i in range(len(readings) - 1):
        if readings[i] >= limit:
            total += readings[i]
            count += 1
    return total // count
`,
      tests: [
        { call: py`average_above([5, 9, 12], 6)`, expect: py`10.5` },
        { call: py`average_above([1, 2, 3], 5)`, expect: py`0` },
        { call: py`average_above([10, 20, 30], 10)`, expect: py`25.0` },
        { call: py`average_above([7], 3)`, expect: py`7.0` },
        { call: py`average_above([], 1)`, expect: py`0` },
        { call: py`average_above([4, 4, 9], 4)`, expect: py`9.0` },
        { call: py`average_above([3, 8, 3, 8], 3)`, expect: py`8.0` },
      ],
      hints: [
        py`Run it and pick the first failing test. Work out the right answer by hand, then press <b>Step through this test</b> and watch <code>total</code> and <code>count</code> change. Which readings are visited, and which are not?`,
        py`There are four things wrong and one case missing. Look at: the value <code>count</code> starts with, where the loop stops, whether a reading equal to the limit is "above" it, and which division the last line uses.`,
        py`Start <code>count</code> at 0. Visit every reading. Use <code>&gt;</code>, not <code>&gt;=</code>. Divide with <code>/</code>. Before dividing, return 0 when <code>count</code> is 0.`,
      ],
      solution: py`def average_above(readings, limit):
    total = 0
    count = 0
    for reading in readings:
        if reading > limit:
            total += reading
            count += 1
    if count == 0:
        return 0                   # nothing above the limit, and nothing to divide by
    return total / count
`,
      explain: py`
<p>The broken version had four bugs. The count started at 1, so every average was divided by one too many. The loop stopped one reading early. <code>&gt;=</code> let readings equal to the limit in. And <code>//</code> cut the fraction off the result.</p>
<p>Fixing the starting count uncovers the missing case: with no reading above the limit, the count is 0 and the division would fail. That case gets its own early return.</p>
<p>Looping over the readings themselves, instead of over positions, removes the chance of an off-by-one mistake altogether.</p>`,
    },
    {
      id: 'z7-decoder',
      zone: 7,
      order: 9,
      kind: 'code',
      title: 'The Decoder',
      concept: 'Parsing text line by line',
      difficulty: 'Medium',
      boss: true,
      lesson: py`
<p>Real data arrives as text: a log, a report, a transmission. Turning it into numbers you can trust is called <b>parsing</b>, and it is mostly a matter of taking the text apart in layers.</p>
<p><code>splitlines()</code> cuts a text into its lines. Each line is then cut into fields with <code>split()</code>, and each field is cleaned and converted.</p>
<pre><code>report = "north:12\nsouth:7\n\neast:x"
lines = report.splitlines()
print(len(lines))                # 4, the empty line counts
name, value = lines[0].split(":")
print(name, int(value) + 1)      # north 13</code></pre>
<p>Not every line will be good. Inside a loop, <code>continue</code> abandons the current item and moves straight on to the next one, which keeps the checks flat instead of nested:</p>
<pre><code>for line in ["north:12", "", "east"]:
    if ":" not in line:
        continue                 # nothing to read here
    print(line.split(":")[0])    # north</code></pre>
<p><code>break</code> is its sibling: it leaves the loop altogether.</p>
<p>Before unpacking the fields of a line, check how many there are. Unpacking two names from three fields is an error.</p>`,
      tools: [
        { key: '.splitlines', name: 'text.splitlines()', what: 'The lines of a text as a list, without the line breaks. An empty line in the text gives an empty string in the list.', code: py`text = "first\nsecond\n\nfourth"
print(text.splitlines())
print(len(text.splitlines()))` },
        { key: 'kw:continue', name: 'continue', what: 'Inside a loop: skip the rest of this round and go on with the next item.', code: py`for n in [3, -1, 4]:
    if n < 0:
        continue
    print(n)` },
        { key: 'kw:break', name: 'break', what: 'Inside a loop: leave the loop at once. Code after the loop still runs.', code: py`for n in [3, -1, 4]:
    if n < 0:
        break
    print(n)
print("done")` },
      ],
      task: py`
<p>The hall's master transmission is one long text. Each line should describe one relay as three fields separated by colons: <code>ID:POWER:CHECK</code>, for example <code>K7:120:3</code>.</p>
<p>A line is <b>valid</b> when all of this holds:</p>
<ul><li>it has exactly three fields,</li><li><code>POWER</code> and <code>CHECK</code> are whole numbers,</li><li><code>CHECK</code> equals <code>POWER % 9</code>.</li></ul>
<p>Write <code>decode(transmission)</code>. Return the total <code>POWER</code> of the valid lines. Blank lines and damaged lines are simply ignored. Spaces at the ends of a line do not matter.</p>
<pre><code>decode("K7:120:3\nA1:45:0\nB2:50:4")    # 165: the last line fails its check</code></pre>`,
      starter: py`def decode(transmission):
    pass
`,
      tests: [
        { call: py`decode("K7:120:3")`, expect: py`120` },
        { call: py`decode("K7:120:3\nA1:45:0\nB2:50:4")`, expect: py`165` },
        { call: py`decode("  K7:120:3  \n\nZZ:10:1\n")`, expect: py`130` },
        { call: py`decode("K7:120\nK8:9:0:extra\nK9:18:0")`, expect: py`18` },
        { call: py`decode("K7:abc:3\nK8:27:zero\nK9:27:0")`, expect: py`27` },
        { call: py`decode("")`, expect: py`0` },
        { call: py`decode("noise\n::\nQ:8:8")`, expect: py`8` },
      ],
      hints: [
        py`Work in layers: text into lines, a line into fields, fields into numbers. After each layer something can be wrong, and a wrong line is skipped.`,
        py`For each line: remove the outer spaces and cut it at the colons. If there are not exactly three fields, move on to the next line. Converting the two numbers can fail, so that step needs protecting.`,
        py`Loop over <code>transmission.splitlines()</code>. Use <code>continue</code> when <code>len(fields) != 3</code>. Convert inside <code>try</code>, and <code>continue</code> in <code>except ValueError</code>. Add the power when <code>power % 9 == check</code>.`,
      ],
      solution: py`def decode(transmission):
    total = 0
    for line in transmission.splitlines():
        fields = line.strip().split(":")
        if len(fields) != 3:
            continue                       # wrong shape: blank, or too few or too many fields
        try:
            power = int(fields[1])
            check = int(fields[2])
        except ValueError:
            continue                       # a field that is not a whole number
        if power % 9 == check:
            total += power
    return total
`,
      explain: py`
<p>Each line passes three gates in turn: the right number of fields, two fields that convert to numbers, and a check value that matches. A line that fails a gate is dropped with <code>continue</code>, so the code never has to nest one check inside another.</p>
<p>Blank lines need no special case. Splitting an empty line gives a single empty field, which fails the first gate.</p>
<p><b>Cost:</b> <code>O(n)</code> for a transmission of n characters. Every character is looked at a fixed number of times.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
