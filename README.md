# Pylon

**Play it: https://ka3l0z.github.io/pylon/**

Pylon is a free browser game that teaches Python, from the first function call to classic interview problems. You are the new engineer at a signal tower that has been dark for years. Each platform on the tower is a problem to solve with real code, and each floor you bring back online is a promotion: Trainee, Intern, Junior Engineer, Engineer, Senior Engineer, Staff Engineer.

![A level with the step-by-step view open](docs/level.jpg)

## What is in it

- **48 levels on 6 floors.** Floor 1 is drone puzzles: calls, loops, conditions and your own functions. Floors 2 to 6 are code levels, and 32 of them are well-known interview problems such as Two Sum, Valid Parentheses, Merge Intervals, LRU Cache, Course Schedule and Trapping Rain Water.
- **Real Python, inside the page.** Your code runs on MiniPy, an interpreter for a subset of Python written for this game. Your code never leaves the browser.
- **Step through.** Replay any test one line at a time and watch every variable change. Linked lists are drawn as chains.
- **Speed tests.** Some tests count the steps your code takes, so a slow algorithm fails even when its answers are right.
- **Scratchpad, hints, model solutions, badges and a daily streak**, plus music and sound effects.

![The tower](docs/tower.jpg)

Progress is saved in your browser (localStorage). There are no accounts.

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
| `js/levels-z1.js` to `js/levels-z6.js` | The levels: lesson, task, starter code, tests, hints and model solution |
| `js/world.js` | The 3D tower and arenas (three.js) |
| `js/editor.js` | The code editor |
| `js/game.js` | Progress, interface, step-by-step view, badges, audio |
| `audio/` | The music track |
| `tools/`, `tests/` | The checks below |

MiniPy covers the language and the standard modules the levels use (math, collections, heapq, itertools, functools, bisect and a few more). Files, `input()`, async code and third-party packages are not included.

## Checks

    python tools/check_levels.py     # every model solution passes its tests in real CPython
    node tools/check_minipy.js       # the same inside MiniPy, and the slow solutions fail the speed tests
    node tools/run_conf.js           # 76 small programs: MiniPy's output against CPython's

They were run with Python 3.10 and Node.js 22.

## Notes

The game also runs as a Claude artifact. There, saves sync to the player's Claude account and two more features appear: an opt-in leaderboard and an AI mentor. On this site those are switched off and everything stays in the browser.

Music: "Pythonic Ambiance".
