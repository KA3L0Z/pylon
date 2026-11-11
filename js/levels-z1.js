/* Pylon zone 1, Boot Deck: robot levels. The player's code drives PIP across a deck.
   Map characters: '#' wall, '.' floor, 'S' start, 'E' beacon, 'o' data shard, ' ' open air.
   goal: 'beacon' (stop on the beacon), 'shards' (collect them all), 'both'. Every map must be solved by the same code. */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z1-first-steps', zone: 1, order: 1, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'First Steps',
      concept: 'Calling a function',
      commands: ['move()'],
      goal: 'beacon',
      maps: [{ grid: ['S..E'], dir: 'E' }],
      lesson: py`
<p>PIP is your maintenance drone. It does exactly what your code says, one line at a time, from top to bottom.</p>
<p>The instruction below moves PIP one tile forward:</p>
<pre><code>move()</code></pre>
<p><code>move</code> is the name of a <b>function</b>, a ready-made action. The parentheses <code>()</code> mean "do it now". Without them nothing happens.</p>
<p>To move twice, write the instruction twice, each on its own line:</p>
<pre><code>move()
move()</code></pre>
<p>Python is strict about spelling. <code>Move()</code> or <code>move</code> will not work. When something is wrong, PIP stops and tells you which line to look at.</p>`,
      task: py`
<p>Drive PIP onto the glowing <b>beacon</b>. Count the tiles between PIP and the beacon, then write one <code>move()</code> for each.</p>
<p>Press <b>Run</b> to watch PIP follow your code.</p>`,
      starter: py`# One move() is here already. How many more does PIP need?
move()
`,
      hints: [
        py`PIP starts three tiles away from the beacon.`,
        py`Each <code>move()</code> goes exactly one tile. Put each one on its own line, starting at the left edge.`,
        py`Write <code>move()</code> three times, on three lines.`,
      ],
      solution: py`move()
move()
move()
`,
      explain: py`
<p>A program is a sequence. Python runs the first line, then the second, then the third, and stops when it runs out of lines.</p>
<p>Three calls to <code>move()</code> take PIP three tiles forward, which is exactly where the beacon is.</p>`,
    },

    {
      id: 'z1-turn-the-corner', zone: 1, order: 2, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'Turn the Corner',
      concept: 'Instructions run in order',
      commands: ['move()', 'turn_left()', 'turn_right()'],
      goal: 'beacon',
      maps: [{ grid: ['S..##', '##.##', '##..E'], dir: 'E' }],
      lesson: py`
<p>PIP can also turn on the spot:</p>
<pre><code>turn_left()
turn_right()</code></pre>
<p>A turn changes the direction PIP faces. It does not move PIP to another tile. Left and right are from PIP's point of view, like a driver's.</p>
<p>The <b>order</b> of your lines is the whole program. These two programs end in different places:</p>
<pre><code>move()
turn_right()
move()</code></pre>
<pre><code>turn_right()
move()
move()</code></pre>
<p>Lines that start with <code>#</code> are <b>comments</b>. Python ignores them. Use them to leave notes for yourself.</p>
<p>If PIP hits a wall, the run stops and the faulty line is marked. Fix it and run again. That loop of try, read, fix is how all programming works.</p>`,
      task: py`
<p>Guide PIP along the corridor to the beacon. The path goes forward, turns right, then turns left.</p>
<p>Walls and open air both end the run, so turn at the right moment.</p>`,
      starter: py`# Follow the corridor to the beacon.
move()
move()
`,
      hints: [
        py`Trace the path with your finger first: two tiles forward, then down, then forward again.`,
        py`After the first two moves PIP must face down the screen. From PIP's point of view that is a turn to the <b>right</b>.`,
        py`Two moves, <code>turn_right()</code>, two moves, <code>turn_left()</code>, two moves.`,
      ],
      solution: py`move()
move()
turn_right()
move()
move()
turn_left()
move()
move()
`,
      explain: py`
<p>Eight instructions, run strictly in order. Each turn happens on the corner tile, after the move that reaches it and before the move that leaves it.</p>
<p>Swap any two neighbouring lines and PIP ends up in a wall. Most bugs you will ever write are this kind: the right instructions in the wrong order.</p>`,
    },

    {
      id: 'z1-dont-repeat-yourself', zone: 1, order: 3, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'Do Not Repeat Yourself',
      concept: 'for loops',
      commands: ['move()', 'collect()', 'for i in range(n):'],
      goal: 'both',
      maxLines: 5,
      maps: [{ grid: ['SooooE'], dir: 'E' }],
      lesson: py`
<p>Writing the same lines again and again is slow and easy to get wrong. A <b>for loop</b> repeats a block of code a set number of times:</p>
<pre><code>for i in range(3):
    turn_left()
    turn_left()</code></pre>
<p>This runs the two indented lines three times, so PIP turns left six times.</p>
<p>Three details matter:</p>
<ul>
<li>The first line ends with a colon <code>:</code>.</li>
<li>The lines to repeat are <b>indented</b> by four spaces. The indentation is how Python knows what belongs to the loop.</li>
<li>The first line that is not indented comes after the loop and runs once.</li>
</ul>
<p><code>collect()</code> picks up the data shard on PIP's current tile. Calling it on an empty tile is an error.</p>`,
      task: py`
<p>Collect all four data shards, then stop on the beacon.</p>
<p>PIP's memory holds only <b>5 lines</b> of code on this deck, so writing every step by hand will not fit. Use a loop.</p>`,
      starter: py`# Collect the four shards, then reach the beacon. 5 lines at most.
for i in range(2):
    move()
`,
      hints: [
        py`Look for the pattern that repeats: step onto a shard, pick it up. That happens four times.`,
        py`Put <code>move()</code> and <code>collect()</code> inside one loop that runs 4 times. Both lines are indented.`,
        py`After the loop, one more <code>move()</code> without indentation takes PIP onto the beacon.`,
      ],
      solution: py`for i in range(4):
    move()
    collect()
move()
`,
      explain: py`
<p>The loop body is the two indented lines. Python runs them as a pair, four times: move, collect, move, collect, and so on.</p>
<p>The last <code>move()</code> is not indented, so it is outside the loop and runs once, after the loop has finished.</p>
<p>Four lines instead of nine, and changing 4 to 400 would cost you nothing.</p>`,
    },

    {
      id: 'z1-square-patrol', zone: 1, order: 4, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'Square Patrol',
      concept: 'Loops inside loops',
      commands: ['move()', 'turn_left()', 'collect()', 'for i in range(n):'],
      goal: 'shards',
      maxLines: 6,
      maps: [{ grid: ['o..o', '.##.', '.##.', 'S..o'], dir: 'E' }],
      lesson: py`
<p>A loop body can hold any code, including another loop. The inner loop runs completely each time the outer loop goes around once:</p>
<pre><code>for i in range(2):
    for j in range(3):
        move()
    turn_right()</code></pre>
<p>Read it from the outside in. Two times: move three tiles, then turn right.</p>
<p>Indentation shows the structure. <code>move()</code> is indented twice, so it belongs to the inner loop. <code>turn_right()</code> is indented once, so it belongs to the outer loop and runs after the three moves.</p>
<p>The names <code>i</code> and <code>j</code> are counters. You are not using their values yet, they only need to be different names.</p>`,
      task: py`
<p>Three data shards sit on the corners of the walkway. Collect all three. PIP does not need to end anywhere special.</p>
<p>The deck allows <b>6 lines</b>. One side of the square is: three moves, a pickup, a left turn.</p>`,
      starter: py`# One side of the square: three moves, collect, turn left.
for i in range(3):
    move()
`,
      hints: [
        py`Solve one side first: three moves bring PIP to a corner with a shard. Collect it, then turn left to face the next side.`,
        py`That whole side happens three times, so wrap it in an outer loop that runs 3 times.`,
        py`Outer loop 3 times. Inside it: an inner loop of 3 moves, then <code>collect()</code> and <code>turn_left()</code> at the outer loop's indentation.`,
      ],
      solution: py`for i in range(3):
    for j in range(3):
        move()
    collect()
    turn_left()
`,
      explain: py`
<p>The inner loop walks one side of the square. The outer loop repeats "walk a side, pick up, turn" three times.</p>
<p>Count the work: the inner <code>move()</code> runs 3 times 3, nine times in total, from a program five lines long.</p>
<p>When you read nested loops, read the indentation first. It tells you which lines repeat together.</p>`,
    },

    {
      id: 'z1-until-the-wall', zone: 1, order: 5, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'Until the Wall',
      concept: 'while loops',
      commands: ['move()', 'front_is_clear()', 'while condition:'],
      goal: 'beacon',
      maps: [{ grid: ['S...E#'], dir: 'E' }, { grid: ['S......E#'], dir: 'E' }, { grid: ['S.E#'], dir: 'E' }],
      lesson: py`
<p>A <code>for</code> loop needs to know the number of repeats in advance. Often you do not know it. A <b>while loop</b> repeats for as long as a question keeps getting the answer yes:</p>
<pre><code>while front_is_clear():
    move()</code></pre>
<p><code>front_is_clear()</code> is a function that <b>answers</b> instead of acting. It gives back <code>True</code> if PIP can move forward and <code>False</code> if a wall or open air is ahead.</p>
<p>Python asks the question, runs the indented block if the answer is <code>True</code>, then asks again. The first <code>False</code> ends the loop.</p>
<p>If the answer can never become <code>False</code>, the loop never ends. PIP stops such a program after a while and tells you.</p>`,
      task: py`
<p>The beacon is at the end of the corridor, but the corridor has a <b>different length</b> on every run. Your code is tested on three corridors and must work on all of them without changes.</p>
<p>Counting tiles will not work here. Let PIP feel its way.</p>`,
      starter: py`# The corridor changes length. Keep moving while the way ahead is clear.
`,
      hints: [
        py`A fixed number of moves fits one corridor only. You need "keep going until something is in the way".`,
        py`<code>front_is_clear()</code> answers <code>True</code> while PIP can still move forward. Use it as the question of a <code>while</code> loop.`,
        py`Two lines: <code>while front_is_clear():</code> and, indented below it, <code>move()</code>.`,
      ],
      solution: py`while front_is_clear():
    move()
`,
      explain: py`
<p>The loop asks "is the way ahead clear?" before every step. On the beacon tile the wall is ahead, the answer becomes <code>False</code>, and the loop ends with PIP exactly where it should be.</p>
<p>The same two lines solve a corridor of any length. That is the difference between a program that works once and a program that is correct.</p>`,
    },

    {
      id: 'z1-fork-in-the-road', zone: 1, order: 6, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'Pick Up What Is There',
      concept: 'if statements',
      commands: ['move()', 'collect()', 'front_is_clear()', 'on_shard()', 'if condition:'],
      goal: 'both',
      maps: [{ grid: ['S.o.oo.E#'], dir: 'E' }, { grid: ['Soo...oE#'], dir: 'E' }, { grid: ['S...o.E#'], dir: 'E' }],
      lesson: py`
<p>An <b>if statement</b> runs a block of code only when a condition is true:</p>
<pre><code>if on_shard():
    collect()</code></pre>
<p>If PIP is standing on a shard, it picks it up. If not, Python skips the indented line and carries on.</p>
<p>You can add an <code>else</code> block for the opposite case, and the word <code>not</code> flips a condition:</p>
<pre><code>if front_is_clear():
    move()
else:
    turn_left()

if not on_shard():
    move()</code></pre>
<p>An <code>if</code> can live inside a loop. Then the question is asked again on every pass, and the answer can be different each time.</p>`,
      task: py`
<p>Data shards are scattered along the corridor, in different places on every run. Collect every shard and stop on the beacon.</p>
<p>Remember that <code>collect()</code> on an empty tile is an error, so check first.</p>`,
      starter: py`# Walk the corridor. Collect a shard only where there is one.
while front_is_clear():
    move()
`,
      hints: [
        py`The loop from the last level already walks the whole corridor. The only new part is what PIP does after each step.`,
        py`After each <code>move()</code>, ask <code>on_shard()</code>. Only when the answer is <code>True</code> should PIP call <code>collect()</code>.`,
        py`Inside the while loop, below <code>move()</code>, add <code>if on_shard():</code> and indent <code>collect()</code> one level further.`,
      ],
      solution: py`while front_is_clear():
    move()
    if on_shard():
        collect()
`,
      explain: py`
<p>The <code>while</code> loop handles "how far". The <code>if</code> inside it handles "what to do on this tile". Two small ideas combine into a program that copes with any corridor and any layout of shards.</p>
<p>Notice the two levels of indentation: <code>collect()</code> belongs to the <code>if</code>, and the <code>if</code> belongs to the loop.</p>`,
    },

    {
      id: 'z1-teach-pip-a-trick', zone: 1, order: 7, kind: 'robot', difficulty: 'Easy', boss: false,
      title: 'Teach PIP a Trick',
      concept: 'Defining your own functions',
      commands: ['move()', 'turn_left()', 'turn_right()', 'collect()', 'on_shard()', 'def name():'],
      goal: 'both',
      maxLines: 15,
      maps: [{ grid: ['Soooo', 'oooo.', '.oooE'], dir: 'E' }],
      lesson: py`
<p>So far you have used functions that already exist. With <code>def</code> you create your own:</p>
<pre><code>def turn_around():
    turn_left()
    turn_left()</code></pre>
<p>This <b>defines</b> a new function called <code>turn_around</code>. Defining it does not run it. It only teaches PIP the trick. To use it, call it by name like any other function:</p>
<pre><code>turn_around()
move()
turn_around()</code></pre>
<p>A function gives a name to a block of code. You write the block once and use it as often as you like. If it has a bug, there is one place to fix it.</p>
<p>The definition has to come before the first call, so put your <code>def</code> blocks at the top.</p>`,
      task: py`
<p>Sweep the deck: collect every shard on all three rows and finish on the beacon.</p>
<p>Each row is the same job: four steps forward, picking up whatever is there. Write that job once as a function called <code>sweep</code>, then call it three times with the turns in between. The deck allows <b>15 lines</b>.</p>`,
      starter: py`def sweep():
    # Four steps forward. Collect a shard wherever there is one.
    for i in range(4):
        move()


sweep()
`,
      hints: [
        py`Finish <code>sweep</code> first: inside its loop, after <code>move()</code>, collect only <code>if on_shard()</code>. Run it and check that the first row is clean.`,
        py`At the end of the first row PIP must drop to the next row and face the other way: turn right, move, turn right. At the end of the second row it is the mirror image with left turns.`,
        py`The main program is: <code>sweep()</code>, right, move, right, <code>sweep()</code>, left, move, left, <code>sweep()</code>.`,
      ],
      solution: py`def sweep():
    for i in range(4):
        move()
        if on_shard():
            collect()


sweep()
turn_right()
move()
turn_right()
sweep()
turn_left()
move()
turn_left()
sweep()
`,
      explain: py`
<p><code>sweep</code> bundles a loop and a decision under one name. The main program then reads almost like a plan in plain words: sweep, turn around the end, sweep, turn around, sweep.</p>
<p>Without the function you would need the same four lines three times. Writing code once and naming it well is the most important habit in software.</p>`,
    },

    {
      id: 'z1-the-maze', zone: 1, order: 8, kind: 'robot', difficulty: 'Medium', boss: true,
      title: 'The Maze',
      concept: 'Combining loops and decisions',
      commands: ['move()', 'turn_left()', 'turn_right()', 'front_is_clear()', 'right_is_clear()', 'at_beacon()', 'if / elif / else'],
      goal: 'beacon',
      maps: [
        { grid: ['#######', '#S..#E#', '#.#.#.#', '#.#...#', '#.###.#', '#.....#', '#######'], dir: 'E' },
        { grid: ['#########', '#S#.....#', '#.#.###.#', '#...#E..#', '#########'], dir: 'E' },
        { grid: ['#######', '#E#...#', '#.#.#.#', '#.#.#.#', '#...#S#', '#######'], dir: 'N' },
      ],
      lesson: py`
<p>When there are more than two cases, chain them with <code>elif</code>, short for "else if". Python checks the conditions from the top and runs the first block whose condition is true:</p>
<pre><code>if on_shard():
    collect()
elif front_is_clear():
    move()
else:
    turn_left()</code></pre>
<p>Only one of the three blocks runs on each pass.</p>
<p>Two more sensors: <code>right_is_clear()</code> tells you whether the tile to PIP's right is free, and <code>at_beacon()</code> is <code>True</code> once PIP stands on the beacon. So <code>while not at_beacon():</code> means "keep going until you arrive".</p>
<p>There is an old trick for mazes like these: keep your right hand on the wall and never let go. You may take the long way, but you will reach the exit.</p>`,
      task: py`
<p>Three different mazes, one program. Bring PIP to the beacon in each of them.</p>
<p>Turn the right-hand rule into code. On every pass of your loop PIP should do one of three things: follow the wall around to the right, go straight, or turn left because the way is blocked.</p>`,
      starter: py`# Keep going until PIP stands on the beacon.
while not at_beacon():
    move()
`,
      hints: [
        py`Think about one step at a time. The first question is always: can PIP go right? If yes, it turns right and moves.`,
        py`If right is blocked, the next best option is straight ahead. If that is blocked too, PIP turns left and the loop asks again.`,
        py`Inside the loop: <code>if right_is_clear():</code> turn right and move. <code>elif front_is_clear():</code> move. <code>else:</code> turn left.`,
      ],
      solution: py`while not at_beacon():
    if right_is_clear():
        turn_right()
        move()
    elif front_is_clear():
        move()
    else:
        turn_left()
`,
      explain: py`
<p>The loop repeats one small decision until the goal is reached. The order of the checks is the algorithm: right first, then straight, then left. That order keeps PIP's right side against a wall the whole time.</p>
<p>You did not write a route for any of the mazes. You wrote a rule, and the rule found three routes. Programs that work on inputs you have never seen are what the rest of the Pylon is about.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
