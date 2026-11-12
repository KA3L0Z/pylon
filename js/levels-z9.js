/* Pylon levels, file 9: what a program reads and writes. input(), text files and regular expressions.
   js/curriculum.js puts the first level on floor 2 and the other five on a floor of their own, the Signal Archive.
   Format and field notes: tools/level-example.js. New here:
     - a test may carry "stdin" (the lines input() will read) and "files" ({ name: text }, the files that exist for it);
     - "lessonFiles" are the files the lesson's own examples can open;
     - a card may carry "stdin" and "files" for its example.
   Validate with: python tools/check_levels.py 9 */
(function (root) {
  const py = String.raw;
  const RELAY_LOG = 'relay 7 online\nrelay 2 offline\n';

  const LEVELS = [
    {
      id: 'z9-console-input',
      zone: 9,
      order: 1,
      kind: 'code',
      title: 'Operator Console',
      concept: 'input(): reading what the user types',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>So far every value was written into the program. <code>input()</code> lets the person at the keyboard supply one: it waits for a line of text and returns it.</p>
<pre><code>name = input()
print("Hello, " + name)</code></pre>
<p>If the user types <code>Ada</code>, the program prints <code>Hello, Ada</code>. Each call to <code>input()</code> takes the next line, in order.</p>
<p>What comes back is <b>always text</b>, even when the user types digits. Text and numbers behave differently, so convert before you calculate: <code>int()</code> makes a whole number, <code>float()</code> a number with a decimal point.</p>
<pre><code>print("7" * 2)             # 77: the text, twice
print(int("7") * 2)        # 14: the number, doubled
print(float("2.5") + 1)    # 3.5</code></pre>
<p>You can put a question in the brackets, and <code>input</code> prints it before it waits:</p>
<pre><code>cells = int(input("How many cells? "))</code></pre>
<p>In the tower nobody sits at the keyboard while the tests run. Each test hands your program its lines of input and then reads what the program printed. The Scratchpad has an <b>Input</b> box under the editor for the same purpose: one line for each <code>input()</code> call.</p>`,
      tools: [
        { key: 'input', name: 'input()   ·   input("question")', what: py`Waits for one line of text and returns it, <b>always as a string</b>. With a question in the brackets, it prints the question first.`, stdin: 'Ada\n', code: py`name = input()
print("Hello, " + name)` },
        { key: 'int', also: ['float'], name: 'int(text)   ·   float(text)', what: py`Turn text into a number: <code>int</code> for whole numbers, <code>float</code> for numbers with a decimal point. Text that is not a number stops the program with a ValueError.`, code: py`print(int("42") + 1, float("2.5") * 2)
print("42" + "1", int("42") + int("1"))` },
        { key: null, name: 'text or number?', what: py`<code>"7"</code> and <code>7</code> are different things. <code>+</code> joins two texts and adds two numbers, and refuses to mix them. <code>*</code> repeats a text.`, code: py`print("7" + "7", 7 + 7, "7" * 3)` },
      ],
      task: py`
<p>The console on this floor asks the operator on duty two things: a name, and how many power cells are in the rack.</p>
<p>Write a program that reads two lines of input, the name first and then the number of cells (a whole number). The rack is then refilled with 10 more cells. Print exactly two lines:</p>
<pre><code>Operator: Ada
Cells after refill: 15</code></pre>
<p>That is the output for the input lines <code>Ada</code> and <code>5</code>. The tests run your program several times, with different input each time.</p>`,
      starter: py`name = input()
`,
      tests: [
        { stdin: 'Ada\n5\n', stdout: 'Operator: Ada\nCells after refill: 15\n' },
        { stdin: 'PIP\n0\n', stdout: 'Operator: PIP\nCells after refill: 10\n' },
        { stdin: 'Grace Hopper\n990\n', stdout: 'Operator: Grace Hopper\nCells after refill: 1000\n' },
      ],
      hints: [
        py`Each call to <code>input()</code> takes one line, in order. The first call gets the name, and a second call gets the number.`,
        py`What <code>input()</code> returns is text, even when it looks like a number. Adding 10 to text is an error, so turn it into a number first.`,
        py`<code>cells = int(input())</code> reads the second line as a whole number. <code>print</code> puts a space between values separated by commas: <code>print("Cells after refill:", cells + 10)</code>.`,
      ],
      solution: py`name = input()
cells = int(input())
print("Operator:", name)
print("Cells after refill:", cells + 10)
`,
      explain: py`
<p>Two calls to <code>input()</code> read the two lines in order. The second one is wrapped in <code>int()</code>, because <code>"5" + 10</code> is an error while <code>5 + 10</code> is 15.</p>
<p><code>print</code> with a comma converts each value to text by itself and puts one space between them, so no <code>str()</code> is needed here.</p>
<p><b>Cost:</b> a fixed number of steps: <code>O(1)</code>.</p>`,
    },
    {
      id: 'z9-read-log',
      zone: 9,
      order: 2,
      kind: 'code',
      title: 'Read the Log',
      concept: 'Reading files: open, with and lines',
      difficulty: 'Easy',
      boss: false,
      lessonFiles: { 'shift.txt': 'ada 6\npip 9\n' },
      lesson: py`
<p>Data that has to outlive a program is kept in <b>files</b>. A text file is a name with lines of text behind it. Suppose <code>shift.txt</code> holds these two lines:</p>
<pre><code>ada 6
pip 9</code></pre>
<p><code>open()</code> takes the name and gives back a file object. Put it in a <code>with</code> block: the file is closed when the block ends, even if an error happens inside it. A <code>for</code> loop over the file hands you one line at a time.</p>
<pre><code>with open("shift.txt") as shift:
    for line in shift:
        print(line.strip())              # ada 6, then pip 9</code></pre>
<p>Every line arrives with its line break still attached. <code>strip()</code> removes it, and you should do that before you compare or convert anything.</p>
<p>Two more ways to read: <code>read()</code> returns the whole file as one string, and <code>readlines()</code> returns a list of lines.</p>
<pre><code>with open("shift.txt") as shift:
    text = shift.read()
print(len(text), text.split())           # 12 ['ada', '6', 'pip', '9']</code></pre>
<p>Opening a file that does not exist stops the program with a <code>FileNotFoundError</code>. When a missing file is something that can normally happen, catch it:</p>
<pre><code>try:
    with open("nothing.txt") as missing:
        print(missing.read())
except FileNotFoundError:
    print("no such file")                # no such file</code></pre>`,
      tools: [
        { key: 'open', also: ['kw:with'], name: 'with open(name) as handle:', what: py`Opens a file for reading and gives you a file object. <code>with</code> closes the file when the block ends, even if an error happens inside it.`, files: { 'log.txt': RELAY_LOG }, code: py`with open("log.txt") as log:
    first = log.readline()
print(first.strip())
print(log.closed)` },
        { key: null, name: 'for line in handle:', what: py`Loops over a file one line at a time. Every line still ends with its line break, so <code>strip()</code> it before you compare or convert.`, files: { 'log.txt': RELAY_LOG }, code: py`with open("log.txt") as log:
    for line in log:
        print(line.strip().upper())` },
        { key: '.read', also: ['.readlines', '.readline'], name: 'handle.read()   ·   handle.readlines()', what: py`<code>read()</code> returns the whole file as one string. <code>readlines()</code> returns a list with one string per line, line breaks included.`, files: { 'log.txt': RELAY_LOG }, code: py`with open("log.txt") as log:
    text = log.read()
print(len(text), text.count("relay"))
with open("log.txt") as log:
    print(log.readlines())` },
        { key: 'FileNotFoundError', name: 'FileNotFoundError', what: py`Opening a file that does not exist stops the program with this error. Catch it when a missing file is something your program should cope with.`, code: py`try:
    with open("missing.txt") as handle:
        print(handle.read())
except FileNotFoundError:
    print("no such file")` },
      ],
      task: py`
<p>Every relay writes one event per line into its log:</p>
<pre><code>07:42 relay-7 ALERT voltage drop
07:43 relay-2 OK heartbeat</code></pre>
<p>Write <code>count_alerts(path)</code>. Open the file with that name and return how many of its lines contain the word <code>ALERT</code>, in capitals.</p>
<p>If there is no such file, return 0.</p>`,
      starter: py`def count_alerts(path):
    pass
`,
      tests: [
        { files: { 'relay.log': '07:42 relay-7 ALERT voltage drop\n07:43 relay-2 OK heartbeat\n07:45 relay-7 ALERT voltage drop\n' }, call: py`count_alerts("relay.log")`, expect: py`2`, show: py`count_alerts("relay.log")   three lines, two of them alerts` },
        { files: { 'quiet.log': '08:00 gate-1 OK heartbeat\n08:05 gate-1 OK heartbeat\n' }, call: py`count_alerts("quiet.log")`, expect: py`0`, show: py`count_alerts("quiet.log")   two lines, no alerts` },
        { files: { 'empty.log': '' }, call: py`count_alerts("empty.log")`, expect: py`0`, show: py`count_alerts("empty.log")   an empty file` },
        { call: py`count_alerts("nowhere.log")`, expect: py`0`, show: py`count_alerts("nowhere.log")   there is no such file` },
        { files: { 'odd.log': 'ALERT ALERT twice on one line\nall quiet, no alert here\n09:10 relay-3 ALERT\n' }, call: py`count_alerts("odd.log")`, expect: py`2`, show: py`count_alerts("odd.log")   lines are counted, not words` },
        { files: { 'tail.log': '10:00 relay-1 ALERT\n10:01 relay-1 ALERT' }, call: py`count_alerts("tail.log")`, expect: py`2`, show: py`count_alerts("tail.log")   the last line has no line break` },
      ],
      hints: [
        py`Go through the file one line at a time and keep a count. You already know how to ask whether one piece of text is inside another.`,
        py`Open the file in a <code>with</code> block and loop over it. For each line, add 1 to the count when <code>"ALERT" in line</code>.`,
        py`A missing file raises <code>FileNotFoundError</code> at the <code>open</code> call. Put the whole <code>with</code> block inside <code>try:</code> and return 0 in <code>except FileNotFoundError:</code>.`,
      ],
      solution: py`def count_alerts(path):
    alerts = 0
    try:
        with open(path) as log:
            for line in log:
                if "ALERT" in line:
                    alerts += 1
    except FileNotFoundError:
        return 0
    return alerts
`,
      explain: py`
<p>The <code>for</code> loop reads the file one line at a time, so even a very large log never has to fit in memory at once. Each line is tested with <code>in</code>, and a line counts once however many times the word appears in it.</p>
<p>The <code>try</code> wraps the <code>open</code>, because that is where a missing file shows itself. The <code>with</code> block closes the file on every way out.</p>
<p><b>Cost:</b> <code>O(n)</code> for a file of n characters: every line is read once.</p>`,
    },
    {
      id: 'z9-write-report',
      zone: 9,
      order: 3,
      kind: 'code',
      title: 'Write the Report',
      concept: 'Writing files: "w", "a" and line breaks',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>To write a file, open it with a second argument, the <b>mode</b>. <code>"w"</code> means write: the file is created if it is missing and <b>emptied</b> if it already exists.</p>
<pre><code>with open("status.txt", "w") as status:
    status.write("tower online\n")
    status.write("charge 80\n")

with open("status.txt") as status:
    print(status.read().splitlines())    # ['tower online', 'charge 80']</code></pre>
<p><code>write()</code> takes one string and adds nothing to it. A line ends only where you put a <code>\n</code>. It also takes text only, so numbers go through an f-string or <code>str()</code> first.</p>
<pre><code>readings = [("north", 40), ("south", 55)]
with open("loads.txt", "w") as loads:
    for name, load in readings:
        loads.write(f"{name}={load}\n")

with open("loads.txt") as loads:
    print(loads.readlines())             # ['north=40\n', 'south=55\n']</code></pre>
<p>Mode <code>"a"</code> means append: new text goes after what is already in the file, and nothing is erased. It is the mode for logs.</p>
<pre><code>with open("events.txt", "w") as events:
    events.write("start\n")
with open("events.txt", "a") as events:
    events.write("stop\n")
with open("events.txt") as events:
    print(events.read().split())         # ['start', 'stop']</code></pre>
<p><code>print()</code> can write to a file as well: <code>print("charge", 80, file=status)</code> converts the values and adds the line break for you.</p>`,
      tools: [
        { key: '.write', name: 'open(name, "w")   ·   handle.write(text)', what: py`<code>"w"</code> opens a file for writing: it is created if missing and <b>emptied</b> if it exists. <code>write()</code> writes one string and adds no line break, so put <code>\n</code> where a line ends.`, code: py`with open("out.txt", "w") as out:
    out.write("first\n")
    out.write("second\n")
with open("out.txt") as out:
    print(out.read().split())` },
        { key: null, name: 'open(name, "a")', what: py`<code>"a"</code> opens a file for appending: what you write is added after what is already there. Nothing is erased.`, code: py`with open("log.txt", "w") as log:
    log.write("one\n")
with open("log.txt", "a") as log:
    log.write("two\n")
with open("log.txt") as log:
    print(log.read().split())` },
        { key: null, name: 'print(..., file=handle)', what: py`<code>print</code> can write into a file instead of onto the screen. It converts the values and adds the line break for you.`, code: py`with open("out.txt", "w") as out:
    print("charge", 80, file=out)
with open("out.txt") as out:
    print(out.read() == "charge 80\n")` },
      ],
      task: py`
<p>At the end of a shift the readings are filed as a report.</p>
<p>Write <code>save_report(path, readings)</code>. <code>readings</code> is a list of pairs, a name and a whole number. Write the file <code>path</code> with one line per reading, in the form <code>name: number</code>, and then one last line with the sum of the numbers, <code>total: sum</code>. Return how many lines you wrote.</p>
<pre><code>save_report("report.txt", [("north", 40), ("south", 55)])    # returns 3</code></pre>
<p>After that call, <code>report.txt</code> holds exactly this, with a line break after every line:</p>
<pre><code>north: 40
south: 55
total: 95</code></pre>
<p>If the file already exists, its old contents are replaced.</p>`,
      starter: py`def save_report(path, readings):
    pass
`,
      tests: [
        { setup: py`lines = save_report("report.txt", [("north", 40), ("south", 55)])`, call: py`[lines, open("report.txt").read()]`, expect: py`[3, "north: 40\nsouth: 55\ntotal: 95\n"]`, show: py`save_report("report.txt", [("north", 40), ("south", 55)])` },
        { setup: py`lines = save_report("empty.txt", [])`, call: py`[lines, open("empty.txt").read()]`, expect: py`[1, "total: 0\n"]`, show: py`save_report("empty.txt", [])` },
        { files: { 'report.txt': 'old line\nanother old line\nmore\nand more\n' }, setup: py`lines = save_report("report.txt", [("core", 7)])`, call: py`[lines, open("report.txt").read()]`, expect: py`[2, "core: 7\ntotal: 7\n"]`, show: py`save_report("report.txt", [("core", 7)])   the file already held four old lines` },
        { setup: py`lines = save_report("signed.txt", [("gain", 12), ("loss", -20), ("drift", 0)])`, call: py`[lines, open("signed.txt").read().splitlines()]`, expect: py`[4, ["gain: 12", "loss: -20", "drift: 0", "total: -8"]]`, show: py`save_report("signed.txt", [("gain", 12), ("loss", -20), ("drift", 0)])` },
        { setup: py`save_report("ends.txt", [("a", 1), ("b", 2), ("c", 3)])`, call: py`open("ends.txt").read().count("\n")`, expect: py`4`, show: py`every line of the report ends with a line break` },
      ],
      hints: [
        py`Open the file for writing, write one line for each pair, and keep a running sum while you go. The last line needs that sum.`,
        py`Each pair unpacks into two names in the <code>for</code> line. <code>write()</code> wants one string, so build each line with an f-string, and end it with <code>\n</code> yourself.`,
        py`Inside <code>with open(path, "w") as report:</code> loop with <code>for name, value in readings:</code>, write <code>f"{name}: {value}\n"</code> and add the value to a total. After the loop write the total line. The number of lines is <code>len(readings) + 1</code>.`,
      ],
      solution: py`def save_report(path, readings):
    total = 0
    with open(path, "w") as report:
        for name, value in readings:
            report.write(f"{name}: {value}\n")
            total += value
        report.write(f"total: {total}\n")
    return len(readings) + 1
`,
      explain: py`
<p>Mode <code>"w"</code> empties the file first, so an old report can never leak into the new one. Each f-string builds one complete line, line break included, because <code>write</code> adds nothing of its own.</p>
<p>The total is collected in the same loop that writes the lines, so the readings are walked only once. The <code>with</code> block closes the file, which is also what makes sure everything really reaches it.</p>
<p><b>Cost:</b> <code>O(n)</code> for n readings.</p>`,
    },
    {
      id: 'z9-pattern-scan',
      zone: 9,
      order: 4,
      kind: 'code',
      title: 'Pattern Scan',
      concept: 'Regular expressions: describing text',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A <b>regular expression</b> is a pattern that describes what a piece of text looks like, so that Python can find every piece that fits. The <code>re</code> module runs them, and <code>re.findall()</code> returns a list of all the matches.</p>
<pre><code>import re

text = "Relay 7 logged 42 faults and 3 resets."
print(re.findall(r"\d+", text))           # ['7', '42', '3']</code></pre>
<p>The pattern <code>\d+</code> reads "a digit, one or more times". Patterns are built from a few pieces:</p>
<ul><li><code>\d</code> a digit, <code>\w</code> a letter, digit or underscore, <code>\s</code> a space, <code>.</code> any character.</li><li><code>[A-Z]</code> one character from a set, here a capital letter. <code>[aeiou]</code> is a vowel.</li><li><code>+</code> one or more of what stands before it, <code>*</code> zero or more, <code>?</code> zero or one, <code>{3}</code> exactly three.</li><li>Any other character stands for itself: <code>:</code> matches a colon.</li></ul>
<p>Write patterns as raw strings, with an <code>r</code> before the quote, so that Python leaves the backslashes alone.</p>
<pre><code>import re

print(re.findall(r"\d\d:\d\d", "open 07:45 to 19:30"))    # ['07:45', '19:30']
print(re.findall(r"[a-z]+\d", "bay7 dock12 gate9"))       # ['bay7', 'dock1', 'gate9']</code></pre>
<p><code>re.search()</code> looks for the first match only. It returns a match object, whose <code>group()</code> is the matched text, or <code>None</code> when the pattern fits nowhere.</p>
<pre><code>import re

found = re.search(r"[A-Z]\w+", "the Reactor is warm")
print(found.group())                      # Reactor
print(re.search(r"\d", "no digits"))      # None</code></pre>`,
      tools: [
        { key: 're.findall', name: 're.findall(pattern, text)', what: py`A list of every part of the text that fits the pattern, from left to right. No match gives an empty list.`, code: py`import re

print(re.findall(r"\d+", "bay 4, dock 12"))
print(re.findall(r"x", "no match"))` },
        { key: 're.search', also: ['.group'], name: 're.search(pattern, text)', what: py`Finds the first place where the pattern fits and returns a <b>match object</b>, or <code>None</code> when it fits nowhere. <code>match.group()</code> is the text that was matched.`, code: py`import re

found = re.search(r"\d+", "bay 4, dock 12")
print(found.group(), found.start())
print(re.search(r"\d+", "no digits"))` },
        { key: 'kw:is None', name: 'value is None   ·   value is not None', what: py`<code>None</code> means "nothing". Functions such as <code>re.search</code> return it when they find nothing. Test for it with <code>is</code> before you use the result.`, code: py`import re

found = re.search(r"\d", "abc")
print(found is None, found is not None)` },
        { key: null, name: '\\d   \\w   \\s   .', what: py`One character of a kind: <code>\d</code> a digit, <code>\w</code> a letter, digit or underscore, <code>\s</code> a space or line break, <code>.</code> any character except a line break.`, code: py`import re

print(re.findall(r"\w\d", "a1 b22 c"))
print(re.findall(r"a.c", "abc a-c ac"))` },
        { key: null, name: '[A-Z]   [abc]   [^abc]', what: py`One character from a set. A dash gives a range, and a <code>^</code> at the front means "anything except these".`, code: py`import re

print(re.findall(r"[A-Z][a-z]+", "Ada met Pip"))
print(re.findall(r"[^aeiou ]", "open air"))` },
        { key: null, name: '+   *   ?   {n}', what: py`How many times the piece before it may appear: <code>+</code> one or more, <code>*</code> zero or more, <code>?</code> zero or one, <code>{4}</code> exactly four, <code>{2,4}</code> two to four.`, code: py`import re

print(re.findall(r"\d{4}", "12345 678 9012"))
print(re.findall(r"colou?r", "color colour"))` },
        { key: null, name: 'r"..."', what: py`A raw string: the <code>r</code> tells Python to leave the backslashes alone, so the pattern reaches <code>re</code> exactly as you wrote it.`, code: py`print(len("\\d"), len(r"\d"))
print(r"\n" == "\\n")` },
      ],
      task: py`
<p>Part codes are scattered through the maintenance notes. A part code is two capital letters, a dash and four digits, such as <code>AB-1234</code>.</p>
<p>Write <code>find_codes(text)</code>. Return a list of every part code in the text, in the order they appear.</p>
<pre><code>find_codes("Swap AB-1234 for QX-0007 today.")    # ['AB-1234', 'QX-0007']
find_codes("nothing to order")                   # []</code></pre>
<p>Near misses are not codes: <code>ab-1234</code> has small letters, <code>AB-123</code> has three digits, and <code>AB 1234</code> has no dash.</p>`,
      starter: py`def find_codes(text):
    pass
`,
      tests: [
        { call: py`find_codes("Swap AB-1234 for QX-0007 today.")`, expect: py`["AB-1234", "QX-0007"]` },
        { call: py`find_codes("nothing to order")`, expect: py`[]` },
        { call: py`find_codes("ab-1234 AB-123 AB 1234 A-1234")`, expect: py`[]` },
        { call: py`find_codes("ZZ-9999")`, expect: py`["ZZ-9999"]` },
        { call: py`find_codes("(KL-0001), [KL-0002]; KL-0003!")`, expect: py`["KL-0001", "KL-0002", "KL-0003"]` },
        { call: py`find_codes("AB-1234 again AB-1234")`, expect: py`["AB-1234", "AB-1234"]` },
        { call: py`find_codes("")`, expect: py`[]` },
      ],
      hints: [
        py`You could walk the text and test seven characters at a time. A pattern says the same thing in one line. Which function returns every match as a list?`,
        py`Describe a code piece by piece: a capital letter, twice. Then a dash, which stands for itself. Then a digit, four times.`,
        py`<code>[A-Z]{2}</code> is two capital letters and <code>\d{4}</code> is four digits. Put a dash between them, write the pattern as a raw string, and return what <code>re.findall</code> gives you. Remember <code>import re</code>.`,
      ],
      solution: py`import re


def find_codes(text):
    return re.findall(r"[A-Z]{2}-\d{4}", text)
`,
      explain: py`
<p>The pattern is a description of one code: <code>[A-Z]{2}</code> for two capital letters, a dash that stands for itself, and <code>\d{4}</code> for four digits. <code>findall</code> slides it along the text and collects every place where it fits.</p>
<p>The near misses fail by themselves. Small letters are not in <code>[A-Z]</code>, three digits are one short of <code>{4}</code>, and a space is not a dash.</p>
<p><b>Cost:</b> <code>O(n)</code> for a text of n characters.</p>`,
    },
    {
      id: 'z9-field-extract',
      zone: 9,
      order: 5,
      kind: 'code',
      title: 'Field Extract',
      concept: 'Groups, fullmatch and sub',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Finding a piece of text is half the job. Usually you want the parts inside it. Put parentheses around a part of the pattern and it becomes a <b>group</b> that you can ask for by number.</p>
<pre><code>import re

found = re.search(r"(\d+)x(\d+)", "panel 40x25 cm")
print(found.group(), found.group(1), found.group(2))    # 40x25 40 25
print(found.groups())                                   # ('40', '25')</code></pre>
<p>Groups are text. Convert them with <code>int()</code> or <code>float()</code> when you need numbers. With groups in the pattern, <code>findall</code> returns the groups instead of the whole match.</p>
<pre><code>import re

print(re.findall(r"(\w+)=(\d+)", "x=1, y=22"))          # [('x', '1'), ('y', '22')]</code></pre>
<p>To <b>check</b> that a text has the right form, use <code>re.fullmatch()</code>. It succeeds only when the pattern covers the text from the first character to the last.</p>
<pre><code>import re

print(re.fullmatch(r"\d\d:\d\d", "07:45") is not None)          # True
print(re.fullmatch(r"\d\d:\d\d", "07:45 sharp") is not None)    # False</code></pre>
<p><code>re.sub()</code> replaces every match. In the replacement, <code>\1</code> stands for whatever group 1 matched.</p>
<pre><code>import re

print(re.sub(r"\s+", " ", "too    many   spaces"))      # too many spaces
print(re.sub(r"(\d+)-(\d+)", r"\2-\1", "10-20"))        # 20-10</code></pre>
<p>A dot or a question mark that should stand for itself needs a backslash: <code>\.</code> is a real dot.</p>`,
      tools: [
        { key: '.groups', name: '( ... )   ·   match.group(1)   ·   match.groups()', what: py`Parentheses mark the parts you want to pull out. <code>group(1)</code> is the first marked part and <code>groups()</code> gives all of them as a tuple. They are always text.`, code: py`import re

found = re.search(r"(\w+)@(\w+)", "write to ada@tower now")
print(found.group(1), found.group(2))
print(found.groups())` },
        { key: 're.fullmatch', also: ['re.match'], name: 're.fullmatch(pattern, text)', what: py`A match object only if the <b>whole</b> text fits the pattern, otherwise <code>None</code>. It is the tool for checking that something has the right form.`, code: py`import re

print(re.fullmatch(r"[A-Z]\d\d", "B42") is not None)
print(re.fullmatch(r"[A-Z]\d\d", "B421") is not None)` },
        { key: 're.sub', name: 're.sub(pattern, replacement, text)', what: py`A copy of the text with every match replaced. In the replacement, <code>\1</code> stands for what group 1 matched.`, code: py`import re

print(re.sub(r"\d", "#", "pin 4071"))
print(re.sub(r"(\w+) (\w+)", r"\2 \1", "hello world"))` },
        { key: 're.split', name: 're.split(pattern, text)', what: py`Splits wherever the pattern matches, so one call copes with several kinds of separator.`, code: py`import re

print(re.split(r"[,;]\s*", "a, b;c,  d"))` },
        { key: null, name: '\\.   \\?   \\(', what: py`A backslash makes a special character ordinary: <code>\.</code> matches a real dot, where a bare <code>.</code> matches any character.`, code: py`import re

print(re.findall(r"\d+\.\d+", "3.14 and 2x71"))
print(re.findall(r"\d+.\d+", "3.14 and 2x71"))` },
      ],
      task: py`
<p>Every sensor reports on one line, in a fixed form:</p>
<pre><code>TEMP-7: 21.5 C</code></pre>
<p>That is a sensor name in capital letters, a dash, the sensor number, a colon and a space, a value (digits, optionally followed by a dot and more digits), a space, and a unit of one capital letter.</p>
<p>Write <code>parse_reading(line)</code>. Return the four parts as a tuple <code>(name, number, value, unit)</code>, with the number as an <code>int</code> and the value as a <code>float</code>. Return <code>None</code> for a line that does not have exactly this form.</p>
<pre><code>parse_reading("TEMP-7: 21.5 C")     # ('TEMP', 7, 21.5, 'C')
parse_reading("PRES-12: 101 P")     # ('PRES', 12, 101.0, 'P')
parse_reading("temp-7: 21.5 C")     # None</code></pre>`,
      starter: py`def parse_reading(line):
    pass
`,
      tests: [
        { call: py`parse_reading("TEMP-7: 21.5 C")`, expect: py`("TEMP", 7, 21.5, "C")` },
        { call: py`parse_reading("PRES-12: 101 P")`, expect: py`("PRES", 12, 101.0, "P")` },
        { call: py`parse_reading("temp-7: 21.5 C")`, expect: py`None` },
        { call: py`parse_reading("TEMP-7: hot C")`, expect: py`None` },
        { call: py`parse_reading("TEMP-7: 21.5 C and rising")`, expect: py`None` },
        { call: py`parse_reading("note: TEMP-7: 21.5 C")`, expect: py`None` },
        { call: py`parse_reading("FLOW-300: 0.25 L")`, expect: py`("FLOW", 300, 0.25, "L")` },
        { call: py`parse_reading("")`, expect: py`None` },
        { call: py`[type(part).__name__ for part in parse_reading("VOLT-2: 48 V")]`, expect: py`["str", "int", "float", "str"]`, show: py`parse_reading("VOLT-2: 48 V") gives a str, an int, a float and a str` },
      ],
      hints: [
        py`One pattern can describe the whole line and mark the four parts you need at the same time. Which function refuses a line with something extra before or after?`,
        py`Put a group around each part: the name, the number, the value and the unit. The dash, the colon and the spaces stand for themselves between the groups. The value is digits, then perhaps a dot, then perhaps more digits.`,
        py`Try <code>re.fullmatch(r"([A-Z]+)-(\d+): (\d+\.?\d*) ([A-Z])", line)</code>. If the result is <code>None</code>, return <code>None</code>. Otherwise unpack <code>found.groups()</code> into four names and return them with <code>int()</code> and <code>float()</code> applied to the two numbers.`,
      ],
      solution: py`import re


def parse_reading(line):
    found = re.fullmatch(r"([A-Z]+)-(\d+): (\d+\.?\d*) ([A-Z])", line)
    if found is None:
        return None
    name, number, value, unit = found.groups()
    return name, int(number), float(value), unit
`,
      explain: py`
<p>The pattern reads like the description of the line, with a group around each of the four parts. <code>fullmatch</code> insists that the pattern covers the whole line, so a remark before or after makes it fail, where <code>search</code> would have accepted it.</p>
<p>The value is <code>\d+\.?\d*</code>: digits, an optional real dot, and optional further digits. Groups always come back as text, so the two numbers are converted on the way out.</p>
<p><b>Cost:</b> <code>O(n)</code> for a line of n characters.</p>`,
    },
    {
      id: 'z9-incident-report',
      zone: 9,
      order: 6,
      kind: 'code',
      title: 'Incident Report',
      concept: 'Files, patterns and counting, together',
      difficulty: 'Medium',
      boss: true,
      lesson: py`
<p>Real scripts chain the tools you have: read a file, pick each line apart, count in a dictionary, write a result. This briefing adds the two small things that the chain still needs.</p>
<p><b>Sorting by two things.</b> A <code>key</code> function may return a tuple. Tuples compare item by item, so the second item decides between equal first items. A minus sign turns "smallest first" into "largest first" for a number.</p>
<pre><code>stock = {"gear": 4, "bolt": 9, "nut": 4}
ranked = sorted(stock.items(), key=lambda pair: (-pair[1], pair[0]))
print(ranked)        # [('bolt', 9), ('gear', 4), ('nut', 4)]</code></pre>
<p><b>A pattern for a whole line.</b> Keep it under a name in capitals at the top of the file, and check each line with <code>fullmatch</code> after stripping its line break. A line that does not fit gives <code>None</code> and can be skipped.</p>
<pre><code>import re

ENTRY = r"(\w+) x(\d+)"
total = 0
for line in ["gear x4\n", "broken line\n", "bolt x9\n"]:
    found = re.fullmatch(ENTRY, line.strip())
    if found:
        total += int(found.group(2))
print(total)         # 13</code></pre>
<p>Square brackets are special in a pattern, so a real bracket is written <code>\[</code> and <code>\]</code>. <code>\S+</code> means "one or more characters that are not spaces", which is handy for a field you do not care about.</p>
<pre><code>import re

print(re.findall(r"\[(\w+)\]", "[north] ok [south] down"))    # ['north', 'south']</code></pre>`,
      tools: [
        { key: null, name: 'key=lambda pair: (-pair[1], pair[0])', what: py`A sort key may be a tuple: the first item decides, and the second settles ties. A minus sign in front of a number reverses its order.`, code: py`scores = [("pip", 7), ("ada", 9), ("max", 7)]
print(sorted(scores, key=lambda pair: (-pair[1], pair[0])))` },
        { key: null, name: '\\[   \\]   \\S+', what: py`<code>\[</code> and <code>\]</code> match real square brackets. <code>\S</code> is any character that is not a space, the opposite of <code>\s</code>.`, code: py`import re

print(re.findall(r"\[(\S+)\]", "[relay-7] up, [gate 1] down"))` },
        { key: null, name: 'read, pick apart, count, write', what: py`The shape of most scripts: loop over the lines of a file, keep the ones that fit a pattern, collect what you need in a dictionary, and write the result out.`, code: py`import re

counts = {}
for line in ["gear x4", "bolt x9", "gear x1"]:
    found = re.fullmatch(r"(\w+) x(\d+)", line)
    counts[found.group(1)] = counts.get(found.group(1), 0) + int(found.group(2))
print(counts)` },
      ],
      task: py`
<p>The tower's event log has one event per line:</p>
<pre><code>2099-03-14 07:42 [relay-7] ERROR voltage drop</code></pre>
<p>That is a date, a time, the source in square brackets, a level in capital letters, and a message. Some lines are damaged and do not have this form. Ignore them.</p>
<p>Write <code>incident_report(log_path, report_path)</code>. Count the lines whose level is <code>ERROR</code> for each source, and write the report file: one line per source that had errors, in the form <code>relay-7: 2</code>, the source with the most errors first. Sources with the same count go in alphabetical order. Return the total number of error lines.</p>
<p>A source without errors does not appear in the report. If there are no errors at all, the report file is still created, empty.</p>`,
      starter: py`def incident_report(log_path, report_path):
    pass
`,
      tests: [
        { files: { 'tower.log': '2099-03-14 07:42 [relay-7] ERROR voltage drop\n2099-03-14 07:43 [relay-2] INFO heartbeat\n2099-03-14 07:45 [relay-7] ERROR voltage drop\n2099-03-14 07:51 [gate-1] WARN slow response\n2099-03-14 07:58 [gate-1] ERROR door jammed\n' },
          setup: py`total = incident_report("tower.log", "report.txt")`, call: py`[total, open("report.txt").read()]`, expect: py`[3, "relay-7: 2\ngate-1: 1\n"]`, show: py`incident_report("tower.log", "report.txt")   five events, three of them errors` },
        { files: { 'calm.log': '2099-03-15 09:00 [relay-2] INFO heartbeat\n2099-03-15 09:05 [gate-1] WARN slow response\n' },
          setup: py`total = incident_report("calm.log", "calm.txt")`, call: py`[total, open("calm.txt").read()]`, expect: py`[0, ""]`, show: py`incident_report("calm.log", "calm.txt")   no errors: an empty report` },
        { files: { 'damaged.log': 'garbage line\n2099-03-14 [relay-7] ERROR missing time\n2099-03-14 08:00 relay-7 ERROR no brackets\n2099-03-14 08:01 [relay-7] ERROR real one\n\n2099-03-14 08:02 [relay-9] error level in small letters\n' },
          setup: py`total = incident_report("damaged.log", "out.txt")`, call: py`[total, open("out.txt").read()]`, expect: py`[1, "relay-7: 1\n"]`, show: py`incident_report("damaged.log", "out.txt")   damaged lines are ignored` },
        { files: { 'ties.log': '2099-03-16 10:00 [b-2] ERROR one\n2099-03-16 10:01 [c-3] ERROR one\n2099-03-16 10:02 [a-1] ERROR one\n2099-03-16 10:03 [c-3] ERROR two\n' },
          setup: py`total = incident_report("ties.log", "ties.txt")`, call: py`[total, open("ties.txt").read()]`, expect: py`[4, "c-3: 2\na-1: 1\nb-2: 1\n"]`, show: py`incident_report("ties.log", "ties.txt")   equal counts go in alphabetical order` },
        { files: { 'empty.log': '' }, setup: py`total = incident_report("empty.log", "empty.txt")`, call: py`[total, open("empty.txt").read()]`, expect: py`[0, ""]`, show: py`incident_report("empty.log", "empty.txt")   an empty log` },
        { files: { 'tricky.log': '2099-03-17 11:00 [gate-1] INFO no ERROR found\n2099-03-17 11:01 [gate-2] ERROR sensor says INFO\n' },
          setup: py`total = incident_report("tricky.log", "tricky.txt")`, call: py`[total, open("tricky.txt").read()]`, expect: py`[1, "gate-2: 1\n"]`, show: py`incident_report("tricky.log", "tricky.txt")   the level counts, not the message` },
        { files: { 'tower.log': '2099-03-18 12:00 [core] ERROR overheating\n', 'report.txt': 'stale: 99\nold: 1\n' },
          setup: py`total = incident_report("tower.log", "report.txt")`, call: py`[total, open("report.txt").read()]`, expect: py`[1, "core: 1\n"]`, show: py`incident_report("tower.log", "report.txt")   an old report is replaced` },
      ],
      hints: [
        py`Three stages: read the log and count errors per source in a dictionary, put the sources in the required order, write one line for each. Get the counting right before you think about the order.`,
        py`One pattern for the whole line, with a group around the source and a group around the level, tells you both things and rejects damaged lines. Count a line only when it fits and its level group is exactly <code>"ERROR"</code>.`,
        py`A pattern such as <code>r"\S+ \d\d:\d\d \[([\w-]+)\] (\w+) .*"</code> fits a good line after <code>strip()</code>. Order the counts with <code>sorted(errors.items(), key=lambda pair: (-pair[1], pair[0]))</code>, write <code>f"{source}: {count}\n"</code> for each pair, and return <code>sum(errors.values())</code>.`,
      ],
      solution: py`import re

LINE = r"\S+ \d\d:\d\d \[([\w-]+)\] (\w+) .*"


def incident_report(log_path, report_path):
    errors = {}
    with open(log_path) as log:
        for line in log:
            found = re.fullmatch(LINE, line.strip())
            if found and found.group(2) == "ERROR":
                source = found.group(1)
                errors[source] = errors.get(source, 0) + 1
    ranked = sorted(errors.items(), key=lambda pair: (-pair[1], pair[0]))
    with open(report_path, "w") as report:
        for source, count in ranked:
            report.write(f"{source}: {count}\n")
    return sum(errors.values())
`,
      explain: py`
<p>The pattern does two jobs. It rejects every damaged line, because <code>fullmatch</code> gives <code>None</code> for them, and it hands over the source and the level as groups. Comparing the level group with <code>"ERROR"</code> is what keeps a message that merely mentions the word from being counted.</p>
<p>The sort key is a tuple: the count with a minus sign, so that larger counts come first, and then the name, which puts equal counts in alphabetical order. Opening the report with <code>"w"</code> creates it even when there is nothing to write.</p>
<p><b>Cost:</b> <code>O(n)</code> to read a log of n characters, plus <code>O(k log k)</code> to sort k sources.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
