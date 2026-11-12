# Pylon

**Play it: https://ka3l0z.github.io/pylon/**

Pylon is a free browser game that teaches Python, from the first function call to classic interview problems. You are the new engineer at a signal tower that has been dark for years. Each platform on the tower is a problem to solve with real code, and each floor you bring back online is a promotion: Trainee, Intern, Technician, Junior Engineer, Associate Engineer, Engineer, Senior Engineer, Staff Engineer, Principal Engineer.

![A level with the step-by-step view open: a linked list drawn while it is being reversed](docs/level.jpg)

## What is in it

- **77 levels on 9 floors.** Floor 1 is drone puzzles: calls, loops, conditions and your own functions. Floors 2 to 9 are code levels, and 46 of them are well-known interview problems such as Two Sum, Valid Parentheses, Merge Intervals, LRU Cache, Course Schedule and Trapping Rain Water.
- **Lessons come one level early.** Every level ends with the briefing for the next one. The level itself explains nothing and never says which tools it needs: you were shown them, and choosing among them is the exercise.
- **A Toolbox of 184 reference cards.** One card per function, method or piece of syntax: what it does, how to call it, and an example with its output. Cards join your Toolbox when you are briefed on them, and you can search it at any time.
- **Craft marks.** A passing answer is also read for how it is written. Four marks, each worth extra XP: concise, clear names, Pythonic, tidy. The notes say which line to change and why.
- **Real Python, inside the page.** Your code runs on MiniPy, an interpreter for a subset of Python written for this game. Your code never leaves the browser.
- **Input, files and regular expressions.** `input()` reads the lines a test hands the program, or the ones you type into the Scratchpad's Input box. `open()` works on files that live in memory, and the `re` module is there for patterns.
- **Step through, with a picture of your data.** Replay any test one line at a time. Lists are drawn as rows of cells with the index variables pointing into them, dictionaries as pairs, linked lists as chains of nodes, and whatever changed is lit.
- **An editor that helps.** Suggestions while you type, each with a one-line reminder of what the function or method does, and syntax problems flagged before you run.
- **Speed tests.** Some tests count the steps your code takes, so a slow algorithm fails even when its answers are right.
- **Daily review.** A solved level comes back after 1 day, then 3, 7, 14, 30 and 60, to be written again from the starting code.
- **Mock interviews.** A timed set of classic problems with no lesson, no hints and no solution, and a report at the end.
- **Scratchpad, hints, model solutions, badges and a daily streak**, plus music and sound effects.

![The tower](docs/tower.jpg)

A briefing with its reference cards, and the craft marks under a passing answer:

![A briefing: the lesson for the next level, with the cards that join the Toolbox](docs/briefing.jpg)

![Craft marks: two of four earned, with notes on what to change](docs/craft.jpg)

The Scratchpad, running a program that asks for input, writes a file and reads it back with a pattern:

![The Scratchpad with its Input box, the printed output and the file the program wrote](docs/scratchpad.jpg)

It works on phones too: the layout stacks, the editor gets a row of quick keys and a bar of suggestions above the keyboard, and the 3D view picks a lighter quality tier.

<img src="docs/phone.jpg" alt="The tower on a phone" width="300">

Progress is saved in your browser (localStorage). There are no accounts.

## What it teaches

| Floor | Rank | Topics |
| --- | --- | --- |
| 1 Boot Deck | Trainee | calling functions, `for` and `while`, `if`/`elif`/`else`, writing a function |
| 2 Logic Gardens | Intern | values and variables, `input()`, arithmetic, `return`, strings and f-strings, comparisons, `and`/`or`/`not`, lists, nested loops |
| 3 Cipher Hall | Technician | slices, `split`/`join`, searching text, `ord`/`chr`, default and keyword arguments, tuples, `import` and `math`, `try`/`except`/`raise`, debugging |
| 4 Data Vaults | Junior Engineer | sets, `enumerate`/`zip`, dictionaries, comprehensions, `sorted` with a key, `lambda`, `defaultdict` |
| 5 Signal Archive | Associate Engineer | reading and writing files, `with`, regular expressions: `findall`, `search`, groups, `fullmatch`, `sub`, and a log-analysis boss |
| 6 Pattern Forge | Engineer | two pointers, stacks, binary search, bit operations, Kadane's algorithm, sliding windows, prefix products, intervals |
| 7 Structure Works | Senior Engineer | classes, inheritance, recursion, linked lists, binary trees, breadth-first search, binary search trees, `OrderedDict` |
| 8 Path Reactor | Staff Engineer | grids, memoization, dynamic programming in one and two dimensions, greedy choice, flood fill, backtracking, topological order |
| 9 Summit Core | Principal Engineer | generators, decorators, operator methods, tries, heaps, and the hard classics |

The order was checked against the syllabi of CS50's Introduction to Programming with Python, the University of Helsinki Python MOOC, Kaggle Learn, the official Python tutorial, Exercism, freeCodeCamp, Codecademy and Google's Python Class, and against the NeetCode 150 and LeetCode Top Interview 150 lists. Not covered: the `csv` and `json` modules, command-line arguments, installing packages and web requests, because the interpreter runs inside the page with no disk and no network. Also left out: the `match` statement, type hints, properties, and shortest-path algorithms such as Dijkstra's.

## Run it locally

Any static file server works. From this folder:

    python -m http.server 8000

Then open http://localhost:8000/.

## How it is built

| Path | What it is |
| --- | --- |
| `index.html` | The page: layout and styles |
| `js/minipy-*.js` | MiniPy: parser, compiler to closures, built-in types and functions, standard modules |
| `js/runner.js` | Runs player code against the tests, simulates the drone, records traces |
| `js/levels-z1.js` to `js/levels-z9.js` | The levels: lesson, task, starter code, tests, hints and model solution |
| `js/curriculum.js` | Which floors exist and which levels stand on each, in order. Rebalancing the course is an edit to this one table |
| `js/toolcards.js` | Reference cards for the levels whose files do not carry their own |
| `js/craft.js` | The craft marks: reads a solution through MiniPy's parser and judges length, names, idiom and layout |
| `js/complete.js` | What the editor suggests at the caret, and the one-line reminders |
| `js/editor.js` | The code editor |
| `js/world.js` | The 3D tower and arenas (three.js): image-based reflections, soft shadows, bloom, filmic tone mapping |
| `js/game.js` | Progress, interface, briefings, Toolbox, step-by-step view, reviews, interviews, badges, audio |
| `audio/` | The music track |
| `tools/`, `tests/` | The checks below |

MiniPy covers the language and the standard modules the levels use (math, re, collections, heapq, itertools, functools, bisect and a few more). Three things differ from a real Python on purpose:

- `input()` never waits. It takes the next of the lines the run was given, and raises `EOFError` when they run out.
- Files live in memory for the length of one run. A test can hand the program files and read back what it wrote.
- `re` follows Python's pattern language (named groups, `\A`, `\Z`, flags, verbose mode) on top of the browser's engine. `\w`, `\d` and `\b` see ASCII letters and digits only, and flags inside a group, `(?i:...)`, are refused.

Async code and third-party packages are not included.

Each script link in `index.html` carries a stamp of the file's contents (`js/game.js?v=…`), so a browser never pairs the page with an older cached script. After editing a file in `js/`, refresh the stamps:

    node tools/stamp.js

The 3D picture has three quality tiers. "Auto" starts from the kind of device and steps down by itself if frames stay slow; the Menu lets you pick one.

## Checks

    python tools/check_levels.py      # every model solution passes its tests in real CPython
    node tools/check_minipy.js        # the same inside MiniPy, and the slow solutions fail the speed tests
    node tools/run_conf.js            # 80 small programs: MiniPy's output against CPython's
    node tools/check_curriculum.js    # the course as a whole, in the order the player meets it

The last one enforces the teaching rules. Every function, method and piece of syntax a model solution uses must have a reference card on that level or an earlier one. Every card example and lesson example (301 of them) must print the same thing in MiniPy and in CPython. Every model solution must earn all four craft marks, and a set of deliberately sloppy snippets must lose the right ones.

A conformance program that calls `input()` keeps its lines next to it (`tests/conf/077_input.in`), and `python tests/gen_expected.py` regenerates the expected outputs from CPython.

They were run with Python 3.10 and Node.js 22.

## Notes

The game also runs as a Claude artifact. There, saves sync to the player's Claude account and two more features appear: an opt-in leaderboard and an AI mentor. On this site those are switched off and everything stays in the browser.

A save from an earlier, smaller tower (6 floors and 48 levels, then 8 floors and 71) keeps working: solved levels stay solved, the rank is kept, and the new levels appear among the old ones.

Music: "Pythonic Ambiance".
