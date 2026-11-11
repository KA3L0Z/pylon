/* Pylon levels, zone 2: Logic Gardens (values, text, decisions, loops).
   Format and field notes: tools/level-example.js.
   Validate with: python tools/check_levels.py 2 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z2-status-report',
      zone: 2,
      order: 1,
      kind: 'code',
      title: 'Status Report',
      concept: 'Values, variables and print',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>On the Boot Deck every line you wrote was a command for PIP. Programs also work with <b>values</b>. A value can be a number, such as <code>80</code>, or a piece of text in quotes, such as <code>"PIP"</code>. Text values are called <b>strings</b>.</p>
<p>A <b>variable</b> is a name that holds a value. You create one with <code>=</code>, name on the left and value on the right. To show a value on the console, put it in the parentheses of <code>print</code>. Give <code>print</code> several values separated by commas and it shows them on one line with a space between them.</p>
<pre><code>drone = "PIP"
battery = 80
print(drone)                     # PIP
print(drone, "has", battery)     # PIP has 80</code></pre>
<p><code>+</code> joins two strings end to end and adds no space. It cannot join a string to a number, so turn the number into a string with <code>str()</code> first.</p>
<pre><code>print(drone + "-" + str(battery))    # PIP-80</code></pre>
<p>The comment after each <code>#</code> shows what that line prints.</p>`,
      task: py`
<p>The console on this floor has been dark for years. Wake it with a status report.</p>
<p>The editor starts with three variables. Add code below them so that your program prints exactly these three lines:</p>
<pre><code>Pylon online
Floor: 2
Charge: 35%</code></pre>
<p>Build each line from the variables instead of typing their values again. In the last line there is no space between the number and the percent sign.</p>`,
      starter: py`tower = "Pylon"
floor = 2
charge = 35

# Print the three status lines. Build them from the variables above.
`,
      tests: [
        { stdout: 'Pylon online\nFloor: 2\nCharge: 35%\n' },
      ],
      hints: [
        py`Each line of the report is one <code>print</code> call. Look at where the spaces are: a comma inside <code>print</code> adds a space, and <code>+</code> does not.`,
        py`The first two lines each need two values separated by a comma: a variable and a piece of text in quotes. In the first line the variable comes first. The third line has no space before the percent sign, so build it with <code>+</code>.`,
        py`The third line is <code>"Charge: " + str(charge) + "%"</code> inside a <code>print</code>. Without <code>str()</code> Python stops with an error, because <code>+</code> cannot add text to a number.`,
      ],
      solution: py`tower = "Pylon"
floor = 2
charge = 35

print(tower, "online")                   # a comma adds one space
print("Floor:", floor)
print("Charge: " + str(charge) + "%")    # + adds no space
`,
      explain: py`
<p>Each line of the report is one <code>print</code> call, and the calls run in the order you wrote them. With commas, <code>print</code> turns every value into text and puts one space between them. That is the spacing the first two lines need.</p>
<p>The third line has no space before the percent sign, so it is joined with <code>+</code>. <code>+</code> only joins strings, and <code>charge</code> holds a number, so <code>str(charge)</code> turns 35 into <code>"35"</code> first.</p>
<p>Because every line is built from a variable, the report follows the data. Change <code>charge = 35</code> to another number and the last line changes with it, with no edit to the <code>print</code> calls.</p>`,
    },
    {
      id: 'z2-shelf-slots',
      zone: 2,
      order: 2,
      kind: 'code',
      title: 'Crate the Cells',
      concept: 'Parameters, return and arithmetic',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>The functions you wrote on the Boot Deck took no input and gave nothing back. A function can do both. The names in the parentheses of the <code>def</code> line are <b>parameters</b>: each call fills them, in order, with the values it passes. <code>return</code> sends a result back to the caller and ends the function. The caller can print the result, store it, or use it in more arithmetic.</p>
<pre><code>def area(width, height):
    return width * height

print(area(3, 4))        # 12
big = area(5, 2) + 1     # the call is replaced by its result, 10
print(big)               # 11</code></pre>
<p>Python does arithmetic with these operators:</p>
<pre><code>print(7 + 2, 7 - 2, 7 * 2)   # 9 5 14
print(2 ** 3)                # 8, two to the power of three
print(7 / 2)                 # 3.5
print(8 / 2)                 # 4.0, / always gives a decimal number
print(7 // 2)                # 3, whole division: the fraction is dropped
print(7 % 2)                 # 1, the remainder</code></pre>
<p><code>//</code> and <code>%</code> belong together. Share 7 cells between 2 relays: each relay gets <code>7 // 2</code> cells, which is 3, and <code>7 % 2</code> is left over, which is 1.</p>`,
      task: py`
<p>Power cells go into storage. They are packed into crates that hold <code>size</code> cells each. Every full crate takes one shelf slot. Every cell left over takes one slot of its own.</p>
<p>Write <code>shelf_slots(cells, size)</code>. Both arguments are whole numbers: <code>cells</code> is 0 or more and <code>size</code> is at least 1. Return the number of shelf slots needed, as a whole number.</p>
<pre><code>shelf_slots(20, 6)   # 5, three full crates and two loose cells
shelf_slots(12, 4)   # 3, three full crates and nothing left over</code></pre>
<p>In the editor, <code>pass</code> is a placeholder that does nothing. Replace it with your code. The tests call your function and check the value it returns.</p>`,
      starter: py`def shelf_slots(cells, size):
    # Count the full crates, count the loose cells, add the two.
    pass
`,
      tests: [
        { call: py`shelf_slots(20, 6)`, expect: py`5` },
        { call: py`shelf_slots(12, 4)`, expect: py`3` },
        { call: py`shelf_slots(7, 8)`, expect: py`7` },
        { call: py`shelf_slots(0, 5)`, expect: py`0` },
        { call: py`shelf_slots(9, 1)`, expect: py`9` },
        { call: py`shelf_slots(25, 7)`, expect: py`7` },
        { call: py`shelf_slots(100, 9)`, expect: py`12` },
      ],
      hints: [
        py`The task asks two questions: how many crates can you fill completely, and how many cells are left after that. Each question has its own operator.`,
        py`<code>cells // size</code> counts the full crates. <code>cells % size</code> counts the cells left over. The answer is the two added together.`,
        py`The body can be one line: <code>return</code> followed by the <code>//</code> result plus the <code>%</code> result. If a test reports a number like 5.33, you used <code>/</code> where <code>//</code> belongs. If it reports <code>None</code>, Python's word for "no value", the function has no <code>return</code>.`,
      ],
      solution: py`def shelf_slots(cells, size):
    full_crates = cells // size    # whole division: crates filled completely
    loose_cells = cells % size     # remainder: cells that did not fill a crate
    return full_crates + loose_cells
`,
      explain: py`
<p>Whole division and remainder split the cells into two groups. <code>cells // size</code> is the number of crates you can fill completely, and <code>cells % size</code> is what remains after filling them. Every crate and every loose cell needs one slot, so the answer is the sum.</p>
<p>Plain <code>/</code> gives the wrong kind of answer here. <code>20 / 6</code> is about 3.33, and a shelf cannot hold a third of a crate.</p>
<p>The function does two divisions and one addition. That is the same small amount of work for 20 cells or 20 million.</p>`,
    },
    {
      id: 'z2-name-plates',
      zone: 2,
      order: 3,
      kind: 'code',
      title: 'Name Plates',
      concept: 'Strings: indexing, len, methods, f-strings',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A string is a row of characters, and every character has a numbered position called its <b>index</b>. Indexes start at 0. <code>len()</code> gives the number of characters, so the last index is the length minus 1.</p>
<pre><code>word = "beacon"
print(word[0])               # b
print(len(word))             # 6
print(word[len(word) - 1])   # n, the last character</code></pre>
<p>Strings have <b>methods</b>: functions you call with a dot after the value. <code>strip()</code> removes the spaces at both ends, and <code>upper()</code> and <code>lower()</code> change the case. Each one returns a new string and leaves the original as it was.</p>
<p>An <b>f-string</b> builds text from values. Put <code>f</code> before the opening quote, and Python replaces each <code>{...}</code> with the value of the expression inside it.</p>
<pre><code>raw = "  Relay "
clean = raw.strip()          # "Relay"
print(clean.upper())         # RELAY
print(raw.strip().lower())   # relay, calls can be chained
floor = 2
print(f"{clean} is on floor {floor + 1}")    # Relay is on floor 3</code></pre>`,
      task: py`
<p>The name plates on the relays are too small for long names, so each relay gets a short tag: its first character, then the number of characters between the first and the last, then its last character. The name <code>transmitter</code> becomes <code>T9R</code>.</p>
<p>Write <code>short_tag(name)</code>. The name may arrive with spaces before or after it, and in any mix of upper and lower case. Remove those outer spaces first, and return the tag as a string in upper case.</p>
<pre><code>short_tag("transmitter")   # "T9R"
short_tag("  Beacon ")     # "B4N"</code></pre>
<p>Once the outer spaces are gone, the name always has at least two characters.</p>`,
      starter: py`def short_tag(name):
    # Clean the name first, then build the tag with an f-string.
    pass
`,
      tests: [
        { call: py`short_tag("transmitter")`, expect: py`"T9R"` },
        { call: py`short_tag("  Beacon ")`, expect: py`"B4N"` },
        { call: py`short_tag("pip")`, expect: py`"P1P"` },
        { call: py`short_tag("PYLON")`, expect: py`"P3N"` },
        { call: py`short_tag("up")`, expect: py`"U0P"` },
        { call: py`short_tag(" Communications  ")`, expect: py`"C12S"` },
        { call: py`short_tag("eCHo")`, expect: py`"E2O"` },
      ],
      hints: [
        py`Clean the name before anything else and keep the result in a variable. With the spaces still attached, index 0 is a space and the length is too large.`,
        py`You need three pieces of the clean name: the character at index 0, the count <code>len(clean) - 2</code>, and the character at index <code>len(clean) - 1</code>.`,
        py`Start with <code>clean = name.strip().upper()</code>. Then return an f-string made of three <code>{...}</code> parts with nothing between them: first character, count, last character.`,
      ],
      solution: py`def short_tag(name):
    clean = name.strip().upper()     # outer spaces removed, upper case
    first = clean[0]
    last = clean[len(clean) - 1]     # the last index is the length minus 1
    between = len(clean) - 2         # every character except first and last
    return f"{first}{between}{last}"
`,
      explain: py`
<p>Cleaning comes first because every later step depends on it. <code>strip()</code> and <code>upper()</code> each return a new string, so the two calls chain into one line.</p>
<p>The first character is at index 0. The last is at index <code>len(clean) - 1</code>, because indexes start at 0. Everything else lies between those two, which makes the count <code>len(clean) - 2</code>. For a two-character name the count is 0, and the tag still comes out right.</p>
<p>The f-string turns the count into text and joins the three pieces with nothing between them. The cost is small: a couple of passes over the name to clean it, then three quick lookups.</p>`,
    },
    {
      id: 'z2-relay-modes',
      zone: 2,
      order: 4,
      kind: 'code',
      title: 'Relay Modes',
      concept: 'Comparisons, and/or/not, if/elif/else',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>On the Boot Deck your conditions were function calls. A <b>comparison</b> works as a condition too. It produces one of two values, <code>True</code> or <code>False</code>.</p>
<pre><code>charge = 40
print(charge == 40)                   # True, equal (two equals signs)
print(charge != 40)                   # False, not equal
print(charge &lt; 50, charge &gt;= 50)      # True False
print(charge &gt; 10 and charge &lt; 50)    # True
print(charge &lt; 10 or charge &gt; 90)     # False
print(not charge &lt; 10)                # True</code></pre>
<p>The comparison operators are <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code> and <code>&gt;=</code>. <code>and</code> needs both sides to be true, <code>or</code> needs at least one, and <code>not</code> flips a result.</p>
<p>In an <code>if</code> / <code>elif</code> / <code>else</code> chain, Python tests the conditions from the top and runs only the first branch that is true. A <code>return</code> in a branch ends the function with that value.</p>
<pre><code>def lift(weight, doors_closed):
    if weight &gt; 500 or not doors_closed:
        return "hold"
    elif weight == 0:
        return "idle"
    else:
        return "go"

print(lift(120, True))     # go
print(lift(120, False))    # hold</code></pre>`,
      task: py`
<p>Every relay in the Logic Gardens reports two whole numbers: its <code>charge</code>, from 0 to 100, and its <code>heat</code>. Write <code>relay_mode(charge, heat)</code>. Go through these rules in order and return the string of the first rule that fits:</p>
<ol>
<li><code>"off"</code> when <code>charge</code> is 0 or <code>heat</code> is above 90</li>
<li><code>"boost"</code> when <code>charge</code> is at least 60 and <code>heat</code> is below 50</li>
<li><code>"saver"</code> when <code>charge</code> is below 20</li>
<li><code>"steady"</code> in every other case</li>
</ol>
<pre><code>relay_mode(75, 30)   # "boost"
relay_mode(5, 95)    # "off", rule 1 comes before rule 3</code></pre>`,
      starter: py`def relay_mode(charge, heat):
    # One if / elif / else chain, with the rules in the order given.
    pass
`,
      tests: [
        { call: py`relay_mode(75, 30)`, expect: py`"boost"` },
        { call: py`relay_mode(5, 95)`, expect: py`"off"` },
        { call: py`relay_mode(0, 20)`, expect: py`"off"` },
        { call: py`relay_mode(10, 40)`, expect: py`"saver"` },
        { call: py`relay_mode(40, 70)`, expect: py`"steady"` },
        { call: py`relay_mode(60, 49)`, expect: py`"boost"` },
        { call: py`relay_mode(60, 50)`, expect: py`"steady"` },
        { call: py`relay_mode(20, 90)`, expect: py`"steady"` },
      ],
      hints: [
        py`Each rule becomes one branch of a single chain. Keep the branches in the order of the list, because the first true branch wins.`,
        py`Rule 1 joins two comparisons with <code>or</code>, and rule 2 joins two with <code>and</code>. "At least 60" is <code>&gt;= 60</code>. "Above 90" is <code>&gt; 90</code>. "Below 50" is <code>&lt; 50</code>.`,
        py`Open with <code>if charge == 0 or heat &gt; 90:</code> and return <code>"off"</code>. Add an <code>elif</code> for rule 2, an <code>elif</code> for rule 3, and an <code>else</code> that returns <code>"steady"</code>.`,
      ],
      solution: py`def relay_mode(charge, heat):
    if charge == 0 or heat > 90:        # rule 1: one problem is enough
        return "off"
    elif charge >= 60 and heat < 50:    # rule 2: both conditions are needed
        return "boost"
    elif charge < 20:                   # rule 3
        return "saver"
    else:                               # rule 4: everything else
        return "steady"
`,
      explain: py`
<p>The chain follows the rule list line by line. Python runs the first branch whose condition is true and skips the rest, so a relay with charge 5 and heat 95 is <code>"off"</code> and never reaches the <code>"saver"</code> test.</p>
<p>Rule 1 uses <code>or</code> because one problem is enough to switch a relay off. Rule 2 uses <code>and</code> because boost needs a good charge and a cool relay together.</p>
<p>The exact operator matters at the edges. "At least 60" includes 60, so it is <code>&gt;=</code>. "Below 50" leaves 50 out, so it is <code>&lt;</code>.</p>
<p>The cost is tiny: at most five comparisons, whatever the numbers are.</p>`,
    },
    {
      id: 'z2-fizz-buzz',
      zone: 2,
      order: 5,
      kind: 'code',
      title: 'Test Pattern',
      concept: 'Looping with range, building a list',
      classic: 'Fizz Buzz (LeetCode #412)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>On the Boot Deck, <code>for i in range(n)</code> repeated a block <code>n</code> times. The loop variable <code>i</code> is a value you can use: it counts 0, 1, 2 and so on, and stops before <code>n</code>. Give <code>range</code> two numbers and it starts at the first and stops before the second.</p>
<pre><code>for i in range(1, 4):
    print(i * 10)        # 10, then 20, then 30</code></pre>
<p>A <b>list</b> holds values in order. You write one with square brackets, such as <code>[3, 5, 8]</code> or <code>["on", "off"]</code>. To build a list step by step, start with the empty list <code>[]</code> and call <code>append</code>, which adds one value at the end.</p>
<pre><code>evens = []
for i in range(1, 9):
    if i % 2 == 0:       # remainder 0 means i is a multiple of 2
        evens.append(i)
print(evens)             # [2, 4, 6, 8]</code></pre>
<p>That loop visits 1 to 8. The 9 is left out, as the stop value always is.</p>`,
      task: py`
<p>The relay line needs a test pattern. Write <code>fizz_buzz(n)</code>. Return a list with one string for each number from 1 to <code>n</code>, in order. For each number, use the first rule that fits:</p>
<ol>
<li>a multiple of both 3 and 5 gives <code>"FizzBuzz"</code></li>
<li>a multiple of 3 gives <code>"Fizz"</code></li>
<li>a multiple of 5 gives <code>"Buzz"</code></li>
<li>any other number gives the number itself as a string, such as <code>"7"</code></li>
</ol>
<pre><code>fizz_buzz(3)   # ["1", "2", "Fizz"]
fizz_buzz(5)   # ["1", "2", "Fizz", "4", "Buzz"]</code></pre>
<p><code>n</code> is at least 1.</p>`,
      starter: py`def fizz_buzz(n):
    # Loop from 1 to n and append one string for each number.
    pass
`,
      tests: [
        { call: py`fizz_buzz(3)`, expect: py`["1", "2", "Fizz"]` },
        { call: py`fizz_buzz(5)`, expect: py`["1", "2", "Fizz", "4", "Buzz"]` },
        { call: py`fizz_buzz(1)`, expect: py`["1"]` },
        {
          call: py`fizz_buzz(15)`,
          expect: py`["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]`,
        },
        {
          call: py`fizz_buzz(30)[25:]`,
          expect: py`["26", "Fizz", "28", "29", "FizzBuzz"]`,
          show: py`the last 5 items of fizz_buzz(30)`,
        },
        {
          call: py`fizz_buzz(100)[98:]`,
          expect: py`["Fizz", "Buzz"]`,
          show: py`the last 2 items of fizz_buzz(100)`,
        },
      ],
      hints: [
        py`Build the list the way the lesson builds <code>evens</code>: start with an empty list, loop over the numbers, and append one string on every pass. The loop has to reach <code>n</code> itself.`,
        py`Loop with <code>range(1, n + 1)</code>. A number is a multiple of 3 when <code>i % 3 == 0</code>. Test the "both" rule first. If you test 3 first, 15 becomes <code>"Fizz"</code> and never reaches <code>"FizzBuzz"</code>.`,
        py`Inside the loop, write an <code>if</code> for <code>i % 3 == 0 and i % 5 == 0</code>, then an <code>elif</code> for 3, an <code>elif</code> for 5, and an <code>else</code> that appends <code>str(i)</code>. Return the list after the loop has finished.`,
      ],
      solution: py`def fizz_buzz(n):
    result = []
    for i in range(1, n + 1):            # 1 up to n, with n included
        if i % 3 == 0 and i % 5 == 0:    # the "both" rule goes first
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))        # plain numbers go in as strings
    return result
`,
      explain: py`
<p><code>range(1, n + 1)</code> produces every number from 1 to <code>n</code>. The <code>+ 1</code> is needed because <code>range</code> stops before its second argument. Each pass appends exactly one string, so the list ends up with <code>n</code> items in the right order.</p>
<p>The order of the tests carries the solution. A multiple of 15 is also a multiple of 3, so the "both" rule has to come first or it can never win. The last branch uses <code>str(i)</code> because the list must hold strings only.</p>
<p>The function does a small, fixed amount of work for each number. Counting to 200 takes twice as long as counting to 100.</p>`,
    },
    {
      id: 'z2-running-sum',
      zone: 2,
      order: 6,
      kind: 'code',
      title: 'Running Charge',
      concept: 'Lists: indexing, len, running totals',
      classic: 'Running Sum of 1d Array (LeetCode #1480)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>You can read any item of a list by its index, the same way you read a character of a string. Indexes start at 0 and <code>len()</code> counts the items. A list also lets you replace an item, which a string does not.</p>
<pre><code>charges = [40, 60, 100]
print(charges[0])        # 40
print(len(charges))      # 3
charges[1] = 70          # replace the item at index 1
print(charges)           # [40, 70, 100]</code></pre>
<p>A <code>for</code> loop can walk over a list directly. The loop variable takes each item in turn, so you need no index.</p>
<pre><code>total = 0
for c in charges:
    total += c                  # short for total = total + c
print(total)                    # 210
print(total / len(charges))     # 70.0, the average</code></pre>
<p><code>total</code> is a <b>running total</b>. It starts at 0 and grows on every pass. After the loop it holds the sum of the whole list. During the loop it holds the sum of the items visited so far.</p>`,
      task: py`
<p>Each relay adds its charge to the line, and the meter shows the total so far. Write <code>running_sum(nums)</code>. Return a list of the same length as <code>nums</code>. The item at index <code>i</code> is the sum of <code>nums[0]</code> up to and including <code>nums[i]</code>.</p>
<pre><code>running_sum([1, 2, 3, 4])        # [1, 3, 6, 10]
running_sum([3, 1, 2, 10, 1])    # [3, 4, 6, 16, 17]</code></pre>
<p><code>nums</code> holds at least one number, and the numbers can be negative.</p>`,
      starter: py`def running_sum(nums):
    # Keep a running total and append it after every item.
    pass
`,
      tests: [
        { call: py`running_sum([1, 2, 3, 4])`, expect: py`[1, 3, 6, 10]` },
        { call: py`running_sum([3, 1, 2, 10, 1])`, expect: py`[3, 4, 6, 16, 17]` },
        { call: py`running_sum([1, 1, 1, 1, 1])`, expect: py`[1, 2, 3, 4, 5]` },
        { call: py`running_sum([5])`, expect: py`[5]` },
        { call: py`running_sum([4, -6, 2, -3])`, expect: py`[4, -2, 0, -3]` },
        { call: py`running_sum([0, 0, 0])`, expect: py`[0, 0, 0]` },
      ],
      hints: [
        py`In the lesson, <code>total</code> holds the sum of the items visited so far. That is the value each position of the answer needs.`,
        py`Make an empty result list and a total of 0. For each number, add it to the total and then append the total to the result.`,
        py`Before the loop: <code>result = []</code> and <code>total = 0</code>. Inside the loop: <code>total += n</code>, then <code>result.append(total)</code>. After the loop: <code>return result</code>.`,
      ],
      solution: py`def running_sum(nums):
    result = []
    total = 0
    for n in nums:
        total += n              # the sum of everything up to this item
        result.append(total)    # record it before moving on
    return result
`,
      explain: py`
<p><code>total</code> always holds the sum of the items seen so far. The loop adds the current number first and appends second, so each recorded value includes the current item, as the task asks.</p>
<p>Nothing is added twice. Each pass reuses the previous total and never goes back over earlier numbers. That makes the whole job one pass over the list: one addition and one <code>append</code> per item.</p>
<p>A version that summed from the start of the list again for every position would give the same answer with far more work on a long list.</p>`,
    },
    {
      id: 'z2-palindrome-number',
      zone: 2,
      order: 7,
      kind: 'code',
      title: 'Mirror Codes',
      concept: 'Digit math in a while loop',
      classic: 'Palindrome Number (LeetCode #9)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A <code>while</code> loop repeats its block as long as its condition is true. On the Boot Deck the condition was a function call. A comparison works too, as long as the block changes a variable so that the condition turns false in the end.</p>
<p>Two operators take a whole number apart from the right. <code>n % 10</code> is its last digit. <code>n // 10</code> is the number with that digit removed.</p>
<pre><code>n = 472
total = 0
while n &gt; 0:
    digit = n % 10       # 2, then 7, then 4
    total += digit
    n = n // 10          # 47, then 4, then 0
print(total)             # 13, the sum of the digits</code></pre>
<p>Each pass peels one digit off, so <code>n</code> shrinks until it reaches 0 and the loop stops. The digits come out in reverse order, last digit first.</p>
<p>You cannot tell in advance how many digits a number has. That makes <code>while</code> the right loop for this job: it keeps going until the number runs out.</p>`,
      task: py`
<p>A relay code is safe when it reads the same forwards and backwards. Write <code>is_palindrome(x)</code>. <code>x</code> is a whole number. Return <code>True</code> if its digits read the same in both directions, and <code>False</code> if they do not.</p>
<pre><code>is_palindrome(121)   # True
is_palindrome(10)    # False: 10 reversed is 01</code></pre>
<p>A negative number is never a palindrome, because its minus sign is at one end only.</p>`,
      starter: py`def is_palindrome(x):
    # Peel the digits off to build the number backwards, then compare.
    pass
`,
      tests: [
        { call: py`is_palindrome(121)`, expect: py`True` },
        { call: py`is_palindrome(10)`, expect: py`False` },
        { call: py`is_palindrome(-121)`, expect: py`False` },
        { call: py`is_palindrome(0)`, expect: py`True` },
        { call: py`is_palindrome(7)`, expect: py`True` },
        { call: py`is_palindrome(1221)`, expect: py`True` },
        { call: py`is_palindrome(1231)`, expect: py`False` },
        { call: py`is_palindrome(1234554321)`, expect: py`True` },
      ],
      hints: [
        py`Build a second number that holds the digits of <code>x</code> in reverse order. If it equals the original, <code>x</code> is a palindrome.`,
        py`Start <code>backwards</code> at 0. Each time you peel a digit off <code>x</code>, multiply <code>backwards</code> by 10 to shift it one place left, then add the digit. Keep a copy of the original <code>x</code>, because the loop wears <code>x</code> down to 0.`,
        py`Return <code>False</code> straight away when <code>x &lt; 0</code>. Then loop <code>while x &gt; 0</code> with three steps: <code>digit = x % 10</code>, <code>backwards = backwards * 10 + digit</code>, <code>x = x // 10</code>. Finish by comparing <code>backwards</code> with the saved original.`,
      ],
      solution: py`def is_palindrome(x):
    if x < 0:
        return False                         # the minus sign never matches
    original = x
    backwards = 0
    while x > 0:
        digit = x % 10                       # peel off the last digit
        backwards = backwards * 10 + digit   # write it at the end of the new number
        x = x // 10                          # drop it from the old number
    return backwards == original
`,
      explain: py`
<p>The loop moves digits from one number to another. <code>x % 10</code> reads the last digit of <code>x</code>, and <code>backwards * 10 + digit</code> writes it at the right-hand end of the new number. The digits come off in reverse order, so when <code>x</code> reaches 0, <code>backwards</code> is the original number written backwards. The two are equal exactly when the number is a palindrome.</p>
<p>A number that ends in 0, such as 10, reverses to 1 and fails, which is correct. Negative numbers are rejected before the loop starts.</p>
<p>The loop runs once per digit. A ten-digit number takes ten passes.</p>`,
    },
    {
      id: 'z2-two-sum',
      zone: 2,
      order: 8,
      kind: 'code',
      title: 'Pair the Power Cells',
      concept: 'Nested loops over pairs',
      classic: 'Two Sum (LeetCode #1)',
      difficulty: 'Easy',
      boss: true,
      lesson: py`
<p>A loop can sit inside another loop. For each pass of the outer loop, the inner loop runs from start to finish.</p>
<p>To work with positions in a list, loop over its indexes with <code>range(len(...))</code>. Two nested index loops visit pairs of positions. Start the inner loop at <code>i + 1</code> and every pair comes up exactly once, with no item paired with itself.</p>
<pre><code>crew = ["Ada", "Bo", "Cy"]
for i in range(len(crew)):
    for j in range(i + 1, len(crew)):
        print(i, j, crew[i], crew[j])
# 0 1 Ada Bo
# 0 2 Ada Cy
# 1 2 Bo Cy</code></pre>
<p>In every printed line, <code>j</code> is larger than <code>i</code>.</p>
<p>A <code>return</code> inside the loops ends the whole function at once, so a search can stop the moment it finds what it wants. To hand back two values, return them in a list such as <code>[i, j]</code>.</p>`,
      task: py`
<p>The gate to the Data Vaults opens when two power cells together supply exactly the right charge. Write <code>two_sum(nums, target)</code>. Return the indexes of the two numbers in <code>nums</code> that add up to <code>target</code>, as a list with the smaller index first.</p>
<p>Exactly one pair works, and one cell cannot be used twice.</p>
<pre><code>two_sum([2, 7, 11, 15], 9)   # [0, 1]
two_sum([3, 2, 4], 6)        # [1, 2]</code></pre>`,
      starter: py`def two_sum(nums, target):
    # Try every pair of indexes with two nested loops.
    pass
`,
      tests: [
        { call: py`two_sum([2, 7, 11, 15], 9)`, expect: py`[0, 1]` },
        { call: py`two_sum([3, 2, 4], 6)`, expect: py`[1, 2]` },
        { call: py`two_sum([3, 3], 6)`, expect: py`[0, 1]` },
        { call: py`two_sum([5, 1, 8, 2, 7], 12)`, expect: py`[0, 4]` },
        { call: py`two_sum([-4, 10, 1, 9, -6], 3)`, expect: py`[3, 4]` },
        { call: py`two_sum([0, 4, 3, 0], 0)`, expect: py`[0, 3]` },
        { call: py`two_sum([1, 2], 3)`, expect: py`[0, 1]` },
      ],
      hints: [
        py`There is no shortcut on this floor. Look at every pair of positions and test whether the two numbers add up to <code>target</code>.`,
        py`Use the nested index loops from the lesson. The outer loop picks <code>i</code> and the inner loop picks every <code>j</code> after it. Inside, compare <code>nums[i] + nums[j]</code> with <code>target</code>.`,
        py`The inner loop is <code>for j in range(i + 1, len(nums))</code>. When the sum matches, <code>return [i, j]</code> right there. Because <code>j</code> starts after <code>i</code>, the smaller index is already first.`,
      ],
      solution: py`def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):      # j starts after i: each pair once
            if nums[i] + nums[j] == target:
                return [i, j]                  # i is always the smaller index
`,
      explain: py`
<p>The outer loop fixes one cell and the inner loop tries it with every cell after it. Starting the inner loop at <code>i + 1</code> does two jobs: a cell is never paired with itself, and each pair is tested once instead of twice. It also keeps <code>i</code> smaller than <code>j</code>, so <code>[i, j]</code> is already in the right order.</p>
<p>The <code>return</code> stops the search at the first match, and the task promises there is exactly one.</p>
<p>The cost is the number of pairs. For 4 cells that is 6 checks, for 100 cells it is 4,950, and for 2,000 cells it is about two million. On long lists that becomes slow. The Data Vaults have a faster way.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
