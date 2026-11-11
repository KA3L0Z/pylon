# Pylon

**Play it: https://ka3l0z.github.io/pylon/**

Pylon is a free browser game that teaches Python, from the first function call to classic interview problems. You are the new engineer at a signal tower that has been dark for years. Each platform on the tower is a problem to solve with real code, and each floor you bring back online is a promotion: Trainee, Intern, Junior Engineer, Engineer, Senior Engineer, Staff Engineer.

![A level with the step-by-step view open: a linked list drawn while it is being reversed](docs/level.jpg)

## What is in it

- **48 levels on 6 floors.** Floor 1 is drone puzzles: calls, loops, conditions and your own functions. Floors 2 to 6 are code levels, and 32 of them are well-known interview problems such as Two Sum, Valid Parentheses, Merge Intervals, LRU Cache, Course Schedule and Trapping Rain Water.
- **Real Python, inside the page.** Your code runs on MiniPy, an interpreter for a subset of Python written for this game. Your code never leaves the browser.
- **Step through, with a picture of your data.** Replay any test one line at a time. Lists are drawn as rows of cells with the index variables pointing into them, dictionaries as pairs, linked lists as chains of nodes, and whatever changed is lit.
- **An editor that helps.** Suggestions while you type, each with a one-line reminder of what the function or method does, and syntax problems flagged before you run.
- **Speed tests.** Some tests count the steps your code takes, so a slow algorithm fails even when its answers are right.
- **Daily review.** A solved level comes back after 1 day, then 3, 7, 14, 30 and 60, to be written again from the starting code.
- **Mock interviews.** A timed set of classic problems with no lesson, no hints and no solution, and a report at the end.
- **Lessons you answer.** Lesson examples ask what they will print before they show it.
- **Scratchpad, hints, model solutions, badges and a daily streak**, plus music and sound effects.

![The tower](docs/tower.jpg)

It works on phones too: the layout stacks, the editor gets a row of quick keys and a bar of suggestions above the keyboard, and the 3D view picks a lighter quality tier.

<img src="docs/phone.jpg" alt="The step-by-step view on a phone" width="300">

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
| `js/complete.js` | What the editor suggests at the caret, and the one-line reminders |
| `js/editor.js` | The code editor |
| `js/world.js` | The 3D tower and arenas (three.js): image-based reflections, soft shadows, bloom, filmic tone mapping |
| `js/game.js` | Progress, interface, step-by-step view, reviews, interviews, badges, audio |
| `audio/` | The music track |
| `tools/`, `tests/` | The checks below |

MiniPy covers the language and the standard modules the levels use (math, collections, heapq, itertools, functools, bisect and a few more). Files, `input()`, async code and third-party packages are not included.

Each script link in `index.html` carries a stamp of the file's contents (`js/game.js?v=…`), so a browser never pairs the page with an older cached script. After editing a file in `js/`, refresh the stamps:

    node tools/stamp.js

The 3D picture has three quality tiers. "Auto" starts from the kind of device and steps down by itself if frames stay slow; the Menu lets you pick one.

## Checks

    python tools/check_levels.py     # every model solution passes its tests in real CPython
    node tools/check_minipy.js       # the same inside MiniPy, and the slow solutions fail the speed tests
    node tools/run_conf.js           # 76 small programs: MiniPy's output against CPython's

They were run with Python 3.10 and Node.js 22.

## Notes

The game also runs as a Claude artifact. There, saves sync to the player's Claude account and two more features appear: an opt-in leaderboard and an AI mentor. On this site those are switched off and everything stays in the browser.

Music: "Pythonic Ambiance".
