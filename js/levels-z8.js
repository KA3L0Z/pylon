/* Pylon levels, file 8: topics the first version skipped on the upper floors (enumerate and zip, grids, prefix products,
   inheritance, plain recursion, building a linked list, three kinds of dynamic programming and greedy choice, subsets,
   tries). js/curriculum.js places them on floors 4 to 8.
   Format and field notes: tools/level-example.js. "tools" are the reference cards shown with the lesson.
   Validate with: python tools/check_levels.py 8 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z8-pythonic-loops',
      zone: 8,
      order: 1,
      kind: 'code',
      title: 'Paired Channels',
      concept: 'enumerate() and zip()',
      classic: 'Merge Strings Alternately (LeetCode #1768)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Two built-in functions remove most of the index juggling from loops.</p>
<p><code>enumerate()</code> hands you each item together with its position, so you never need <code>range(len(...))</code> just to know where you are:</p>
<pre><code>names = ["north", "south", "east"]
for position, name in enumerate(names):
    print(position, name)        # 0 north, then 1 south, then 2 east</code></pre>
<p><code>zip()</code> walks two sequences side by side and hands you one item from each. It stops as soon as the shorter one runs out:</p>
<pre><code>names = ["north", "south", "east"]
loads = [40, 55]
for name, load in zip(names, loads):
    print(name, load)            # north 40, then south 55</code></pre>
<p>Both give pairs, and the <code>for</code> line unpacks each pair into two names. To see everything at once, wrap them in <code>list()</code>:</p>
<pre><code>print(list(enumerate("ab")))       # [(0, 'a'), (1, 'b')]
print(list(zip("ab", "xyz")))      # [('a', 'x'), ('b', 'y')]</code></pre>
<p>Because <code>zip()</code> stops early, whatever is left of the longer sequence is yours to deal with. A slice from the shorter length onwards picks it up.</p>`,
      tools: [
        { key: 'enumerate', name: 'enumerate(items)   ·   enumerate(items, start=1)', what: 'Gives each item together with its position, as pairs. Unpack the pair in the <code>for</code> line. <code>start</code> changes the first number.', code: py`for number, name in enumerate(["ada", "pip"], start=1):
    print(number, name)` },
        { key: 'zip', name: 'zip(first, second)', what: 'Walks several sequences in step and gives one item from each, as pairs. It stops when the shortest one ends.', code: py`for letter, digit in zip("abc", [1, 2]):
    print(letter, digit)
print(list(zip([1, 2], [3, 4])))` },
        { key: 'list', name: 'list(anything you can loop over)', what: 'A new list holding every item: of a string, a range, a zip, another list. Handy for looking at what a loop would see.', code: py`print(list("pip"))
print(list(range(3)))` },
      ],
      task: py`
<p>Two channels are woven into one signal: a character from the first, a character from the second, and so on.</p>
<p>Write <code>merge_alternately(first, second)</code>. Take characters in turn, starting with <code>first</code>. When one string runs out, the rest of the other goes on the end.</p>
<pre><code>merge_alternately("abc", "pqr")     # "apbqcr"
merge_alternately("ab", "pqrs")     # "apbqrs"
merge_alternately("abcd", "pq")     # "apbqcd"</code></pre>`,
      starter: py`def merge_alternately(first, second):
    pass
`,
      tests: [
        { call: py`merge_alternately("abc", "pqr")`, expect: py`"apbqcr"` },
        { call: py`merge_alternately("ab", "pqrs")`, expect: py`"apbqrs"` },
        { call: py`merge_alternately("abcd", "pq")`, expect: py`"apbqcd"` },
        { call: py`merge_alternately("", "xyz")`, expect: py`"xyz"` },
        { call: py`merge_alternately("a", "")`, expect: py`"a"` },
        { call: py`merge_alternately("", "")`, expect: py`""` },
        { call: py`merge_alternately("xyz", "123")`, expect: py`"x1y2z3"` },
      ],
      hints: [
        py`As long as both strings still have characters, you take one from each. Which tool walks two sequences in step?`,
        py`Weave the part that both strings have, then add what is left over. Only one of the two can have anything left, and a slice past the end of a string is simply empty.`,
        py`Loop with <code>for a, b in zip(first, second)</code> and collect <code>a + b</code>. Let <code>shared = min(len(first), len(second))</code>, then add <code>first[shared:]</code> and <code>second[shared:]</code> to the joined result.`,
      ],
      solution: py`def merge_alternately(first, second):
    woven = []
    for ours, theirs in zip(first, second):     # stops when the shorter one ends
        woven.append(ours + theirs)
    shared = min(len(first), len(second))
    return "".join(woven) + first[shared:] + second[shared:]
`,
      explain: py`
<p><code>zip</code> covers exactly the stretch that both strings share, with no index and no length check inside the loop.</p>
<p>After that stretch, one string may have characters left. Slicing both from <code>shared</code> onwards adds the leftover of the longer one and an empty string for the other, so there is no need to ask which one is longer.</p>
<p><b>Cost:</b> <code>O(n + m)</code> for strings of n and m characters.</p>`,
    },
    {
      id: 'z8-matrix',
      zone: 8,
      order: 2,
      kind: 'code',
      title: 'Mirror Grid',
      concept: 'Grids: a list of rows',
      classic: 'Transpose Matrix (LeetCode #867)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A table of values is stored as a list of rows, where each row is itself a list. Two indexes reach one cell: the row first, then the column.</p>
<pre><code>grid = [[1, 2, 3],
        [4, 5, 6]]
print(len(grid), len(grid[0]))    # 2 3: two rows, three columns
print(grid[1][2])                 # 6: row 1, column 2
print(grid[0])                    # [1, 2, 3], a whole row</code></pre>
<p>Rows are easy, because each one is already a list. A column has to be collected, one cell from every row:</p>
<pre><code>grid = [[1, 2, 3],
        [4, 5, 6]]
first_column = [row[0] for row in grid]
print(first_column)               # [1, 4]</code></pre>
<p>To visit every cell, nest two loops: the outer one over row numbers, the inner one over column numbers.</p>
<p>One trap when you build a grid: <code>[[0] * 3] * 2</code> does not make two rows. It makes one row and lists it twice, so changing a cell changes it in "both". Build each row separately instead.</p>
<pre><code>rows = [[0] * 3 for _ in range(2)]
rows[0][0] = 9
print(rows)                       # [[9, 0, 0], [0, 0, 0]]</code></pre>`,
      tools: [
        { key: null, name: 'grid[row][column]', what: 'A grid is a list of rows. <code>grid[r]</code> is one whole row, and <code>grid[r][c]</code> is one cell. <code>len(grid)</code> counts rows, <code>len(grid[0])</code> counts columns.', code: py`grid = [[7, 8], [9, 10], [11, 12]]
print(len(grid), len(grid[0]))
print(grid[2][0], grid[0][1])` },
        { key: null, name: '[[0] * columns for _ in range(rows)]', what: 'Builds a grid of zeros with a separate list for every row. The name <code>_</code> says the loop variable is not used.', code: py`grid = [[0] * 2 for _ in range(3)]
grid[1][1] = 5
print(grid)` },
      ],
      task: py`
<p>The mirror in the Reactor flips a grid along its diagonal: the first row becomes the first column, the second row becomes the second column, and so on.</p>
<p>Write <code>transpose(grid)</code>. Return a new grid in which cell <code>[r][c]</code> of the old one sits at <code>[c][r]</code>. Do not change the grid you were given.</p>
<pre><code>transpose([[1, 2, 3],
           [4, 5, 6]])     # [[1, 4], [2, 5], [3, 6]]</code></pre>
<p>The grid always has at least one row and one column, but it need not be square.</p>`,
      starter: py`def transpose(grid):
    pass
`,
      tests: [
        { call: py`transpose([[1, 2, 3], [4, 5, 6], [7, 8, 9]])`, expect: py`[[1, 4, 7], [2, 5, 8], [3, 6, 9]]` },
        { call: py`transpose([[1, 2, 3], [4, 5, 6]])`, expect: py`[[1, 4], [2, 5], [3, 6]]` },
        { call: py`transpose([[5]])`, expect: py`[[5]]` },
        { call: py`transpose([[1, 2]])`, expect: py`[[1], [2]]` },
        { call: py`transpose([[1], [2], [3]])`, expect: py`[[1, 2, 3]]` },
        { setup: py`plate = [[1, 2], [3, 4]]`, call: py`[transpose(plate), plate]`, expect: py`[[[1, 3], [2, 4]], [[1, 2], [3, 4]]]`, show: py`transpose(plate) must leave plate as it was` },
      ],
      hints: [
        py`Every row of the answer is one <b>column</b> of the grid you were given. How many rows will the answer have?`,
        py`The answer has as many rows as the old grid has columns. For each column number, collect that cell from every row of the old grid, top to bottom.`,
        py`Loop <code>c</code> over <code>range(len(grid[0]))</code>. For each one, build the list of <code>grid[r][c]</code> for every <code>r</code> in <code>range(len(grid))</code>, and append it to the answer.`,
      ],
      solution: py`def transpose(grid):
    rows, columns = len(grid), len(grid[0])
    flipped = []
    for c in range(columns):
        flipped.append([grid[r][c] for r in range(rows)])    # column c, read top to bottom
    return flipped
`,
      explain: py`
<p>The outer loop walks the columns of the old grid, and each column becomes one row of the new one. Reading <code>grid[r][c]</code> with <code>c</code> fixed and <code>r</code> moving is how you travel down a column.</p>
<p>Because every row of the answer is a fresh list, the original grid is never touched.</p>
<p><b>Cost:</b> <code>O(rows × columns)</code> time and space: each cell is copied once.</p>`,
    },
    {
      id: 'z8-product-except-self',
      zone: 8,
      order: 3,
      kind: 'code',
      title: 'All But One',
      concept: 'A pass from each end',
      classic: 'Product of Array Except Self (LeetCode #238)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Some answers depend on everything to the left of a position and everything to the right of it. Computing both sides again for every position is slow. Two passes are enough: one from the left that carries a running value, and one from the right.</p>
<p>Here is the left pass for a different question, "how much load sits before each relay?":</p>
<pre><code>loads = [3, 1, 4, 2]
before = [0] * len(loads)        # four zeros, one slot per relay
running = 0
for i in range(len(loads)):
    before[i] = running          # everything left of position i
    running += loads[i]
print(before)                    # [0, 3, 4, 8]</code></pre>
<p>Note the order inside the loop: the slot is filled <b>before</b> the current item joins the running value, so the item itself is left out.</p>
<p>To walk from the right, give <code>range()</code> three numbers: where to start, where to stop (not included) and a step of <code>-1</code>.</p>
<pre><code>print(list(range(3, -1, -1)))    # [3, 2, 1, 0]</code></pre>
<p><code>[value] * n</code> builds a list of n copies of a value, which is the quickest way to prepare the slots.</p>`,
      tools: [
        { key: 'kw:range-step', name: 'range(start, stop, step)', what: 'Counts from <code>start</code> towards <code>stop</code> in jumps of <code>step</code>, and never includes <code>stop</code>. A step of <code>-1</code> counts down.', code: py`print(list(range(5, 0, -1)))
print(list(range(0, 10, 3)))
print(list(range(2, -1, -1)))` },
        { key: 'kw:list-repeat', name: '[value] * n', what: 'A list with n copies of the value. Use it to prepare a list of a known length that you will fill in by position.', code: py`slots = [0] * 4
slots[2] = 7
print(slots, [1] * 3)` },
      ],
      task: py`
<p>For every cell in a row, the Forge needs the product of <b>all the other</b> cells.</p>
<p>Write <code>product_except_self(nums)</code>. Return a list in which position <code>i</code> holds the product of every number in <code>nums</code> except <code>nums[i]</code>.</p>
<pre><code>product_except_self([1, 2, 3, 4])       # [24, 12, 8, 6]
product_except_self([-1, 1, 0, -3, 3])  # [0, 0, 9, 0, 0]</code></pre>
<p>Division is not allowed: a zero in the row would break it. The last test has 700 cells and a step limit, so multiplying the others out again for every cell is too slow.</p>`,
      starter: py`def product_except_self(nums):
    pass
`,
      tests: [
        { call: py`product_except_self([1, 2, 3, 4])`, expect: py`[24, 12, 8, 6]` },
        { call: py`product_except_self([-1, 1, 0, -3, 3])`, expect: py`[0, 0, 9, 0, 0]` },
        { call: py`product_except_self([2, 3])`, expect: py`[3, 2]` },
        { call: py`product_except_self([5, 0, 0])`, expect: py`[0, 0, 0]` },
        { call: py`product_except_self([1, 1, 1])`, expect: py`[1, 1, 1]` },
        {
          setup: py`cells = [1] * 700
cells[10] = 2
cells[650] = 3`,
          call: py`product_except_self(cells)`,
          expect: py`[6] * 10 + [3] + [6] * 639 + [2] + [6] * 49`,
          show: py`product_except_self([1, 1, ..., 2, ..., 3, ..., 1])   700 cells`,
          perf: true,
        },
      ],
      hints: [
        py`The product of all the others is two products multiplied together: everything to the left of the cell, and everything to the right of it.`,
        py`Make one pass from the left with a running product, writing "everything to the left" into each slot before the current number joins the product. Then make the same pass from the right and multiply it in.`,
        py`Start with <code>products = [1] * len(nums)</code>. Left pass: <code>products[i] = running</code>, then <code>running *= nums[i]</code>. Reset <code>running</code> to 1. Right pass over <code>range(len(nums) - 1, -1, -1)</code>: <code>products[i] *= running</code>, then <code>running *= nums[i]</code>.`,
      ],
      solution: py`def product_except_self(nums):
    products = [1] * len(nums)
    running = 1
    for i in range(len(nums)):
        products[i] = running             # the product of everything left of i
        running *= nums[i]
    running = 1
    for i in range(len(nums) - 1, -1, -1):
        products[i] *= running            # times everything right of i
        running *= nums[i]
    return products
`,
      naive: py`def product_except_self(nums):
    products = []
    for i in range(len(nums)):
        product = 1
        for j in range(len(nums)):
            if j != i:
                product *= nums[j]
        products.append(product)
    return products
`,
      explain: py`
<p>After the first pass, each slot holds the product of everything to its left. The second pass walks back and multiplies in the product of everything to its right. The number at the position itself joins the running product only after its own slot has been written, so it is never included.</p>
<p>Zeros need no special care. A zero simply turns the running product to 0 for every position beyond it.</p>
<p><b>Cost:</b> <code>O(n)</code> time and no extra space beyond the answer. The nested version does <code>O(n²)</code> multiplications.</p>`,
    },
    {
      id: 'z8-inheritance',
      zone: 8,
      order: 4,
      kind: 'code',
      title: 'Sensor Family',
      concept: 'Inheritance and super()',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>When two kinds of object share most of their behaviour, write the shared part once. A class can <b>inherit</b> from another: put the parent in brackets after the name, and the child gets every method the parent has.</p>
<pre><code>class Drone:
    def __init__(self, name):
        self.name = name
        self.battery = 100

    def describe(self):
        return f"{self.name} ({self.battery}%)"

class Scout(Drone):
    def __init__(self, name, reach):
        super().__init__(name)         # let the parent set up its part
        self.reach = reach

    def describe(self):
        return super().describe() + f", reach {self.reach} km"

pip = Scout("PIP", 12)
print(pip.describe())                  # PIP (100%), reach 12 km
print(pip.battery)                     # 100, set by Drone</code></pre>
<p>A child can <b>override</b> a method by defining one with the same name. <code>super()</code> reaches the parent's version, so the child can extend it instead of copying it.</p>
<p>When a parent's method calls another method on <code>self</code>, Python uses the child's version if there is one. That is what lets one piece of shared code behave differently for each kind of object.</p>
<pre><code>print(isinstance(pip, Scout), isinstance(pip, Drone))    # True True</code></pre>`,
      tools: [
        { key: 'kw:inherit', name: 'class Child(Parent):', what: 'The child class starts with every method of the parent. Methods you define in the child replace the parent\'s methods of the same name.', code: py`class Animal:
    def sound(self):
        return "..."

    def speak(self):
        return "It says " + self.sound()

class Cat(Animal):
    def sound(self):
        return "meow"

print(Animal().speak())
print(Cat().speak())` },
        { key: 'super', name: 'super().method(...)', what: 'Inside a child class: call the parent\'s version of a method. Most often used as <code>super().__init__(...)</code>, so the parent sets up its own fields.', code: py`class Base:
    def __init__(self, name):
        self.name = name

class Timed(Base):
    def __init__(self, name, seconds):
        super().__init__(name)
        self.seconds = seconds

job = Timed("scan", 30)
print(job.name, job.seconds)` },
        { key: 'isinstance', name: 'isinstance(value, kind)', what: 'True when the value is of that type, or of a class that inherits from it.', code: py`print(isinstance(3, int), isinstance("3", int))
print(isinstance([1], list), isinstance(True, bool))` },
      ],
      task: py`
<p>The Works has many kinds of sensor. They all have a name and a value, and they all report a label. Only what counts as a problem differs.</p>
<p>Write two classes.</p>
<ul><li><code>Sensor(name, value)</code> stores both. <code>status()</code> returns <code>"ok"</code>. <code>label()</code> returns the name, a colon, a space and the status: <code>"door: ok"</code>.</li><li><code>TempSensor(name, value, limit)</code> is a <code>Sensor</code> that also stores a limit. Its <code>status()</code> returns <code>"hot"</code> when the value is above the limit, and <code>"ok"</code> otherwise.</li></ul>
<pre><code>Sensor("door", 1).label()             # "door: ok"
TempSensor("core", 95, 80).label()    # "core: hot"</code></pre>
<p><code>TempSensor</code> must not have a <code>label</code> method of its own. It inherits the one from <code>Sensor</code>.</p>`,
      starter: py`class Sensor:
    pass


class TempSensor(Sensor):
    pass
`,
      tests: [
        { call: py`Sensor("door", 1).label()`, expect: py`"door: ok"` },
        { call: py`TempSensor("core", 95, 80).status()`, expect: py`"hot"` },
        { call: py`TempSensor("core", 70, 80).label()`, expect: py`"core: ok"` },
        { call: py`TempSensor("core", 95, 80).label()`, expect: py`"core: hot"` },
        { call: py`TempSensor("vent", 5, 5).status()`, expect: py`"ok"` },
        { call: py`[s.label() for s in [Sensor("a", 5), TempSensor("b", 9, 3), TempSensor("c", 1, 3)]]`, expect: py`["a: ok", "b: hot", "c: ok"]` },
        { call: py`[isinstance(TempSensor("t", 1, 2), Sensor), TempSensor.label is Sensor.label]`, expect: py`[True, True]`, show: py`TempSensor inherits from Sensor and has no label method of its own` },
        { call: py`[TempSensor("t", 8, 2).name, TempSensor("t", 8, 2).value, TempSensor("t", 8, 2).limit]`, expect: py`["t", 8, 2]` },
      ],
      hints: [
        py`<code>label()</code> is written once, in <code>Sensor</code>. It builds its text from <code>self.name</code> and from whatever <code>self.status()</code> returns.`,
        py`<code>TempSensor</code> needs two methods of its own: an <code>__init__</code> that takes the extra limit, and a <code>status</code> that compares the value with it. Let the parent store the name and the value.`,
        py`In <code>TempSensor.__init__</code>, call <code>super().__init__(name, value)</code> and then set <code>self.limit</code>. Because <code>label()</code> calls <code>self.status()</code>, a temperature sensor gets its own status in the inherited label.`,
      ],
      solution: py`class Sensor:
    def __init__(self, name, value):
        self.name = name
        self.value = value

    def status(self):
        return "ok"

    def label(self):
        return f"{self.name}: {self.status()}"


class TempSensor(Sensor):
    def __init__(self, name, value, limit):
        super().__init__(name, value)      # the parent stores name and value
        self.limit = limit

    def status(self):
        if self.value > self.limit:
            return "hot"
        return "ok"
`,
      explain: py`
<p><code>label()</code> exists once. It asks <code>self</code> for its status, and Python looks that method up on the actual object, so a <code>TempSensor</code> answers with its own version. Adding another kind of sensor later means writing one small class and touching nothing else.</p>
<p><code>super().__init__(name, value)</code> keeps the knowledge of how a sensor stores its name and value in one place.</p>
<p><b>Cost:</b> every method does a fixed amount of work: <code>O(1)</code>.</p>`,
    },
    {
      id: 'z8-recursion',
      zone: 8,
      order: 5,
      kind: 'code',
      title: 'Crates in Crates',
      concept: 'Recursion: a function that calls itself',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A function may call itself. That is <b>recursion</b>, and it fits problems that contain smaller copies of themselves.</p>
<p>Every recursive function has two parts. The <b>base case</b> is an input small enough to answer at once. The <b>recursive case</b> does a little work and hands a smaller input to itself.</p>
<pre><code>def factorial(n):
    if n &lt;= 1:
        return 1                        # base case
    return n * factorial(n - 1)         # a smaller copy of the same problem

print(factorial(5))                     # 120</code></pre>
<p>Each call waits for the call it made. <code>factorial(3)</code> waits for <code>factorial(2)</code>, which waits for <code>factorial(1)</code>. Then the answers travel back up. <b>Step through</b> shows this stack of waiting calls.</p>
<p>Without a base case the calls never stop, and Python ends the program with a <code>RecursionError</code>.</p>
<p>Recursion is the natural tool when data is nested to an unknown depth. <code>isinstance()</code> tells you which kind of thing you are holding:</p>
<pre><code>def depth(item):
    if not isinstance(item, list):
        return 0                        # a plain value has no depth
    deepest = 0
    for inner in item:
        deepest = max(deepest, depth(inner))
    return deepest + 1

print(depth([1, [2, [3]]]))             # 3</code></pre>`,
      tools: [
        { key: 'kw:recursion', name: 'a function that calls itself', what: 'Give it a base case that returns without another call, and a recursive case that calls itself on something smaller. Trust the smaller call to return the right answer, then build on it.', code: py`def countdown(n):
    if n == 0:
        return "liftoff"
    return str(n) + " " + countdown(n - 1)

print(countdown(3))` },
      ],
      task: py`
<p>The loading bay stacks crates inside crates. A crate is a list. Each item in it is either a weight (a number) or another crate, which may hold more crates in turn.</p>
<p>Write <code>total_weight(crate)</code>. Return the sum of every weight, however deep it is packed.</p>
<pre><code>total_weight([1, 2, 3])            # 6
total_weight([1, [2, 3], 4])       # 10
total_weight([1, [2, [3, [4]]]])   # 10</code></pre>
<p>An empty crate weighs 0.</p>`,
      starter: py`def total_weight(crate):
    pass
`,
      tests: [
        { call: py`total_weight([1, 2, 3])`, expect: py`6` },
        { call: py`total_weight([1, [2, 3], 4])`, expect: py`10` },
        { call: py`total_weight([1, [2, [3, [4]]]])`, expect: py`10` },
        { call: py`total_weight([])`, expect: py`0` },
        { call: py`total_weight([[], [[]], 7])`, expect: py`7` },
        { call: py`total_weight([[[[5]]]])`, expect: py`5` },
        { call: py`total_weight([10, [20, [30]], [40]])`, expect: py`100` },
      ],
      hints: [
        py`You cannot know how deep the crates go, so a fixed number of nested loops will not do. But a crate inside a crate is the same problem again, only smaller.`,
        py`Go through the items of the crate. A number is added to the total. A crate has a total weight of its own, and you are writing the function that computes it.`,
        py`For each item: if <code>isinstance(item, list)</code>, add <code>total_weight(item)</code>. Otherwise add the item itself. An empty crate never enters the loop and returns 0, which is the base case.`,
      ],
      solution: py`def total_weight(crate):
    total = 0
    for item in crate:
        if isinstance(item, list):
            total += total_weight(item)     # a crate inside the crate: same question, smaller
        else:
            total += item
    return total
`,
      explain: py`
<p>The function answers one level and trusts itself with everything below. A crate that holds only numbers is the base case: the loop adds them up and no further call is made.</p>
<p>Each inner crate is strictly smaller than the one that holds it, so the calls must come to an end.</p>
<p><b>Cost:</b> <code>O(n)</code> for n items in total, at any depth. Every item is visited once. The stack of waiting calls is as tall as the deepest nesting.</p>`,
    },
    {
      id: 'z8-merge-two-lists',
      zone: 8,
      order: 6,
      kind: 'code',
      title: 'Zip the Lines',
      concept: 'Building a linked list behind a dummy',
      classic: 'Merge Two Sorted Lists (LeetCode #21)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Reversing a linked list rewires nodes in place. Often you need to <b>build</b> a new chain instead, node after node. The awkward part is the first node: there is nothing yet to attach it to.</p>
<p>The standard trick is a <b>dummy</b> node. It is a placeholder that stands in front of the answer, so that every real node, the first one included, is attached in exactly the same way. A second name, <code>tail</code>, always points at the last node of the chain so far.</p>
<pre><code>dummy = ListNode(0)                # placeholder: not part of the answer
tail = dummy
for value in [3, 5, 8]:
    tail.next = ListNode(value)    # attach after the last node
    tail = tail.next               # the new node is now the last
print(unlinked(dummy.next))        # [3, 5, 8]</code></pre>
<p>The answer is <code>dummy.next</code>: everything after the placeholder.</p>
<p>You do not have to create new nodes. An existing node can be attached just as well, with <code>tail.next = node</code>. And since a node carries the whole rest of its chain with it, attaching one node can attach an entire remainder in a single step.</p>
<pre><code>rest = linked([7, 9])
tail.next = rest                   # hooks on 7 and 9 at once
print(unlinked(dummy.next))        # [3, 5, 8, 7, 9]</code></pre>`,
      tools: [
        { key: null, name: 'dummy and tail', what: 'To build a chain: make a placeholder node, keep <code>tail</code> on the last node, attach with <code>tail.next = node</code>, then move <code>tail</code> forward. Return <code>dummy.next</code>.', code: py`dummy = ListNode(0)
tail = dummy
for value in "abc":
    tail.next = ListNode(value)
    tail = tail.next
print(unlinked(dummy.next))` },
      ],
      task: py`
<p>Two conveyor lines, each already sorted from light to heavy, join into one.</p>
<p>Write <code>merge_lists(first, second)</code>. Each argument is the head of a sorted linked list, or <code>None</code> for an empty one. Return the head of one sorted list made from <b>the same nodes</b>.</p>
<pre><code>merge_lists(linked([1, 2, 4]), linked([1, 3, 4]))   # 1 → 1 → 2 → 3 → 4 → 4</code></pre>
<p>The tests turn your result back into a Python list to compare it.</p>`,
      starter: py`def merge_lists(first, second):
    pass
`,
      tests: [
        { call: py`unlinked(merge_lists(linked([1, 2, 4]), linked([1, 3, 4])))`, expect: py`[1, 1, 2, 3, 4, 4]` },
        { call: py`unlinked(merge_lists(linked([]), linked([])))`, expect: py`[]` },
        { call: py`unlinked(merge_lists(linked([]), linked([0])))`, expect: py`[0]` },
        { call: py`unlinked(merge_lists(linked([5]), linked([1, 2, 3])))`, expect: py`[1, 2, 3, 5]` },
        { call: py`unlinked(merge_lists(linked([1, 3, 5]), linked([2, 4, 6])))`, expect: py`[1, 2, 3, 4, 5, 6]` },
        { call: py`unlinked(merge_lists(linked([-3, 0]), linked([-2, -1, 4])))`, expect: py`[-3, -2, -1, 0, 4]` },
        { call: py`unlinked(merge_lists(linked([2, 2, 2]), linked([2, 2])))`, expect: py`[2, 2, 2, 2, 2]` },
      ],
      hints: [
        py`At every moment, the next node of the answer is the smaller of the two front nodes. Take it, and that line moves up by one.`,
        py`Build the answer behind a placeholder. While both lines still have nodes, attach the smaller front node and step forward in the line it came from. When one line is empty, the other one is already in order.`,
        py`<code>dummy = ListNode(0)</code>, <code>tail = dummy</code>. In the loop: attach <code>first</code> or <code>second</code> with <code>tail.next = ...</code>, advance that one with <code>.next</code>, then <code>tail = tail.next</code>. After the loop attach whichever is not <code>None</code>, and return <code>dummy.next</code>.`,
      ],
      solution: py`def merge_lists(first, second):
    dummy = ListNode(0)                 # placeholder in front of the answer
    tail = dummy
    while first is not None and second is not None:
        if first.val <= second.val:
            tail.next = first
            first = first.next
        else:
            tail.next = second
            second = second.next
        tail = tail.next
    if first is not None:               # one line is used up: hook on the rest of the other
        tail.next = first
    else:
        tail.next = second
    return dummy.next
`,
      explain: py`
<p>The loop compares the two front nodes and attaches the smaller one. Because both lines are sorted, that node is the smallest of everything still waiting, so the answer grows in order.</p>
<p>When one line runs out, the rest of the other is attached in a single step. It is already sorted, and it is already a chain.</p>
<p><b>Cost:</b> <code>O(n + m)</code> time for lines of n and m nodes, and <code>O(1)</code> extra space: no node is copied, only relinked.</p>`,
    },
    {
      id: 'z8-house-robber',
      zone: 8,
      order: 7,
      kind: 'code',
      title: 'Skip a Cell',
      concept: 'DP: carry two answers forward',
      classic: 'House Robber (LeetCode #198)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The stairs showed the core of <b>dynamic programming</b>: the answer for a position is built from the answers for the positions just before it. When only the last one or two answers are ever needed, you do not have to keep a whole table. Two variables that slide forward are enough.</p>
<p>The recipe is always the same three questions:</p>
<ol><li>What exactly does the answer for position <code>i</code> mean? Say it in one sentence.</li><li>How does it follow from earlier answers? There are usually two or three ways to arrive, and you take the best.</li><li>What are the answers before the first position?</li></ol>
<p>Here it is for another problem. Each tile of a corridor has a cost, and you move one or two tiles at a time. What is the cheapest way to get past the end?</p>
<pre><code>def cheapest(cost):
    one_back, two_back = 0, 0        # cheapest way to reach the two previous spots
    for i in range(2, len(cost) + 1):
        here = min(one_back + cost[i - 1], two_back + cost[i - 2])
        two_back, one_back = one_back, here
    return one_back

print(cheapest([10, 15, 20]))        # 15</code></pre>
<p>The line with two names on each side swaps and shifts in one step. Python computes everything on the right first, then assigns, so no value is overwritten too early.</p>`,
      tools: [
        { key: 'kw:swap', name: 'a, b = b, a + b', what: 'Several assignments at once. Python works out every value on the right before it changes any name on the left, so the old values are all still available.', code: py`a, b = 1, 2
a, b = b, a
print(a, b)
a, b = b, a + b
print(a, b)` },
        { key: null, name: 'dynamic programming with two variables', what: 'When the answer for a position depends only on the one or two answers before it, keep just those and slide them forward. Decide what each one means, how the next follows, and what they start as.', code: py`previous, current = 0, 1
for _ in range(6):
    previous, current = current, previous + current
print(current)` },
      ],
      task: py`
<p>A row of power cells can be drained to recharge PIP. Draining two cells that sit <b>next to each other</b> trips the breaker, so no two neighbours may both be drained.</p>
<p>Write <code>max_charge(cells)</code>. Each number is the charge in one cell. Return the largest total you can drain.</p>
<pre><code>max_charge([1, 2, 3, 1])       # 4: cells 0 and 2
max_charge([2, 7, 9, 3, 1])    # 12: cells 0, 2 and 4</code></pre>
<p>An empty row gives 0. The last test has 24 cells and a step limit. Trying every combination is far too slow.</p>`,
      starter: py`def max_charge(cells):
    pass
`,
      tests: [
        { call: py`max_charge([1, 2, 3, 1])`, expect: py`4` },
        { call: py`max_charge([2, 7, 9, 3, 1])`, expect: py`12` },
        { call: py`max_charge([])`, expect: py`0` },
        { call: py`max_charge([5])`, expect: py`5` },
        { call: py`max_charge([2, 1, 1, 2])`, expect: py`4` },
        { call: py`max_charge([10, 1, 1, 10, 1])`, expect: py`20` },
        { setup: py`row = [5, 1] * 12`, call: py`max_charge(row)`, expect: py`60`, show: py`max_charge([5, 1, 5, 1, ...])   24 cells`, perf: true },
      ],
      hints: [
        py`Walk the row from left to right. For each cell there are only two choices: leave it, or drain it. Draining it means the cell before it was left alone.`,
        py`Carry two numbers forward: the best total so far if the previous cell was <b>not</b> drained, and the best total if it <b>was</b>. From those two you can work out the same two numbers for the next cell.`,
        py`Call them <code>skipped</code> and <code>taken</code>, both 0 at the start. For each charge: the new <code>skipped</code> is <code>max(skipped, taken)</code>, and the new <code>taken</code> is the old <code>skipped</code> plus the charge. Update both in one line, and return the larger at the end.`,
      ],
      solution: py`def max_charge(cells):
    skipped, taken = 0, 0          # best total with the previous cell left alone / drained
    for charge in cells:
        skipped, taken = max(skipped, taken), skipped + charge
    return max(skipped, taken)
`,
      naive: py`def max_charge(cells):
    if not cells:
        return 0
    return max(cells[0] + max_charge(cells[2:]), max_charge(cells[1:]))
`,
      explain: py`
<p>At every cell there are two situations worth remembering: the previous cell was left alone, or it was drained. Leaving the current cell keeps the better of the two. Draining it is only allowed after a cell that was left alone, so it adds the charge to that total.</p>
<p>Both updates happen in one assignment, which matters: the new <code>taken</code> needs the <b>old</b> <code>skipped</code>.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(1)</code> space. Trying every combination doubles the work with each extra cell.</p>`,
    },
    {
      id: 'z8-unique-paths',
      zone: 8,
      order: 8,
      kind: 'code',
      title: 'Lattice Routes',
      concept: 'DP on a grid',
      classic: 'Unique Paths (LeetCode #62)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Dynamic programming works in two directions as well as one. On a grid, the answer for a cell is built from the cells it can be reached from, usually the one above and the one to the left. Fill the grid row by row and every answer you need is already there.</p>
<p>The classic picture is the number triangle in which every entry is the sum of the two entries above it:</p>
<pre><code>row = [1]
for _ in range(4):
    below = [1]
    for i in range(len(row) - 1):
        below.append(row[i] + row[i + 1])     # the two neighbours above
    below.append(1)
    row = below
print(row)                                    # [1, 4, 6, 4, 1]</code></pre>
<p>Only one row is kept. Each new row is computed from the one before, which is then thrown away.</p>
<p>You can go one step further and update a single row <b>in place</b>. While you move along it, the positions you have already passed hold new values and the positions ahead still hold the old ones:</p>
<pre><code>totals = [1, 1, 1, 1]
for c in range(1, len(totals)):
    totals[c] += totals[c - 1]        # old value here, plus the new value on the left
print(totals)                         # [1, 2, 3, 4]</code></pre>
<p>Edges are the base cases: a cell in the first row or first column can be reached in only one way.</p>`,
      tools: [
        { key: null, name: 'dynamic programming on a grid', what: 'The answer for a cell comes from the cells it can be reached from. Fill in the first row and column, then the rest in reading order. If each row only needs the row above, one list updated in place is enough.', code: py`row = [1, 1, 1]
for _ in range(2):
    for c in range(1, len(row)):
        row[c] += row[c - 1]
print(row)` },
      ],
      task: py`
<p>PIP stands in the top-left cell of a lattice and must reach the bottom-right cell. Each move goes one cell <b>right</b> or one cell <b>down</b>.</p>
<p>Write <code>count_routes(rows, columns)</code>. Return the number of different routes.</p>
<pre><code>count_routes(3, 2)    # 3
count_routes(3, 7)    # 28</code></pre>
<p>A lattice with a single row or a single column has exactly one route. The last test is a 10 by 10 lattice with a step limit. Walking every route one by one is too slow.</p>`,
      starter: py`def count_routes(rows, columns):
    pass
`,
      tests: [
        { call: py`count_routes(3, 2)`, expect: py`3` },
        { call: py`count_routes(3, 7)`, expect: py`28` },
        { call: py`count_routes(7, 3)`, expect: py`28` },
        { call: py`count_routes(1, 1)`, expect: py`1` },
        { call: py`count_routes(1, 9)`, expect: py`1` },
        { call: py`count_routes(3, 3)`, expect: py`6` },
        { call: py`count_routes(10, 10)`, expect: py`48620`, perf: true },
      ],
      hints: [
        py`Think about the last move into a cell. It came from the cell above or from the cell on the left, and from nowhere else.`,
        py`So the number of routes into a cell is the number into the cell above plus the number into the cell on the left. Every cell of the top row and of the left column has exactly one route.`,
        py`Keep one list <code>ways = [1] * columns</code> for the top row. For each further row, go through the columns from 1 upwards and do <code>ways[c] += ways[c - 1]</code>. Return the last entry.`,
      ],
      solution: py`def count_routes(rows, columns):
    ways = [1] * columns               # the top row: one route into every cell
    for _ in range(1, rows):
        for c in range(1, columns):
            ways[c] += ways[c - 1]     # from above (the old value) plus from the left
    return ways[columns - 1]
`,
      naive: py`def count_routes(rows, columns):
    if rows == 1 or columns == 1:
        return 1
    return count_routes(rows - 1, columns) + count_routes(rows, columns - 1)
`,
      explain: py`
<p>A route into a cell ends with a move from above or from the left, so the two counts add. The list holds one row of counts. Before it is updated, <code>ways[c]</code> is still the count for the cell above. After the update it is the count for the current cell, ready for the neighbour on its right.</p>
<p>Column 0 is never touched: it stays 1, the single route straight down.</p>
<p><b>Cost:</b> <code>O(rows × columns)</code> time and <code>O(columns)</code> space. The plain recursive version walks every route separately, and there are 48,620 of them on the test lattice.</p>`,
    },
    {
      id: 'z8-jump-game',
      zone: 8,
      order: 9,
      kind: 'code',
      title: 'Signal Hops',
      concept: 'Greedy: keep the farthest reach',
      classic: 'Jump Game (LeetCode #55)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Dynamic programming keeps many answers in case they are needed. A <b>greedy</b> method keeps one. At each step it makes the choice that looks best right now and never goes back on it.</p>
<p>Giving change with ordinary coins works this way: always hand over the biggest coin that still fits.</p>
<pre><code>def fewest(amount):
    count = 0
    for coin in [25, 10, 5, 1]:
        count += amount // coin      # as many of this coin as fit
        amount = amount % coin       # what is still owed
    return count

print(fewest(68))                    # 7</code></pre>
<p>Greedy is fast and short, but it is only right when you can argue that the best-looking choice can never hurt later. With the coins 1, 3 and 4 it fails: for 6 it takes 4 + 1 + 1, although 3 + 3 is better. That was why the coin level needed a table.</p>
<p>The usual shape is a single pass that carries one running value, the best seen so far: the lowest price so far, the latest finish so far, the farthest point so far. For each item you first ask whether it is still in range of what you have, and then use it to improve the running value.</p>
<pre><code>loads = [3, 9, 4, 12, 5]
highest = 0
for load in loads:
    highest = max(highest, load)     # the running best never goes down
print(highest)                       # 12</code></pre>`,
      tools: [
        { key: null, name: 'greedy: one pass, one running best', what: 'Carry a single value that only ever improves. For each item, check it against that value, then update the value. It is right only when a better running value can never make things worse later.', code: py`prices = [7, 3, 8, 2, 9]
lowest = prices[0]
for price in prices:
    lowest = min(lowest, price)
print(lowest)` },
      ],
      task: py`
<p>A message hops along a line of relay towers. The number at each tower is the <b>longest</b> hop it can make forward. It may also make any shorter hop.</p>
<p>Write <code>can_reach(hops)</code>. The message starts at tower 0. Return <code>True</code> if it can reach the last tower, and <code>False</code> if it gets stuck.</p>
<pre><code>can_reach([2, 3, 1, 1, 4])    # True: 0 → 1 → 4
can_reach([3, 2, 1, 0, 4])    # False: every route ends at tower 3</code></pre>
<p>There is always at least one tower. The last test has 900 towers and a step limit.</p>`,
      starter: py`def can_reach(hops):
    pass
`,
      tests: [
        { call: py`can_reach([2, 3, 1, 1, 4])`, expect: py`True` },
        { call: py`can_reach([3, 2, 1, 0, 4])`, expect: py`False` },
        { call: py`can_reach([0])`, expect: py`True` },
        { call: py`can_reach([0, 1])`, expect: py`False` },
        { call: py`can_reach([1, 0])`, expect: py`True` },
        { call: py`can_reach([2, 0, 0])`, expect: py`True` },
        { call: py`can_reach([1, 1, 0, 1])`, expect: py`False` },
        { setup: py`towers = [900] * 900`, call: py`can_reach(towers)`, expect: py`True`, show: py`can_reach([900, 900, ...])   900 towers`, perf: true },
      ],
      hints: [
        py`You do not need to know which route the message takes. You only need to know how far along the line it can get at all.`,
        py`Walk the towers from left to right and carry one number: the farthest tower reachable so far. A tower beyond that number can never be reached, and neither can anything after it.`,
        py`Start with <code>farthest = 0</code>. For each position and hop: if the position is greater than <code>farthest</code>, return <code>False</code>. Otherwise set <code>farthest = max(farthest, position + hop)</code>. If the loop finishes, return <code>True</code>.`,
      ],
      solution: py`def can_reach(hops):
    farthest = 0                                   # the farthest tower we can get to so far
    for position, hop in enumerate(hops):
        if position > farthest:
            return False                           # this tower is out of range, so is the rest
        farthest = max(farthest, position + hop)
    return True
`,
      naive: py`def can_reach(hops):
    reachable = [False] * len(hops)
    reachable[0] = True
    for i in range(len(hops)):
        if reachable[i]:
            for j in range(i + 1, min(len(hops), i + hops[i] + 1)):
                reachable[j] = True
    return reachable[len(hops) - 1]
`,
      explain: py`
<p>Every tower up to <code>farthest</code> is reachable, because a tower may make any hop shorter than its longest one. So one number describes the whole situation, and each reachable tower can only push it further out.</p>
<p>If the walk arrives at a position beyond <code>farthest</code>, nothing behind it can bridge the gap, and the answer is no. If the walk gets through the whole line, the last tower was in range.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(1)</code> space. Marking every tower that every other tower can reach is <code>O(n²)</code>.</p>`,
    },
    {
      id: 'z8-subsets',
      zone: 8,
      order: 10,
      kind: 'code',
      title: 'Every Crew',
      concept: 'Backtracking: choose, explore, undo',
      classic: 'Subsets (LeetCode #78)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Some problems ask for <b>every</b> possibility: every arrangement, every combination, every route. <b>Backtracking</b> builds them one decision at a time. It makes a choice, explores everything that can follow from it, then undoes the choice and tries the next one.</p>
<p>Here it lists every code of a given length made from 0 and 1:</p>
<pre><code>def codes(length):
    found = []
    digits = []

    def build():
        if len(digits) == length:
            found.append("".join(digits))    # one complete code
            return
        for digit in "01":
            digits.append(digit)             # choose
            build()                          # explore
            digits.pop()                     # undo

    build()
    return found

print(codes(2))                              # ['00', '01', '10', '11']</code></pre>
<p>The inner function can see <code>found</code>, <code>digits</code> and <code>length</code> because it is defined inside <code>codes</code>. One shared list is filled in and emptied again as the search goes down and comes back up.</p>
<p>That shared list keeps changing, so when you store a result you must store a <b>copy</b>. <code>items[:]</code> is a slice of the whole list, which is a new list with the same items.</p>
<pre><code>crew = ["ada"]
saved = crew[:]
crew.append("pip")
print(saved, crew)                           # ['ada'] ['ada', 'pip']</code></pre>
<p>To avoid producing the same group twice in a different order, only ever choose items that come <b>after</b> the last one chosen.</p>`,
      tools: [
        { key: 'kw:nested-def', name: 'a function inside a function', what: 'A function defined inside another can read the outer function\'s variables. It is the usual home for the recursive part of a search, with the shared lists kept outside it.', code: py`def count_up_to(limit):
    seen = []

    def visit(n):
        if n > limit:
            return
        seen.append(n)
        visit(n + 1)

    visit(1)
    return seen

print(count_up_to(4))` },
        { key: null, name: 'items[:]', what: 'A slice with both ends left out is a copy of the whole list. Changing the original afterwards does not change the copy.', code: py`path = [1, 2]
snapshot = path[:]
path.pop()
print(snapshot, path)` },
        { key: null, name: 'backtracking: choose, explore, undo', what: 'Add a choice to a shared list, recurse, then remove it with <code>pop()</code> before trying the next choice. Store a copy whenever the list holds a complete answer.', code: py`def pairs(items):
    found = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            found.append([items[i], items[j]])
    return found

print(pairs(["a", "b", "c"]))` },
      ],
      task: py`
<p>Any group of engineers can be sent out as a crew, including nobody at all and everybody at once.</p>
<p>Write <code>subsets(nums)</code>. The numbers in <code>nums</code> are all different. Return a list of every possible group, each group as a list. The groups may come in any order, and each group must appear exactly once.</p>
<pre><code>subsets([1, 2])    # [[], [1], [1, 2], [2]], in any order</code></pre>
<p>Three numbers give 8 groups, four give 16.</p>`,
      starter: py`def subsets(nums):
    pass
`,
      tests: [
        { call: py`sorted(sorted(group) for group in subsets([1, 2, 3]))`, expect: py`[[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]`, show: py`subsets([1, 2, 3])   compared in sorted order` },
        { call: py`subsets([])`, expect: py`[[]]` },
        { call: py`sorted(subsets([0]))`, expect: py`[[], [0]]` },
        { call: py`sorted(sorted(group) for group in subsets([9, 5]))`, expect: py`[[], [5], [5, 9], [9]]`, show: py`subsets([9, 5])   compared in sorted order` },
        { call: py`len(subsets([1, 2, 3, 4, 5]))`, expect: py`32` },
        { call: py`len(set(tuple(sorted(group)) for group in subsets([4, 1, 7, 3])))`, expect: py`16`, show: py`subsets([4, 1, 7, 3]) has 16 different groups` },
      ],
      hints: [
        py`Build a group one member at a time in a shared list. Every state that list passes through, the empty one included, is one of the groups you are asked for.`,
        py`Write an inner function that takes the position to start choosing from. It first stores a copy of the current group. Then, for each later position, it adds that number, calls itself for the positions after it, and removes the number again.`,
        py`Inside <code>choose(start)</code>: <code>found.append(crew[:])</code>, then for <code>i</code> in <code>range(start, len(nums))</code> do <code>crew.append(nums[i])</code>, <code>choose(i + 1)</code>, <code>crew.pop()</code>. Call <code>choose(0)</code> and return <code>found</code>.`,
      ],
      solution: py`def subsets(nums):
    found = []
    crew = []

    def choose(start):
        found.append(crew[:])                  # the crew as it stands is one valid group
        for i in range(start, len(nums)):
            crew.append(nums[i])               # choose
            choose(i + 1)                      # explore, using only later numbers
            crew.pop()                         # undo

    choose(0)
    return found
`,
      explain: py`
<p>Every call records the crew as it stands, then tries to extend it with each number that comes later. Because a crew is only ever extended with later numbers, each group is built in one order only and can never appear twice.</p>
<p>The copy <code>crew[:]</code> is essential. Without it, <code>found</code> would hold the same list many times, and by the end that list is empty again.</p>
<p><b>Cost:</b> there are <code>2ⁿ</code> groups for n numbers, and each takes up to n steps to copy: <code>O(n × 2ⁿ)</code>. No method can do better, because the answer itself is that large.</p>`,
    },
    {
      id: 'z8-trie',
      zone: 8,
      order: 11,
      kind: 'code',
      title: 'Prefix Index',
      concept: 'A trie: dictionaries inside dictionaries',
      classic: 'Implement Trie (LeetCode #208)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A dictionary's values can be dictionaries. That turns a flat table into a <b>tree</b>: each key leads to a smaller dictionary, which leads to smaller ones again.</p>
<p>To walk down such a tree and create the branches that are missing, <code>setdefault()</code> is the tool. It returns the value for a key. If the key is not there yet, it first stores the default you give it.</p>
<pre><code>routes = {}
node = routes
for part in ["north", "relay", "7"]:
    node = node.setdefault(part, {})      # go down, creating the branch if needed
print(routes)          # {'north': {'relay': {'7': {}}}}</code></pre>
<p>The name <code>node</code> is a moving pointer, exactly as with linked lists. It starts at the top and steps one level deeper on every round.</p>
<p>Reading goes the same way, except that a missing key means the path does not exist:</p>
<pre><code>routes = {"north": {"relay": {}}}
node = routes
for part in ["north", "gate"]:
    if part not in node:
        print("no such route")            # printed at "gate"
        break
    node = node[part]</code></pre>
<p>A tree like this, with one character per level, is called a <b>trie</b>. Words that start the same way share the same branch, so asking "does any word start with this?" takes one step per character, however many words are stored.</p>
<p>A path through the tree is not enough to tell a stored word from the beginning of a longer one. Mark the end of each word with a special key.</p>`,
      tools: [
        { key: '.setdefault', name: 'table.setdefault(key, default)', what: 'Returns <code>table[key]</code>. If the key is missing, it stores the default under that key first and returns it. One call instead of "check, then create".', code: py`groups = {}
groups.setdefault("a", []).append("ada")
groups.setdefault("a", []).append("amy")
groups.setdefault("p", []).append("pip")
print(groups)` },
        { key: null, name: 'a dictionary of dictionaries', what: 'Values can be dictionaries, which makes a tree. Keep a name on the current level and move it down with <code>node = node[key]</code>.', code: py`tree = {"a": {"b": {}, "c": {}}}
node = tree["a"]
print(sorted(node))
print("b" in node, "z" in node)` },
      ],
      task: py`
<p>The Core's search index must answer two questions fast: is this exact word stored, and is there any stored word that starts with this text?</p>
<p>Write a class <code>Trie</code> with three methods.</p>
<ul><li><code>insert(word)</code> stores a word.</li><li><code>search(word)</code> returns <code>True</code> only if exactly that word was inserted.</li><li><code>starts_with(prefix)</code> returns <code>True</code> if some inserted word begins with <code>prefix</code>.</li></ul>
<pre><code>index = Trie()
index.insert("apple")
index.search("apple")       # True
index.search("app")         # False: only the beginning of a word
index.starts_with("app")    # True</code></pre>
<p>Words are made of lower-case letters and are never empty.</p>`,
      starter: py`class Trie:
    def __init__(self):
        pass

    def insert(self, word):
        pass

    def search(self, word):
        pass

    def starts_with(self, prefix):
        pass
`,
      tests: [
        { call: py`ops(Trie, ["Trie", "insert", "search", "search", "starts_with", "insert", "search"], [[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]])`, expect: py`[None, None, True, False, True, None, True]` },
        { call: py`ops(Trie, ["Trie", "search", "starts_with"], [[], ["a"], ["a"]])`, expect: py`[None, False, False]` },
        { call: py`ops(Trie, ["Trie", "insert", "insert", "search", "search", "starts_with", "starts_with"], [[], ["relay"], ["relic"], ["rel"], ["relic"], ["rel"], ["rex"]])`, expect: py`[None, None, None, False, True, True, False]` },
        { call: py`ops(Trie, ["Trie", "insert", "search", "starts_with", "search"], [[], ["a"], ["a"], ["a"], ["ab"]])`, expect: py`[None, None, True, True, False]` },
        { call: py`ops(Trie, ["Trie", "insert", "insert", "search", "search", "starts_with"], [[], ["car"], ["card"], ["car"], ["card"], ["cards"]])`, expect: py`[None, None, None, True, True, False]` },
        { call: py`ops(Trie, ["Trie", "insert", "insert", "starts_with", "search"], [[], ["end"], ["bend"], ["en"], ["en"]])`, expect: py`[None, None, None, True, False]` },
      ],
      hints: [
        py`Store the words in a tree of dictionaries with one letter per level. The object needs a single field: the dictionary at the top.`,
        py`Inserting walks down letter by letter and creates the branches that are missing. Searching and prefix checking do the same walk without creating anything, and fail as soon as a letter is missing. They differ only in what they ask once the walk is done.`,
        py`In <code>insert</code>, use <code>node = node.setdefault(letter, {})</code> for each letter, then mark the last node, for example <code>node["end"] = True</code>. A key longer than one character cannot be confused with a letter. <code>search</code> needs the mark, <code>starts_with</code> only needs the walk to succeed.`,
      ],
      solution: py`class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for letter in word:
            node = node.setdefault(letter, {})     # go down, creating the branch if needed
        node["end"] = True                         # a whole word stops here

    def walk(self, text):
        node = self.root
        for letter in text:
            if letter not in node:
                return None                        # the path breaks off
            node = node[letter]
        return node

    def search(self, word):
        node = self.walk(word)
        return node is not None and "end" in node

    def starts_with(self, prefix):
        return self.walk(prefix) is not None
`,
      explain: py`
<p>Each level of the tree holds the letters that can come next, so words with a shared beginning share a path. <code>walk</code> follows a text down the tree and returns the node it arrives at, or <code>None</code> if the path breaks off.</p>
<p>Both questions use that one walk. A prefix only needs the path to exist. An exact word also needs the end mark on its last node. The mark uses a key of three characters, which can never be mistaken for a single letter.</p>
<p><b>Cost:</b> every operation takes one step per character, <code>O(length of the word)</code>, no matter how many words are stored.</p>`,
    },
    {
      id: 'z8-modules',
      zone: 8,
      order: 12,
      kind: 'code',
      title: 'Range Finder',
      concept: 'Modules: import and the math toolbox',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Python comes with a large library of ready-made code, sorted into <b>modules</b>. A module is a file of functions and values that someone has already written and tested. You bring one in with <code>import</code>, and then reach what is inside it with a dot.</p>
<pre><code>import math

print(math.sqrt(49))              # 7.0
print(math.pi)                    # 3.141592653589793</code></pre>
<p>When you need only a few names, import those directly and use them without the prefix. Imports belong at the top of the file, above your functions.</p>
<pre><code>from math import floor, ceil

print(floor(4.7), ceil(4.2))      # 4 5</code></pre>
<p>There are four ways to turn a number with a fraction into a whole number, and they do not agree:</p>
<pre><code>import math

print(math.floor(2.5), math.ceil(2.5), round(2.5), int(2.5))    # 2 3 2 2
print(math.floor(-2.5), math.ceil(-2.5), int(-2.5))             # -3 -2 -2</code></pre>
<p><code>floor</code> always goes down and <code>ceil</code> always goes up. <code>int()</code> cuts the fraction off. <code>round()</code> goes to the nearest whole number, and a tie goes to the even one. Picking the wrong one is a classic source of answers that are off by one.</p>
<p>The library is large: <code>math</code> for numbers, <code>random</code> for chance, <code>collections</code> and <code>heapq</code> for data structures you will meet on higher floors. You do not have to know it by heart. You have to know that it is there, and look before you write something yourself.</p>`,
      tools: [
        { key: 'kw:import', name: 'import module   ·   from module import name', what: 'Brings in a module from Python\'s library. After <code>import math</code> you write <code>math.sqrt</code>. With <code>from math import sqrt</code> you write just <code>sqrt</code>. Put imports at the top of the file.', code: py`import math
from math import floor
print(math.pi > 3, floor(9.99))` },
        { key: 'math.sqrt', name: 'math.sqrt(number)', what: 'The square root, always as a float. <code>number ** 0.5</code> gives the same value.', code: py`import math
print(math.sqrt(81), math.sqrt(2))
print(16 ** 0.5)` },
        { key: 'math.ceil', also: ['math.floor'], name: 'math.ceil(number)   ·   math.floor(number)', what: 'Round up, and round down, to a whole number. Both return an int. Compare <code>round()</code>, which goes to the nearest, and <code>int()</code>, which cuts the fraction off.', code: py`import math
print(math.ceil(7 / 2), math.floor(7 / 2))
print(math.ceil(4.0), math.ceil(-1.5))` },
      ],
      task: py`
<p>A signal travels in a straight line between two towers, and it has to be boosted along the way. Each hop covers at most <code>reach</code> units.</p>
<p>Write <code>hops_needed(ax, ay, bx, by, reach)</code>. The towers stand at <code>(ax, ay)</code> and <code>(bx, by)</code>. Return the smallest whole number of hops that covers the distance between them.</p>
<pre><code>hops_needed(0, 0, 3, 4, 5)     # 1: the distance is exactly 5
hops_needed(0, 0, 3, 4, 2)     # 3: two hops cover only 4 of the 5 units
hops_needed(1, 1, 1, 1, 5)     # 0: the towers are in the same place</code></pre>
<p>The straight-line distance is the square root of <code>dx² + dy²</code>, where <code>dx</code> and <code>dy</code> are the differences between the two x values and between the two y values.</p>`,
      starter: py`def hops_needed(ax, ay, bx, by, reach):
    pass
`,
      tests: [
        { call: py`hops_needed(0, 0, 3, 4, 5)`, expect: py`1` },
        { call: py`hops_needed(0, 0, 3, 4, 2)`, expect: py`3` },
        { call: py`hops_needed(0, 0, 3, 4, 1)`, expect: py`5` },
        { call: py`hops_needed(1, 1, 1, 1, 5)`, expect: py`0` },
        { call: py`hops_needed(0, 0, 1, 1, 1)`, expect: py`2` },
        { call: py`hops_needed(-3, -4, 3, 4, 4)`, expect: py`3` },
        { call: py`hops_needed(2, 10, 2, 3, 7)`, expect: py`1` },
        { call: py`hops_needed(0, 0, 6, 8, 2.5)`, expect: py`4` },
      ],
      hints: [
        py`There are two steps: how far apart are the towers, and how many hops of the given length cover that distance? Each step is one function from the <code>math</code> module.`,
        py`The distance divided by the reach is usually not a whole number. Two and a half hops means three hops. Which of the rounding tools never goes below the true value?`,
        py`Compute <code>math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)</code>, divide it by <code>reach</code>, and return <code>math.ceil(...)</code> of the result. Remember <code>import math</code> at the top.`,
      ],
      solution: py`import math


def hops_needed(ax, ay, bx, by, reach):
    distance = math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
    return math.ceil(distance / reach)        # a part of a hop still costs a whole hop
`,
      explain: py`
<p><code>math.sqrt</code> turns the two differences into the straight-line distance. Squaring removes the sign, so it does not matter which tower comes first.</p>
<p>Dividing by the reach gives the number of hops as a float, and <code>math.ceil</code> rounds it up, because a part of a hop still needs a whole one. For a distance of 5 and a reach of 2, both <code>round()</code> and <code>int()</code> would answer 2, which leaves the last unit uncovered.</p>
<p><b>Cost:</b> a fixed number of operations: <code>O(1)</code>.</p>`,
    },
    {
      id: 'z8-single-number',
      zone: 8,
      order: 13,
      kind: 'code',
      title: 'Lone Signal',
      concept: 'Bit operations and XOR',
      classic: 'Single Number (LeetCode #136)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Inside the machine every whole number is a row of <b>bits</b>: switches that are 0 or 1. <code>bin()</code> shows the row, and a number written with <code>0b</code> in front is read as bits.</p>
<pre><code>print(bin(12), bin(10))      # 0b1100 0b1010
print(0b1100 + 1)            # 13</code></pre>
<p>Four operators work on those rows directly, one position at a time:</p>
<pre><code>print(bin(12 &amp; 10))          # 0b1000: 1 where both have a 1
print(bin(12 | 10))          # 0b1110: 1 where at least one has a 1
print(bin(12 ^ 10))          # 0b110:  1 where exactly one has a 1
print(1 &lt;&lt; 3, 40 &gt;&gt; 2)        # 8 10:   the row shifted left or right</code></pre>
<p>The third one, <code>^</code>, is called XOR ("exclusive or"). Think of it as a toggle: it flips exactly the bits that are set in the other number. Flip them a second time and you are back where you started.</p>
<pre><code>flags = 0
flags ^= 0b0100              # switch 2 on
flags ^= 0b0001              # switch 0 on
flags ^= 0b0100              # switch 2 again: off
print(bin(flags))            # 0b1</code></pre>
<p>Three facts follow. Anything XOR itself is 0. Anything XOR 0 is unchanged. And in a chain of XORs the order does not matter.</p>
<pre><code>print(7 ^ 7, 7 ^ 0, 5 ^ 9 ^ 5)    # 0 7 9</code></pre>
<p>Two more idioms you will meet in other people's code: <code>n &amp; 1</code> is 1 for an odd number, and <code>1 &lt;&lt; k</code> is the number with only bit k set.</p>`,
      tools: [
        { key: 'kw:bits', name: 'a & b   ·   a | b   ·   a ^ b', what: 'Work on the bits of two whole numbers, position by position. <b>and</b> keeps the bits set in both, <b>or</b> keeps the bits set in either, <b>xor</b> keeps the bits set in exactly one.', code: py`print(6 & 3, 6 | 3, 6 ^ 3)
print(bin(6), bin(3), bin(6 ^ 3))` },
        { key: 'kw:xor', name: 'x ^= value', what: 'XOR as a toggle. Doing it twice with the same value undoes it: <code>x ^ v ^ v</code> is <code>x</code> again. A value XOR itself is 0.', code: py`x = 9
x ^= 5
print(x)
x ^= 5
print(x, 4 ^ 4)` },
        { key: 'kw:shift', name: 'a << k   ·   a >> k', what: 'Move the bits k places to the left (doubling the number k times) or to the right (halving it k times and dropping the remainder).', code: py`print(1 << 4, 5 << 1)
print(40 >> 1, 7 >> 1)` },
        { key: 'bin', name: 'bin(number)', what: 'The bits of a whole number, as a string that starts with <code>0b</code>. The other way round is <code>int("101", 2)</code>.', code: py`print(bin(5), bin(8))
print(int("101", 2))` },
      ],
      task: py`
<p>Every part in the bin was delivered as a matching pair. One part has lost its twin.</p>
<p>Write <code>lone_part(codes)</code>. Every number in <code>codes</code> appears exactly twice, except for one that appears once. Return that one.</p>
<pre><code>lone_part([2, 2, 1])           # 1
lone_part([4, 1, 2, 1, 2])     # 4</code></pre>
<p>The list is never empty, and twins are not necessarily next to each other. The last test has 801 codes and a step limit, so comparing every code with every other one is too slow.</p>`,
      starter: py`def lone_part(codes):
    pass
`,
      tests: [
        { call: py`lone_part([2, 2, 1])`, expect: py`1` },
        { call: py`lone_part([4, 1, 2, 1, 2])`, expect: py`4` },
        { call: py`lone_part([1])`, expect: py`1` },
        { call: py`lone_part([0, 7, 0])`, expect: py`7` },
        { call: py`lone_part([-3, 5, -3])`, expect: py`5` },
        { call: py`lone_part([9, 0, 9])`, expect: py`0` },
        { setup: py`codes = list(range(400)) + [7777] + list(range(400))`, call: py`lone_part(codes)`, expect: py`7777`, show: py`lone_part([0, 1, 2, ..., 7777, ..., 399])   801 codes`, perf: true },
      ],
      hints: [
        py`You could count how often each code appears, and that works. But think about what happens to a pair when everything is combined with one of the bit operators.`,
        py`A number XOR itself is 0, and the order of XORs does not matter. So in one long chain of XORs, every pair wipes itself out.`,
        py`Start with <code>lone = 0</code>. For every code, do <code>lone ^= code</code>. What is left at the end is the code without a twin.`,
      ],
      solution: py`def lone_part(codes):
    lone = 0
    for code in codes:
        lone ^= code          # twins cancel each other out
    return lone
`,
      naive: py`def lone_part(codes):
    for i in range(len(codes)):
        twin = False
        for j in range(len(codes)):
            if i != j and codes[i] == codes[j]:
                twin = True
        if not twin:
            return codes[i]
`,
      explain: py`
<p>XOR-ing all the codes together gives the same result as XOR-ing each pair first, because the order does not matter. Every pair gives 0, and 0 changes nothing, so the one code without a twin is all that remains.</p>
<p>A dictionary of counts or a set would also find it in one pass. This version needs no extra memory at all: one number, however long the list.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(1)</code> space.</p>`,
    },
    {
      id: 'z8-validate-bst',
      zone: 8,
      order: 14,
      kind: 'code',
      title: 'Ordered Branches',
      concept: 'Binary search trees',
      classic: 'Validate Binary Search Tree (LeetCode #98)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A <b>binary search tree</b> is a binary tree that keeps its values in order. For <b>every</b> node, all the values in its left subtree are smaller than the node, and all the values in its right subtree are larger. The rule is about whole subtrees, not just about the two children.</p>
<pre><code>        8
       / \
      3   10
     / \    \
    1   6    14</code></pre>
<p>That order is what makes searching fast. At each node one comparison tells you which side the target must be on, and the other side is never visited. It is binary search with nodes instead of indexes:</p>
<pre><code>def find(node, target):
    while node is not None:
        if target == node.val:
            return True
        if target &lt; node.val:
            node = node.left
        else:
            node = node.right
    return False

root = tree([8, 3, 10, 1, 6, None, 14])
print(find(root, 6), find(root, 7))      # True False</code></pre>
<p>A recursive function can carry extra arguments down the tree. Each call passes on what its children need to know, changed a little for each side:</p>
<pre><code>def show(node, depth):
    if node is None:
        return
    print("  " * depth + str(node.val))
    show(node.left, depth + 1)
    show(node.right, depth + 1)

show(tree([8, 3, 10]), 0)                # 8, then 3 and 10 indented</code></pre>
<p>Two handy values for "no limit yet": <code>float("inf")</code> is larger than every number, and <code>float("-inf")</code> is smaller than every number. Python also lets you chain comparisons: <code>low &lt; value &lt; high</code>.</p>`,
      tools: [
        { key: null, name: 'binary search tree', what: 'A binary tree in which, for every node, everything in the left subtree is smaller and everything in the right subtree is larger. A search follows one path down: compare, then go left or right.', code: py`root = tree([8, 3, 10, 1, 6])
node = root
while node is not None and node.val != 6:
    if 6 < node.val:
        node = node.left
    else:
        node = node.right
print(node)` },
        { key: 'kw:chained-compare', name: 'low < value < high', what: 'Comparisons can be chained. The result is true only when every part is true, exactly like <code>low &lt; value and value &lt; high</code>.', code: py`value = 5
print(1 < value < 10, 1 < value < 5, 0 <= value <= 5)` },
        { key: 'kw:infinity', name: 'float("inf")   ·   float("-inf")', what: 'Larger than every number, and smaller than every number. Use them as a starting value when there is no limit yet.', code: py`lowest = float("inf")
for reading in [7, 3, 9]:
    lowest = min(lowest, reading)
print(lowest, float("-inf") < -10 ** 9)` },
      ],
      task: py`
<p>The Works keeps its part numbers in a binary search tree. A tree that breaks the rule gives wrong answers without raising any error, so every tree is inspected before it is used.</p>
<p>Write <code>is_search_tree(root)</code>. <code>root</code> is a <code>TreeNode</code>, or <code>None</code> for an empty tree. Return <code>True</code> if, for every node, all the values in its left subtree are smaller and all the values in its right subtree are larger. Equal values are not allowed.</p>
<pre><code>is_search_tree(tree([2, 1, 3]))                       # True
is_search_tree(tree([5, 1, 4, None, None, 3, 6]))     # False: 4 sits to the right of 5</code></pre>
<p>An empty tree is valid.</p>`,
      starter: py`def is_search_tree(root):
    pass
`,
      tests: [
        { call: py`is_search_tree(tree([2, 1, 3]))`, expect: py`True` },
        { call: py`is_search_tree(tree([5, 1, 4, None, None, 3, 6]))`, expect: py`False` },
        { call: py`is_search_tree(tree([]))`, expect: py`True` },
        { call: py`is_search_tree(tree([1]))`, expect: py`True` },
        { call: py`is_search_tree(tree([5, 4, 6, None, None, 3, 7]))`, expect: py`False` },
        { call: py`is_search_tree(tree([2, 2, 2]))`, expect: py`False` },
        { call: py`is_search_tree(tree([8, 3, 10, 1, 6, None, 14, None, None, 4, 7]))`, expect: py`True` },
        { call: py`is_search_tree(tree([10, 5, 15, 2, 12]))`, expect: py`False` },
        { call: py`is_search_tree(tree([0, -5, 3, None, -2]))`, expect: py`True` },
      ],
      hints: [
        py`Checking each node against its two children is not enough. A value deep in the left subtree can be larger than its own parent, as it should be, and still be too large for a node higher up.`,
        py`On the way down, every node inherits a range it must stay inside. Going left tightens the upper end of the range to the current value. Going right tightens the lower end.`,
        py`Write a helper function <code>within(node, low, high)</code>. An empty node is fine. A node whose value is not strictly between <code>low</code> and <code>high</code> fails. Otherwise check the left child with <code>(low, node.val)</code> and the right child with <code>(node.val, high)</code>. Start with <code>float("-inf")</code> and <code>float("inf")</code>.`,
      ],
      solution: py`def within(node, low, high):
    if node is None:
        return True
    if not low < node.val < high:
        return False
    return within(node.left, low, node.val) and within(node.right, node.val, high)


def is_search_tree(root):
    return within(root, float("-inf"), float("inf"))
`,
      explain: py`
<p>Every node must fit inside a range set by its ancestors. The root may hold anything. Going left, the parent's value becomes the upper limit. Going right, it becomes the lower limit. The limits collected on the way down are exactly the whole-subtree rule.</p>
<p>The chained comparison is strict on both sides, so equal values are rejected. <code>and</code> stops at the first subtree that fails, so the rest of the tree is not visited.</p>
<p><b>Cost:</b> <code>O(n)</code> time: each node is checked once. The stack of waiting calls is as tall as the tree.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
