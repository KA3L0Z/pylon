/* Pylon levels, zone 6: Summit Core. Advanced Python features and hard classics, the final floor.
   Format and field notes: tools/level-example.js. Validate with: python tools/check_levels.py 6 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z6-fibonacci-generator',
      zone: 6,
      order: 1,
      kind: 'code',
      title: 'The Endless Pulse',
      concept: 'Generators and yield',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The Summit Core's oscillator never stops, so no list can hold its output. You need a function that hands out one value at a time, on request.</p>
<p>Any function that contains <code>yield</code> is a <b>generator function</b>. Calling it runs none of its body and returns a generator object. Each call to <code>next</code> runs the body up to the next <code>yield</code>, hands back that value and pauses, keeping every local variable. This is <b>lazy</b> evaluation: nothing is computed until someone asks.</p>
<pre><code>from itertools import islice

def countdown(n):
    while n &gt; 0:
        yield n
        n -= 1

gen = countdown(3)
print(next(gen), next(gen))             # 3 2
for n in countdown(3):
    print(n)                            # 3, then 2, then 1
print(list(islice(countdown(100), 4)))  # [100, 99, 98, 97]</code></pre>
<p>A <code>for</code> loop calls <code>next</code> for you and ends when the function body finishes. <code>islice</code> takes only the first few values, so the other 96 are never computed.</p>
<p>If the body loops with <code>while True</code>, the generator never ends. That is fine, because the caller decides when to stop asking. Engineers use generators to read huge files line by line, to page through query results, and to model streams with no known end.</p>`,
      task: py`
<p>Write <code>fibonacci()</code>, a generator function with no arguments that yields the Fibonacci numbers without end: first 0, then 1, then each new number is the sum of the two before it.</p>
<pre><code>from itertools import islice

gen = fibonacci()
next(gen)                       # 0
next(gen)                       # 1
next(gen)                       # 1
list(islice(fibonacci(), 8))    # [0, 1, 1, 2, 3, 5, 8, 13]</code></pre>
<p>Every call to <code>fibonacci()</code> starts a fresh sequence at 0. The generator must never finish on its own. One test checks that you return a real generator, so a list will not pass.</p>`,
      starter: py`def fibonacci():
    # Keep two numbers. Yield one, then step both forward. Never stop.
    pass
`,
      tests: [
        {
          setup: py`from itertools import islice`,
          call: py`list(islice(fibonacci(), 8))`,
          expect: py`[0, 1, 1, 2, 3, 5, 8, 13]`,
        },
        {
          setup: py`gen = fibonacci()`,
          call: py`[next(gen), next(gen), next(gen), next(gen)]`,
          expect: py`[0, 1, 1, 2]`,
          show: py`gen = fibonacci(), then [next(gen), next(gen), next(gen), next(gen)]`,
        },
        { call: py`type(fibonacci()).__name__`, expect: py`'generator'` },
        {
          setup: py`total = 0
for value in fibonacci():
    if value > 100:
        break
    total += value`,
          call: py`total`,
          expect: py`232`,
          show: py`total of the values up to 100, read with a for loop that breaks`,
        },
        {
          setup: py`a = fibonacci()
skipped = [next(a) for _ in range(6)]
b = fibonacci()`,
          call: py`[next(a), next(b)]`,
          expect: py`[8, 0]`,
          show: py`six values taken from a, then [next(a), next(b)] where b = fibonacci() is new`,
        },
        {
          setup: py`from itertools import islice`,
          call: py`list(islice(fibonacci(), 61))[60]`,
          expect: py`1548008755920`,
        },
      ],
      hints: [
        py`A generator function looks like a normal function that uses <code>yield</code> where you would otherwise append to a list. This sequence has no end, so the loop inside has no end either.`,
        py`Keep two variables: the current number and the one after it. Inside <code>while True</code>, yield the current number, then move both variables one position along the sequence.`,
        py`Start with <code>a, b = 0, 1</code>. In the loop, <code>yield a</code>, then update both at once with <code>a, b = b, a + b</code>.`,
      ],
      solution: py`def fibonacci():
    a, b = 0, 1            # the current number and the one after it
    while True:
        yield a            # hand out the current number, then pause
        a, b = b, a + b    # on the next request, step both forward
`,
      explain: py`
<p>The generator keeps its whole state in two variables. Each request runs one trip around the loop: <code>yield a</code> hands out the current number and pauses, and the next request resumes on the following line, where the pair moves one step along the sequence. The tuple assignment works out both new values before storing either, so no temporary variable is needed.</p>
<p>The loop never ends, and that is safe: a generator only runs while someone is asking for a value.</p>
<p><b>Cost:</b> <code>O(1)</code> time per value, one addition, and <code>O(1)</code> space however far the caller goes. The main alternative, returning a list of the first <code>n</code> numbers, needs <code>n</code> in advance and <code>O(n)</code> memory.</p>`,
    },

    {
      id: 'z6-memoize-decorator',
      zone: 6,
      order: 2,
      kind: 'code',
      title: 'The Relay That Remembers',
      concept: 'Closures and decorators',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The core's relays answer slowly, so the tower should never ask them the same question twice. You have cached results in a dictionary by hand before. A decorator lets you write that cache once and attach it to any function.</p>
<p>It rests on <b>closures</b>. A function defined inside another function keeps access to the outer function's variables, even after the outer call has returned:</p>
<pre><code>def make_log():
    lines = []                   # lives on between calls
    def log(text):
        lines.append(text)
        return len(lines)
    return log

log = make_log()
print(log('boot'), log('scan'))  # 1 2</code></pre>
<p>A <b>decorator</b> is a function that takes a function and returns a replacement. Writing <code>@shout</code> above a <code>def</code> is short for <code>greet = shout(greet)</code>:</p>
<pre><code>def shout(fn):
    def wrapper(*args):          # all the arguments, as a tuple
        return fn(*args).upper()
    return wrapper

@shout
def greet(name):
    return 'hello ' + name

print(greet('pip'))              # HELLO PIP</code></pre>
<p>The wrapper is a closure, so it can also keep state between calls, the way <code>log</code> keeps <code>lines</code>. Engineers use decorators for caching, timing, logging, retries and permission checks: behaviour that wraps many functions the same way.</p>`,
      task: py`
<p>Write a decorator <code>memoize(fn)</code>. It returns a new function that gives the same results as <code>fn</code> but runs <code>fn</code> only once for each distinct tuple of positional arguments. A repeated call returns the stored result without running <code>fn</code> again.</p>
<pre><code>calls = []

@memoize
def square(n):
    calls.append(n)
    return n * n

square(4)    # 16
square(4)    # 16, straight from the cache
calls        # [4]</code></pre>
<p>Arguments are always positional and hashable (numbers, strings, tuples). Each decorated function needs its own cache. Results such as <code>0</code>, <code>False</code> and <code>None</code> must be cached like any other.</p>
<p>The last test decorates a recursive function that asks for the same arguments over and over, under a step limit, so every lookup has to be a single dictionary step.</p>`,
      starter: py`def memoize(fn):
    # Make one cache dict here. Define and return a wrapper(*args).
    pass
`,
      tests: [
        {
          setup: py`calls = []

@memoize
def square(n):
    calls.append(n)
    return n * n`,
          call: py`[square(4), square(4), square(5), square(4)]`,
          expect: py`[16, 16, 25, 16]`,
        },
        {
          setup: py`calls = []

@memoize
def square(n):
    calls.append(n)
    return n * n

results = [square(4), square(4), square(5), square(4)]`,
          call: py`calls`,
          expect: py`[4, 5]`,
          show: py`calls, after square(4), square(4), square(5), square(4)`,
        },
        {
          setup: py`calls = []

@memoize
def power(base, exponent):
    calls.append((base, exponent))
    return base ** exponent

results = [power(2, 5), power(5, 2), power(2, 3), power(3, 2), power(2, 5)]`,
          call: py`[results, calls]`,
          expect: py`[[32, 25, 8, 9, 32], [(2, 5), (5, 2), (2, 3), (3, 2)]]`,
          show: py`[results, calls] after power(2, 5), power(5, 2), power(2, 3), power(3, 2), power(2, 5)`,
        },
        {
          setup: py`calls = []

@memoize
def fault_code(sector):
    calls.append(sector)
    if sector == 'north':
        return 0
    if sector == 'east':
        return False
    return None

sectors = ['north', 'east', 'west', 'north', 'east', 'west']
results = [fault_code(s) for s in sectors]`,
          call: py`[results, calls]`,
          expect: py`[[0, False, None, 0, False, None], ['north', 'east', 'west']]`,
          show: py`[results, calls] for a function that returns 0, False or None, asked twice per sector`,
        },
        {
          setup: py`@memoize
def double(n):
    return 2 * n

@memoize
def triple(n):
    return 3 * n`,
          call: py`[double(7), triple(7), double(7), triple(7)]`,
          expect: py`[14, 21, 14, 21]`,
          show: py`[double(7), triple(7), double(7), triple(7)] with both functions decorated`,
        },
        {
          setup: py`calls = []

@memoize
def fib(n):
    calls.append(n)
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)`,
          call: py`[fib(20), len(calls)]`,
          expect: py`[6765, 21]`,
          show: py`[fib(20), len(calls)] for a recursive fib decorated with @memoize`,
        },
        {
          setup: py`@memoize
def routes(rows, cols):
    if rows == 0 or cols == 0:
        return 1
    return routes(rows - 1, cols) + routes(rows, cols - 1)`,
          call: py`routes(24, 24)`,
          expect: py`32247603683100`,
          show: py`routes(24, 24) for a recursive grid-route counter decorated with @memoize`,
          perf: true,
        },
      ],
      hints: [
        py`The cache has to outlive a single call. Find the place where a dictionary is created once per decorated function and is still there the next time that function is called.`,
        py`Inside <code>memoize</code>, create an empty dictionary, then define <code>wrapper(*args)</code>. The tuple <code>args</code> is hashable, so it can be the dictionary key. Return <code>wrapper</code> itself, without calling it.`,
        py`In <code>wrapper</code>: if <code>args</code> is not in the cache, store <code>fn(*args)</code> under that key. Then return <code>cache[args]</code>. Test with <code>in</code> and never with the stored value, or results like <code>0</code> and <code>None</code> get computed again.`,
      ],
      solution: py`def memoize(fn):
    cache = {}                    # args tuple -> result, per function

    def wrapper(*args):
        if args not in cache:     # first call with these arguments
            cache[args] = fn(*args)
        return cache[args]

    return wrapper
`,
      naive: py`def memoize(fn):
    seen = []                     # (args, result) pairs

    def wrapper(*args):
        # Correct, but every call searches the list from the start.
        for key, value in seen:
            if key == args:
                return value
        result = fn(*args)
        seen.append((args, result))
        return result

    return wrapper
`,
      explain: py`
<p><code>memoize</code> runs once for each function it decorates, so each function gets its own <code>cache</code>. The <code>wrapper</code> closure keeps that dictionary and <code>fn</code> alive between calls.</p>
<p>The arguments arrive as a tuple, which is hashable, so the tuple is the key. The test <code>args not in cache</code> asks whether the key exists and ignores what is stored under it, so results like <code>0</code> and <code>None</code> stay cached. Recursion benefits too: the function's name now refers to the wrapper, so every inner call goes through the cache.</p>
<p><b>Cost:</b> <code>O(1)</code> extra time per call, plus one stored result per distinct argument tuple. A list of past calls, searched on every call, is also correct but costs <code>O(n)</code> per lookup. The standard library ships this decorator as <code>functools.cache</code>, and as <code>functools.lru_cache</code> when the cache needs a size limit.</p>`,
    },

    {
      id: 'z6-vector-class',
      zone: 6,
      order: 3,
      kind: 'code',
      title: 'Aim the Antenna',
      concept: 'Special methods (dunders)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The beacon's aiming system adds and scales 2D offsets constantly, and calls like <code>add(a, b)</code> pile up fast. Python lets your own class answer to <code>+</code>, <code>==</code>, <code>abs()</code> and <code>repr()</code> through <b>special methods</b>, also called dunder methods after the double underscores around their names.</p>
<pre><code>class Money:
    def __init__(self, cents):
        self.cents = cents
    def __repr__(self):               # repr(m) and print(m)
        return f'Money({self.cents})'
    def __eq__(self, other):          # m == other
        return self.cents == other.cents
    def __hash__(self):               # sets and dict keys
        return hash(self.cents)
    def __add__(self, other):         # m + other
        return Money(self.cents + other.cents)

print(Money(250) + Money(50))         # Money(300)</code></pre>
<p>You never call these yourself. Python turns <code>a + b</code> into <code>a.__add__(b)</code>, <code>a * 3</code> into <code>a.__mul__(3)</code> and <code>abs(a)</code> into <code>a.__abs__()</code>. An operator should return a new object and leave its operands alone.</p>
<p>Without <code>__eq__</code>, two objects are equal only if they are the same object. Once you define it, define <code>__hash__</code> from the same fields, so that equal objects count once in a set. Engineers do this for value types: money, coordinates, dates, version numbers.</p>`,
      task: py`
<p>Write a class <code>Vector</code> for 2D vectors with number coordinates <code>x</code> and <code>y</code>:</p>
<ul>
<li><code>Vector(x, y)</code> stores both coordinates.</li>
<li><code>repr(v)</code> returns text such as <code>Vector(1, 2)</code>.</li>
<li><code>v == w</code> is <code>True</code> when both coordinates match and <code>False</code> otherwise.</li>
<li>Equal vectors have equal hashes, so they count once in a set.</li>
<li><code>v + w</code> returns a new vector, added coordinate by coordinate.</li>
<li><code>v * k</code> returns a new vector with both coordinates multiplied by the number <code>k</code>.</li>
<li><code>abs(v)</code> returns the length as a float: the square root of x² + y².</li>
</ul>
<pre><code>Vector(1, 2) + Vector(3, 4) == Vector(4, 6)   # True
repr(Vector(1, 2))                            # 'Vector(1, 2)'
abs(Vector(3, 4))                             # 5.0
Vector(1, 2) * 3 == Vector(3, 6)              # True
len({Vector(1, 2), Vector(1, 2)})             # 1</code></pre>
<p>Only <code>vector * number</code> is needed, with the vector on the left. No operation may change the vectors it is given.</p>`,
      starter: py`class Vector:
    # Each method below answers one piece of syntax, such as v + w.
    def __init__(self, x, y):
        pass

    def __repr__(self):
        pass

    def __eq__(self, other):
        pass

    def __hash__(self):
        pass

    def __add__(self, other):
        pass

    def __mul__(self, number):
        pass

    def __abs__(self):
        pass
`,
      tests: [
        { call: py`Vector(1, 2) + Vector(3, 4) == Vector(4, 6)`, expect: py`True` },
        { call: py`repr(Vector(1, 2))`, expect: py`'Vector(1, 2)'` },
        { call: py`abs(Vector(3, 4))`, expect: py`5.0` },
        { call: py`Vector(1, 2) * 3 == Vector(3, 6)`, expect: py`True` },
        { call: py`len({Vector(1, 2), Vector(1, 2)})`, expect: py`1` },
        {
          call: py`[Vector(1, 2) == Vector(1, 2), Vector(1, 2) == Vector(2, 1), Vector(1, 2) == Vector(1, 5)]`,
          expect: py`[True, False, False]`,
        },
        {
          setup: py`a = Vector(1, 2)
b = Vector(3, 4)`,
          call: py`[repr(a + b), repr(a * 10), repr(a), repr(b)]`,
          expect: py`['Vector(4, 6)', 'Vector(10, 20)', 'Vector(1, 2)', 'Vector(3, 4)']`,
          show: py`a = Vector(1, 2), b = Vector(3, 4), then [repr(a + b), repr(a * 10), repr(a), repr(b)]`,
        },
        {
          call: py`[abs(Vector(-6, 8)), abs(Vector(0, 0)), len({Vector(0, 5), Vector(5, 0), Vector(0, 5)})]`,
          expect: py`[10.0, 0.0, 2]`,
        },
      ],
      hints: [
        py`Each requirement maps to exactly one special method. Python turns <code>v + w</code> into <code>v.__add__(w)</code> and <code>abs(v)</code> into <code>v.__abs__()</code>.`,
        py`<code>__add__</code> and <code>__mul__</code> build and return a <b>new</b> <code>Vector</code>. <code>__eq__</code> compares both coordinates. <code>__hash__</code> must be computed from those same two coordinates, so equal vectors hash alike.`,
        py`<code>__repr__</code> returns the f-string <code>f'Vector({self.x}, {self.y})'</code>. <code>__hash__</code> returns <code>hash((self.x, self.y))</code>. <code>__abs__</code> returns <code>math.sqrt(self.x ** 2 + self.y ** 2)</code>.`,
      ],
      solution: py`import math


class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Vector({self.x}, {self.y})'

    def __eq__(self, other):
        if not isinstance(other, Vector):    # never equal to another type
            return False
        return self.x == other.x and self.y == other.y

    def __hash__(self):
        return hash((self.x, self.y))        # same fields as __eq__

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, number):
        return Vector(self.x * number, self.y * number)

    def __abs__(self):
        return math.sqrt(self.x ** 2 + self.y ** 2)
`,
      explain: py`
<p>Each method answers one piece of syntax. <code>__add__</code> and <code>__mul__</code> build a new <code>Vector</code>, so the operands stay untouched, the way numbers behave under <code>+</code> and <code>*</code>.</p>
<p><code>__eq__</code> compares by value, and <code>__hash__</code> hashes a tuple of the same two fields. That pairing is the rule to remember: objects that compare equal must have equal hashes, or a set will file them as different members. The <code>isinstance</code> check makes a comparison with any other type return <code>False</code> where it would otherwise raise an error.</p>
<p><b>Cost:</b> every method takes <code>O(1)</code> time and space. To allow <code>3 * v</code>, with the number on the left, add <code>__rmul__</code>. The main alternative is a plain tuple <code>(x, y)</code>: it already compares and hashes by value, but <code>+</code> joins tuples end to end and nothing names what the pair means.</p>`,
    },

    {
      id: 'z6-course-schedule',
      zone: 6,
      order: 4,
      kind: 'code',
      title: 'Start-up Order',
      concept: 'Graphs: adjacency lists and cycles',
      classic: 'Course Schedule (LeetCode #207)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The Summit Core boots in modules, and some modules need others running first. Such relations form a <b>directed graph</b>: nodes joined by one-way edges.</p>
<p>Store a graph as an <b>adjacency list</b>: for each node, the nodes its edges point to. The pass that builds it can also count each node's <b>in-degree</b>, the number of edges arriving at it:</p>
<pre><code>n = 4
# each pair (a, b) is an edge from a to b
edges = [(0, 1), (0, 2), (1, 3), (2, 3)]
graph = [[] for _ in range(n)]
indegree = [0] * n
for a, b in edges:
    graph[a].append(b)
    indegree[b] += 1
print(graph)       # [[1, 2], [3], [3], []]
print(indegree)    # [0, 1, 1, 2]</code></pre>
<p>When an edge means "comes before", a node with in-degree 0 waits for nothing and can go first. Removing it lowers the in-degree of each node it points to, and some of those reach 0 in turn. Repeat to get a <b>topological order</b>: every node after everything it needs. If nodes remain but none has in-degree 0, they wait on each other in a <b>cycle</b>.</p>
<p>Build tools, package installers and spreadsheets order their work this way.</p>`,
      task: py`
<p>The classic form of this problem talks about courses, so the function does too. Courses are numbered from <code>0</code> to <code>num_courses - 1</code>. Each pair <code>[a, b]</code> in <code>prerequisites</code> says that course <code>b</code> has to be finished before course <code>a</code> can start.</p>
<p>Write <code>can_finish(num_courses, prerequisites)</code>. Return <code>True</code> if every course can be finished in some order, and <code>False</code> if the prerequisites make that impossible.</p>
<pre><code>can_finish(2, [[1, 0]])            # True
can_finish(2, [[1, 0], [0, 1]])    # False</code></pre>
<p>In the first call you finish course 0, then course 1. In the second, each course waits for the other. A course can have several prerequisites or none, and no pair appears twice.</p>`,
      starter: py`def can_finish(num_courses, prerequisites):
    # Build a graph, count prerequisites, take courses that reach 0.
    pass
`,
      tests: [
        { call: py`can_finish(2, [[1, 0]])`, expect: py`True` },
        { call: py`can_finish(2, [[1, 0], [0, 1]])`, expect: py`False` },
        { call: py`can_finish(3, [])`, expect: py`True` },
        { call: py`can_finish(4, [[1, 0], [2, 0], [3, 1], [3, 2]])`, expect: py`True` },
        { call: py`can_finish(4, [[1, 0], [2, 1], [3, 2], [1, 3]])`, expect: py`False` },
        { call: py`can_finish(5, [[1, 0], [3, 2], [4, 3], [2, 4]])`, expect: py`False` },
        { call: py`can_finish(6, [[3, 0], [3, 1], [4, 3], [5, 3], [5, 2]])`, expect: py`True` },
      ],
      hints: [
        py`Draw each pair as an arrow from the prerequisite to the course that needs it. Every course can be finished exactly when those arrows never lead around in a loop.`,
        py`Build an adjacency list and count, for each course, how many prerequisites it still waits for. A course with a count of 0 can be taken now. Taking it lowers the count of every course that needed it.`,
        py`Put every course with count 0 in a <code>deque</code>. Pop a course, add 1 to a <code>finished</code> counter, and lower the count of each course in <code>graph[course]</code>, appending any that reach 0. At the end return <code>finished == num_courses</code>.`,
      ],
      solution: py`from collections import deque


def can_finish(num_courses, prerequisites):
    # graph[b] lists the courses that need b.
    # waiting[c] counts the prerequisites c has not finished yet.
    graph = [[] for _ in range(num_courses)]
    waiting = [0] * num_courses
    for course, needed in prerequisites:
        graph[needed].append(course)
        waiting[course] += 1

    # Start with every course that waits for nothing.
    ready = deque([c for c in range(num_courses) if waiting[c] == 0])
    finished = 0
    while ready:
        done = ready.popleft()
        finished += 1
        for course in graph[done]:
            waiting[course] -= 1
            if waiting[course] == 0:      # its last prerequisite is done
                ready.append(course)

    # A course on a cycle never reaches 0, so it is never counted.
    return finished == num_courses
`,
      explain: py`
<p>Each pair becomes an edge from the prerequisite to the course that needs it, and <code>waiting</code> holds every course's in-degree. A course with nothing left to wait for can be taken. Taking it frees one prerequisite of each course it points to, and some of those become ready in turn.</p>
<p>A course on a cycle can never reach 0, because through the cycle it waits on itself. So if the queue empties before every course has been counted, a cycle exists.</p>
<p><b>Cost:</b> <code>O(V + E)</code> time and space for <code>V</code> courses and <code>E</code> pairs. Every course is queued at most once and every edge is followed once. The main alternative is a depth-first search that marks each course as unvisited, in progress or done, and reports a cycle when it reaches a course that is still in progress.</p>`,
    },

    {
      id: 'z6-permutations',
      zone: 6,
      order: 5,
      kind: 'code',
      title: 'Every Firing Order',
      concept: 'Backtracking: choose, explore, undo',
      classic: 'Permutations (LeetCode #46)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The beacon's emitters can fire in any order, and the core wants every order tested. Listing every arrangement of something calls for <b>backtracking</b>: build a candidate one choice at a time, and when a branch is finished, undo the last choice and try the next option.</p>
<p>The loop of a backtracking function has three beats: choose, explore, un-choose. This one lists every pattern of <code>n</code> bits:</p>
<pre><code>def bits(n, path, results):
    if len(path) == n:
        results.append(path[:])    # save a copy
        return
    for bit in (0, 1):
        path.append(bit)           # choose
        bits(n, path, results)     # explore
        path.pop()                 # un-choose

results = []
bits(2, [], results)
print(results)    # [[0, 0], [0, 1], [1, 0], [1, 1]]</code></pre>
<p>Every call works on the same <code>path</code> list. That is why a finished path is saved as a copy: the original keeps changing. Each <code>pop</code> restores <code>path</code> exactly, so the next option starts from a clean state.</p>
<p>Engineers use this pattern for puzzle solvers, schedulers and configuration search, where you try combinations and can abandon a branch early.</p>`,
      task: py`
<p>Write <code>permute(nums)</code>. <code>nums</code> is a list of 1 to 6 distinct integers. Return a list containing every possible ordering of them, each ordering as its own list. The orderings may come in any order.</p>
<pre><code>permute([1, 2, 3])
# [[1, 2, 3], [1, 3, 2], [2, 1, 3],
#  [2, 3, 1], [3, 1, 2], [3, 2, 1]]
permute([0, 1])    # [[0, 1], [1, 0]]</code></pre>
<p>Python already ships this as <code>itertools.permutations</code>. The point here is to build it by hand with backtracking, so leave that import out.</p>`,
      starter: py`def permute(nums):
    # Backtrack: add an unused number to the path, recurse, remove it.
    pass
`,
      tests: [
        {
          call: py`sorted(permute([1, 2, 3]))`,
          expect: py`[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]`,
          show: py`permute([1, 2, 3]), in any order`,
        },
        {
          call: py`sorted(permute([0, 1]))`,
          expect: py`[[0, 1], [1, 0]]`,
          show: py`permute([0, 1]), in any order`,
        },
        { call: py`permute([1])`, expect: py`[[1]]` },
        {
          call: py`sorted(permute([10, -4, 6]))`,
          expect: py`[[-4, 6, 10], [-4, 10, 6], [6, -4, 10], [6, 10, -4], [10, -4, 6], [10, 6, -4]]`,
          show: py`permute([10, -4, 6]), in any order`,
        },
        {
          setup: py`result = sorted(permute([4, 3, 2, 1]))`,
          call: py`[len(result), result[0], result[1], result[23]]`,
          expect: py`[24, [1, 2, 3, 4], [1, 2, 4, 3], [4, 3, 2, 1]]`,
          show: py`permute([4, 3, 2, 1]), sorted: [how many, the first, the second, the last]`,
        },
        {
          setup: py`result = permute([1, 2, 3, 4, 5])
different = set(tuple(p) for p in result)
valid = all(sorted(p) == [1, 2, 3, 4, 5] for p in result)`,
          call: py`[len(result), len(different), valid]`,
          expect: py`[120, 120, True]`,
          show: py`permute([1, 2, 3, 4, 5]): [how many, how many different, every one valid]`,
        },
      ],
      hints: [
        py`Build one ordering position by position. At each position you may place any number that is not already in the ordering you are building.`,
        py`Keep one shared <code>path</code> list. When its length equals <code>len(nums)</code>, save a copy of it. Otherwise loop over <code>nums</code>, skip the numbers already in <code>path</code>, and for each of the rest: append it, recurse, pop it.`,
        py`The base case is <code>results.append(path[:])</code> followed by <code>return</code>. The loop body is <code>if n in path: continue</code>, then <code>path.append(n)</code>, the recursive call, and <code>path.pop()</code>.`,
      ],
      solution: py`def permute(nums):
    results = []
    path = []                         # the ordering being built

    def explore():
        if len(path) == len(nums):
            results.append(path[:])   # a copy: path keeps changing
            return
        for n in nums:
            if n in path:             # already used in this ordering
                continue
            path.append(n)            # choose
            explore()                 # explore
            path.pop()                # un-choose

    explore()
    return results
`,
      explain: py`
<p>The search fills one position at a time. At each level the loop tries every number that is not yet on <code>path</code>, explores everything that can follow it, then pops it so the next number can take the same position. A path as long as <code>nums</code> is a finished ordering, saved as a copy because <code>path</code> keeps changing. The inner function is a closure, so it reaches <code>nums</code>, <code>path</code> and <code>results</code> without passing them along.</p>
<p><b>Cost:</b> there are <code>n!</code> orderings and each takes <code>O(n)</code> to copy, so no method beats <code>O(n * n!)</code> time. The <code>n in path</code> scan adds one more factor of <code>n</code>, which a set of used numbers removes. Extra space beyond the output is <code>O(n)</code>.</p>
<p>The main alternative swaps elements of <code>nums</code> in place. In everyday code, call <code>itertools.permutations</code>.</p>`,
    },

    {
      id: 'z6-longest-increasing-subsequence',
      zone: 6,
      order: 6,
      kind: 'code',
      title: 'The Rising Signal',
      concept: 'Dynamic programming on subsequences',
      classic: 'Longest Increasing Subsequence (LeetCode #300)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>The core logs signal strength as it drifts up and down, and it wants the longest rising trend hidden in the log. A <b>subsequence</b> keeps the original order but may skip elements: <code>[3, 4, 5]</code> is a subsequence of <code>[3, 1, 4, 1, 5]</code>. A list of 60 elements has <code>2 ** 60</code> of them, far too many to try.</p>
<p>Dynamic programming replaces them with one small answer per element: the length of the best subsequence that <b>ends exactly there</b>. Each answer is built from answers that end earlier. This example finds the longest chain in which every number is 1 more than the one before:</p>
<pre><code>def step_chain(nums):
    best = {}     # value -&gt; longest chain ending there
    for x in nums:
        best[x] = best.get(x - 1, 0) + 1
    return max(best.values())

print(step_chain([1, 5, 2, 3, 9, 4]))   # 4 (1, 2, 3, 4)</code></pre>
<p>Here a number can only follow one specific value, so a dictionary finds the chain to extend. When a number may follow many earlier ones, look back over every earlier position and extend the best one that fits.</p>
<p>Diff tools and DNA alignment are built on the same idea.</p>`,
      task: py`
<p>Write <code>length_of_lis(nums)</code>. It returns how long the longest <b>strictly increasing</b> subsequence of the list <code>nums</code> is. Only the length is wanted. Equal numbers do not count as increasing, and <code>nums</code> holds at least one integer.</p>
<pre><code>length_of_lis([10, 9, 2, 5, 3, 7, 101, 18])    # 4
length_of_lis([0, 1, 0, 3, 2, 3])              # 4
length_of_lis([7, 7, 7, 7, 7, 7, 7])           # 1</code></pre>
<p>In the first example, 2, 3, 7, 18 is one subsequence of length 4.</p>
<p>The last test has 60 numbers and a step limit. Trying every subsequence cannot finish in time, and two nested loops over the list can.</p>`,
      starter: py`def length_of_lis(nums):
    # For each i, find the best subsequence that ends at nums[i].
    pass
`,
      tests: [
        { call: py`length_of_lis([10, 9, 2, 5, 3, 7, 101, 18])`, expect: py`4` },
        { call: py`length_of_lis([0, 1, 0, 3, 2, 3])`, expect: py`4` },
        { call: py`length_of_lis([7, 7, 7, 7, 7, 7, 7])`, expect: py`1` },
        { call: py`length_of_lis([5])`, expect: py`1` },
        { call: py`length_of_lis([9, 7, 4, 2])`, expect: py`1` },
        { call: py`length_of_lis([4, 10, 4, 3, 8, 9, 1])`, expect: py`3` },
        { call: py`length_of_lis([-5, -2, -8, 0, -1, 3])`, expect: py`4` },
        {
          setup: py`signal = [start + step for start in range(0, 60, 3) for step in (2, 1, 0)]`,
          call: py`length_of_lis(signal)`,
          expect: py`20`,
          show: py`length_of_lis([2, 1, 0, 5, 4, 3, 8, 7, 6, ..., 59, 58, 57])`,
          perf: true,
        },
      ],
      hints: [
        py`Start with a smaller question, asked once per position: how long is the best increasing subsequence that ends exactly at this number.`,
        py`Keep a list <code>best</code> with one entry per position, each starting at 1. For position <code>i</code>, look at every earlier position <code>j</code>. If <code>nums[j] &lt; nums[i]</code>, the subsequence ending at <code>j</code> can be extended by <code>nums[i]</code>.`,
        py`Use two loops: <code>for i in range(len(nums))</code> and inside it <code>for j in range(i)</code>. When <code>nums[j] &lt; nums[i]</code>, set <code>best[i] = max(best[i], best[j] + 1)</code>. The answer is <code>max(best)</code>, which is not always the last entry.`,
      ],
      solution: py`def length_of_lis(nums):
    # best[i]: longest increasing subsequence that ends at nums[i]
    best = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:         # nums[i] can follow nums[j]
                best[i] = max(best[i], best[j] + 1)
    return max(best)
`,
      naive: py`def length_of_lis(nums):
    # Try every subsequence: each number is either skipped or taken.
    def longest(i, last):
        if i == len(nums):
            return 0
        best = longest(i + 1, last)               # skip nums[i]
        if last is None or nums[i] > last:        # take nums[i]
            best = max(best, 1 + longest(i + 1, nums[i]))
        return best

    return longest(0, None)
`,
      explain: py`
<p><code>best[i]</code> is the length of the longest increasing subsequence that ends at <code>nums[i]</code>. Such a subsequence is either <code>nums[i]</code> alone, or a shorter one that ends at a smaller, earlier number with <code>nums[i]</code> added. The inner loop tries every earlier position and keeps the best extension. The winner can end anywhere, so the answer is <code>max(best)</code>.</p>
<p><b>Cost:</b> <code>O(n²)</code> time and <code>O(n)</code> space, where trying every subsequence takes exponential time.</p>
<p>The faster alternative keeps a sorted list <code>tails</code>, in which <code>tails[k]</code> is the smallest number that can end an increasing subsequence of length <code>k + 1</code>. For each number, <code>bisect_left(tails, x)</code> finds the entry to overwrite, or the number is appended when it is larger than all of them. That runs in <code>O(n log n)</code>, and the answer is <code>len(tails)</code>.</p>`,
    },

    {
      id: 'z6-trapping-rain-water',
      zone: 6,
      order: 7,
      kind: 'code',
      title: 'Coolant Between the Fins',
      concept: 'Two pointers with running maxima',
      classic: 'Trapping Rain Water (LeetCode #42)',
      difficulty: 'Hard',
      boss: false,
      lesson: py`
<p>Coolant has pooled between the reactor's cooling fins. Seen from the side, the fins are bars of width 1, and you need the volume of liquid they hold.</p>
<p>Take one position at a time. Liquid there rises to the lower of two walls: the tallest bar from the left edge up to this one, and the tallest from this one to the right edge. The depth is <code>min(left wall, right wall) - height</code>, which is 0 where the bar is its own wall.</p>
<p>"Tallest so far" is a <b>running maximum</b>, updated with one comparison per step:</p>
<pre><code>heights = [2, 0, 3, 1]
tallest = 0
walls = []
for h in heights:
    tallest = max(tallest, h)
    walls.append(tallest)
print(walls)    # [2, 2, 3, 3]</code></pre>
<p>Now put a pointer at each end, each with its own running maximum, and work on whichever bar is lower. A pointer only moves when its bar is no taller than the other, so the other bar is at least as tall as everything this side has passed. The level here is this side's running maximum. Record the depth, move that pointer inward, and compare again.</p>
<p>Terrain-mapping tools use the same reasoning to find where water would collect.</p>`,
      task: py`
<p>Write <code>trap(height)</code>. <code>height</code> is a list of non-negative integers: the heights of bars of width 1 standing side by side. Return the total number of unit cells of liquid held between the bars. Nothing is held to the left of the first bar or to the right of the last one.</p>
<pre><code>trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])    # 6
trap([4, 2, 0, 3, 2, 5])                      # 9</code></pre>
<p>The last test has 2,000 bars and a step limit. Scanning left and right from every bar is too slow, and a single pass with two pointers is fast enough.</p>`,
      starter: py`def trap(height):
    # Two pointers, two running maxima. Always move the lower side.
    pass
`,
      tests: [
        { call: py`trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])`, expect: py`6` },
        { call: py`trap([4, 2, 0, 3, 2, 5])`, expect: py`9` },
        { call: py`trap([5])`, expect: py`0` },
        { call: py`trap([1, 2, 3, 4, 3, 2, 1])`, expect: py`0` },
        { call: py`trap([3, 0, 2, 0, 4])`, expect: py`7` },
        { call: py`trap([1, 0, 3, 0, 1])`, expect: py`2` },
        { call: py`trap([5, 5, 1, 5, 5])`, expect: py`4` },
        {
          setup: py`bars = [(i % 100) * 10 for i in range(2000)]`,
          call: py`trap(bars)`,
          expect: py`940500`,
          show: py`trap([0, 10, 20, ..., 990, 0, 10, 20, ..., 990, ...]) with 2,000 bars`,
          perf: true,
        },
      ],
      hints: [
        py`Work out the depth above a single bar first. Besides the bar's own height, it depends on two numbers only: the tallest bar anywhere to its left and the tallest bar anywhere to its right.`,
        py`Use a pointer at each end and keep the tallest bar seen so far from each side. At every step, handle the side whose current bar is lower. The other side is certain to hold a wall at least as tall, so the lower side's own maximum decides the depth.`,
        py`Loop while <code>left &lt; right</code>. If <code>height[left] &lt; height[right]</code>: update <code>left_max</code>, add <code>left_max - height[left]</code> to the total, and move <code>left</code> up by one. Otherwise do the mirror image with <code>right_max</code> and move <code>right</code> down.`,
      ],
      solution: py`def trap(height):
    left, right = 0, len(height) - 1
    left_max = right_max = 0        # tallest bar seen from each end
    water = 0
    while left < right:
        if height[left] < height[right]:
            # A wall at least this tall stands on the right,
            # so left_max alone sets the level here.
            left_max = max(left_max, height[left])
            water += left_max - height[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            water += right_max - height[right]
            right -= 1
    return water
`,
      naive: py`def trap(height):
    water = 0
    for i in range(len(height)):
        left_wall = max(height[:i + 1])     # tallest at or left of i
        right_wall = max(height[i:])        # tallest at or right of i
        water += min(left_wall, right_wall) - height[i]
    return water
`,
      explain: py`
<p>The depth above bar <code>i</code> is <code>min(left wall, right wall) - height[i]</code>, where each wall is the tallest bar on that side, bar <code>i</code> included. The two pointers find that minimum without scanning.</p>
<p>A pointer only steps past a bar that is no taller than the bar at the other pointer. So everything already passed, on either side, is no taller than the taller of the two current bars. When <code>height[left]</code> is the lower one, the wall on its right is at least <code>height[right]</code>, which is at least <code>left_max</code>. The minimum is therefore <code>left_max</code>, and that position is settled. The other branch is the mirror image.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(1)</code> extra space. Scanning both ways from every bar is <code>O(n²)</code>. Storing the left and right maxima in two lists first is also <code>O(n)</code> time, with <code>O(n)</code> space.</p>`,
    },

    {
      id: 'z6-merge-k-sorted-lists',
      zone: 6,
      order: 8,
      kind: 'code',
      title: 'Light the Beacon',
      concept: 'Heap of (value, index, node) tuples',
      classic: 'Merge k Sorted Lists (LeetCode #23)',
      difficulty: 'Hard',
      boss: true,
      lesson: py`
<p>This is the last job in the tower. Every floor you restored sends a sorted stream of signal shards to the summit, and the beacon needs one sorted stream.</p>
<p>A heap can hold tuples. Python compares tuples element by element: the first element decides, and the next one matters only on a tie. If a tie leads Python to two objects with no <code>&lt;</code> defined, it raises <code>TypeError</code>. A unique index in the middle settles every tie before that happens:</p>
<pre><code>import heapq

jobs = [{'name': 'vent', 'level': 2},
        {'name': 'pump', 'level': 1},
        {'name': 'fan', 'level': 2}]
heap = []
for i, job in enumerate(jobs):         # i breaks ties
    heapq.heappush(heap, (job['level'], i, job))
while heap:
    level, i, job = heapq.heappop(heap)
    print(level, job['name'])    # 1 pump, 2 vent, 2 fan</code></pre>
<p>Without <code>i</code>, the two level-2 entries would make Python compare two dictionaries, which fails. <code>ListNode</code> objects fail the same way.</p>
<p>To merge sorted sequences, the heap needs one entry per sequence: its current front. Pop the smallest front, then push the element behind it. Databases and log tools merge sorted files like this.</p>`,
      task: py`
<p>Write <code>merge_k_lists(lists)</code>. <code>lists</code> is a Python list of linked lists: each entry is the head <code>ListNode</code> of a list sorted in ascending order, or <code>None</code> for an empty one. Return the head of one sorted linked list containing every value from every list, or <code>None</code> if there are no nodes at all. You may relink the given nodes or build new ones.</p>
<pre><code>a = linked([1, 4, 5])
b = linked([1, 3, 4])
c = linked([2, 6])
merge_k_lists([a, b, c])
# the list 1 -&gt; 1 -&gt; 2 -&gt; 3 -&gt; 4 -&gt; 4 -&gt; 5 -&gt; 6
merge_k_lists([])    # None</code></pre>
<p><code>ListNode</code> is already defined, with <code>val</code> and <code>next</code>. The tests build their inputs with <code>linked([...])</code> and read your answer back with <code>unlinked(...)</code>.</p>
<p>The last test merges 750 short lists under a step limit. Checking the head of every list for each node you output is too slow.</p>`,
      starter: py`def merge_k_lists(lists):
    # One (value, index, node) heap entry per list. Pop, push the next.
    pass
`,
      tests: [
        {
          call: py`unlinked(merge_k_lists([linked([1, 4, 5]), linked([1, 3, 4]), linked([2, 6])]))`,
          expect: py`[1, 1, 2, 3, 4, 4, 5, 6]`,
        },
        { call: py`unlinked(merge_k_lists([]))`, expect: py`[]` },
        { call: py`unlinked(merge_k_lists([linked([])]))`, expect: py`[]` },
        { call: py`unlinked(merge_k_lists([linked([1, 2, 3])]))`, expect: py`[1, 2, 3]` },
        {
          call: py`unlinked(merge_k_lists([linked([2, 9]), linked([]), linked([5]), linked([])]))`,
          expect: py`[2, 5, 9]`,
        },
        {
          call: py`unlinked(merge_k_lists([linked([7, 7]), linked([7]), linked([7, 7, 7])]))`,
          expect: py`[7, 7, 7, 7, 7, 7]`,
        },
        {
          call: py`unlinked(merge_k_lists([linked([-10, -3, 0, 12]), linked([-5]), linked([-7, 4])]))`,
          expect: py`[-10, -7, -5, -3, 0, 4, 12]`,
        },
        {
          setup: py`lists = [linked([j, j + 750]) for j in range(750)]`,
          call: py`unlinked(merge_k_lists(lists)) == list(range(1500))`,
          expect: py`True`,
          show: py`750 lists [0, 750], [1, 751], ..., [749, 1499] merge into 0, 1, 2, ..., 1499`,
          perf: true,
        },
      ],
      hints: [
        py`You never need to look at more than one node per list: its current front. Each step asks which front is smallest, and a heap answers that without checking them all.`,
        py`Push <code>(node.val, i, node)</code> for the head of every non-empty list, where <code>i</code> is the position of that list. Then repeat: pop the smallest entry, attach its node to the end of the result, and push the node that follows it, if there is one.`,
        py`Use a dummy node and a <code>tail</code> pointer. After <code>val, i, node = heapq.heappop(heap)</code>, set <code>tail.next = node</code> and <code>tail = node</code>. If <code>node.next</code> is not <code>None</code>, push <code>(node.next.val, i, node.next)</code>. Return <code>dummy.next</code>.`,
      ],
      solution: py`import heapq


def merge_k_lists(lists):
    # One heap entry per list: (value, list index, node).
    # The index settles ties, so two nodes are never compared.
    heap = []
    for i, node in enumerate(lists):
        if node is not None:
            heapq.heappush(heap, (node.val, i, node))

    dummy = ListNode()
    tail = dummy
    while heap:
        val, i, node = heapq.heappop(heap)    # smallest front of all
        tail.next = node
        tail = node
        if node.next is not None:             # its successor steps up
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
`,
      naive: py`def merge_k_lists(lists):
    heads = [node for node in lists if node is not None]
    dummy = ListNode()
    tail = dummy
    while heads:
        # Look at every remaining head to find the smallest one.
        smallest = 0
        for i in range(1, len(heads)):
            if heads[i].val < heads[smallest].val:
                smallest = i
        node = heads[smallest]
        tail.next = node
        tail = node
        if node.next is not None:
            heads[smallest] = node.next
        else:
            heads.pop(smallest)
    return dummy.next
`,
      explain: py`
<p>The heap holds one entry per non-empty list: its front node. The smallest front is the next node of the answer. Pop it, link it to the tail, and push the node that followed it. No two entries share an index, so a tie on value is settled by an integer and Python never compares two <code>ListNode</code> objects.</p>
<p><b>Cost:</b> with <code>N</code> nodes in <code>k</code> lists, each node is pushed and popped once on a heap of at most <code>k</code> entries: <code>O(N log k)</code> time, <code>O(k)</code> extra space. Scanning every head for each node is <code>O(N * k)</code>.</p>
<p>The simple alternative collects every value, sorts, and builds a new list: <code>O(N log N)</code> time, <code>O(N)</code> space. It passes here and is often the right call. The heap wins when the inputs are streams too large to hold in memory.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
