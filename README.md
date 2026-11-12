# Pylon

**Play it: https://ka3l0z.github.io/pylon/**

Pylon is a free browser game that teaches Python, from the first function call to classic interview problems. You are the new engineer at a signal tower that has been dark for years. Each platform on the tower is a problem to solve with real code, and each floor you bring back online is a promotion: Trainee, Intern, Technician, Junior Engineer, Engineer, Senior Engineer, Staff Engineer, Principal Engineer.

![A level with the step-by-step view open: a linked list drawn while it is being reversed](docs/level.jpg)

## What is in it

- **71 levels on 8 floors.** Floor 1 is drone puzzles: calls, loops, conditions and your own functions. Floors 2 to 8 are code levels, and 46 of them are well-known interview problems such as Two Sum, Valid Parentheses, Merge Intervals, LRU Cache, Course Schedule and Trapping Rain Water.
- **Lessons come one level early.** Every level ends with the briefing for the next one. The level itself explains nothing and never says which tools it needs: you were shown them, and choosing among them is the exercise.
- **A Toolbox of 159 reference cards.** One card per function, method or piece of syntax: what it does, how to call it, and an example with its output. Cards join your Toolbox when you are briefed on them, and you can search it at any time.
- **Craft marks.** A passing answer is also read for how it is written. Four marks, each worth extra XP: concise, clear names, Pythonic, tidy. The notes say which line to change and why.
- **Real Python, inside the page.** Your code runs on MiniPy, an interpreter for a subset of Python written for this game. Your code never leaves the browser.
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

It works on phones too: the layout stacks, the editor gets a row of quick keys and a bar of suggestions above the keyboard, and the 3D view picks a lighter quality tier.

<img src="docs/phone.jpg" alt="A briefing on a phone" width="300">

Progress is saved in your browser (localStorage). There are no accounts.

## What it teaches

| Floor | Rank | Topics |
| --- | --- | --- |
| 1 Boot Deck | Trainee | calling functions, `for` and `while`, `if`/`elif`/`else`, writing a function |
| 2 Logic Gardens | Intern | values and variables, arithmetic, `return`, strings and f-strings, comparisons, `and`/`or`/`not`, lists, nested loops |
| 3 Cipher Hall | Technician | slices, `split`/`join`, searching text, `ord`/`chr`, default and keyword arguments, tuples, `import` and `math`, `try`/`except`/`raise`, debugging |
| 4 Data Vaults | Junior Engineer | sets, `enumerate`/`zip`, dictionaries, comprehensions, `sorted` with a key, `lambda`, `defaultdict` |
| 5 Pattern Forge | Engineer | two pointers, stacks, binary search, bit operations, Kadane's algorithm, sliding windows, prefix products, intervals |
| 6 Structure Works | Senior Engineer | classes, inheritance, recursion, linked lists, binary trees, breadth-first search, binary search trees, `OrderedDict` |
| 7 Path Reactor | Staff Engineer | grids, memoization, dynamic programming in one and two dimensions, greedy choice, flood fill, backtracking, topological order |
| 8 Summit Core | Principal Engineer | generators, decorators, operator methods, tries, heaps, and the hard classics |

The order was checked against the syllabi of CS50's Introduction to Programming with Python, the University of Helsinki Python MOOC, Kaggle Learn, the official Python tutorial, Exercism, freeCodeCamp, Codecademy and Google's Python Class, and against the NeetCode 150 and LeetCode Top Interview 150 lists. Not covered, because the game's interpreter runs inside the page with no files and no network: reading and writing files, CSV and JSON, regular expressions, `input()`, command-line arguments, installing packages and web requests. Also left out: the `match` statement, type hints, properties, and shortest-path algorithms such as Dijkstra's.

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
| `js/levels-z1.js` to `js/levels-z8.js` | The levels: lesson, task, starter code, tests, hints and model solution |
| `js/curriculum.js` | Which floors exist and which levels stand on each, in order. Rebalancing the course is an edit to this one table |
| `js/toolcards.js` | Reference cards for the levels whose files do not carry their own |
| `js/craft.js` | The craft marks: reads a solution through MiniPy's parser and judges length, names, idiom and layout |
| `js/complete.js` | What the editor suggests at the caret, and the one-line reminders |
| `js/editor.js` | The code editor |
| `js/world.js` | The 3D tower and arenas (three.js): image-based reflections, soft shadows, bloom, filmic tone mapping |
| `js/game.js` | Progress, interface, briefings, Toolbox, step-by-step view, reviews, interviews, badges, audio |
| `audio/` | The music track |
| `tools/`, `tests/` | The checks below |

MiniPy covers the language and the standard modules the levels use (math, collections, heapq, itertools, functools, bisect and a few more). Files, `input()`, async code and third-party packages are not included.

Each script link in `index.html` carries a stamp of the file's contents (`js/game.js?v=…`), so a browser never pairs the page with an older cached script. After editing a file in `js/`, refresh the stamps:

    node tools/stamp.js

The 3D picture has three quality tiers. "Auto" starts from the kind of device and steps down by itself if frames stay slow; the Menu lets you pick one.

## Checks

    python tools/check_levels.py      # every model solution passes its tests in real CPython
    node tools/check_minipy.js        # the same inside MiniPy, and the slow solutions fail the speed tests
    node tools/run_conf.js            # 76 small programs: MiniPy's output against CPython's
    node tools/check_curriculum.js    # the course as a whole, in the order the player meets it

The last one enforces the teaching rules. Every function, method and piece of syntax a model solution uses must have a reference card on that level or an earlier one. Every card example and lesson example (259 of them) must print the same thing in MiniPy and in CPython. Every model solution must earn all four craft marks, and a set of deliberately sloppy snippets must lose the right ones.

They were run with Python 3.10 and Node.js 22.

## Notes

The game also runs as a Claude artifact. There, saves sync to the player's Claude account and two more features appear: an opt-in leaderboard and an AI mentor. On this site those are switched off and everything stays in the browser.

A save from the earlier, smaller tower (6 floors, 48 levels) keeps working: solved levels stay solved, the rank is kept, and the new levels appear among the old ones.

Music: "Pythonic Ambiance".
