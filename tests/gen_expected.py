#!/usr/bin/env python3
"""Generate the expected outputs of the MiniPy conformance corpus.

Every tests/conf/NNN_topic.py is run with real CPython
(``python -X utf8 -I``, 10 s timeout). Its stdout is written next to it as
tests/conf/NNN_topic.out (UTF-8, "\\n" line endings).

The script exits with a non-zero status, and names every offending file, when
a program:
  * raises (non-zero exit status) or times out,
  * writes anything to stderr,
  * prints nothing, prints a memory address, or prints a carriage return,
  * prints different text on a second run (for example set iteration order,
    which changes with the per-process hash seed).
No .out file is written for a program that fails.

Usage (from anywhere):
    python tests/gen_expected.py             regenerate every .out
    python tests/gen_expected.py 1?? 80*     only the programs matching the globs
    python tests/gen_expected.py --check     verify the .out files, write nothing
"""

import re
import subprocess
import sys
import time
from pathlib import Path

CONF_DIR = Path(__file__).resolve().parent / "conf"
TIMEOUT_SECONDS = 10
RUNS = 2  # each program is run twice to catch hash-seed dependent output
ADDRESS = re.compile(r" at 0x[0-9A-Fa-f]+")


def run_once(path):
    """Run one program. Return (stdout_text, None) or (None, error_message)."""
    cmd = [sys.executable, "-X", "utf8", "-I", str(path)]
    try:
        proc = subprocess.run(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(CONF_DIR),
            timeout=TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return None, "timed out after %d s" % TIMEOUT_SECONDS
    stderr = proc.stderr.decode("utf-8", "replace").replace("\r\n", "\n").strip()
    if proc.returncode != 0:
        tail = "\n".join(stderr.splitlines()[-6:])
        return None, "exited with status %d\n%s" % (proc.returncode, tail)
    if stderr:
        return None, "wrote to stderr:\n" + "\n".join(stderr.splitlines()[:6])
    try:
        text = proc.stdout.decode("utf-8")
    except UnicodeDecodeError as exc:
        return None, "stdout is not valid UTF-8 (%s)" % exc
    # On Windows the child writes "\r\n" for every "\n"; undo exactly that.
    text = text.replace("\r\n", "\n")
    if "\r" in text:
        return None, "stdout contains a carriage return"
    if not text:
        return None, "printed nothing"
    found = ADDRESS.search(text)
    if found:
        line = text.count("\n", 0, found.start()) + 1
        return None, "prints a memory address (output line %d)" % line
    return text, None


def expected_output(path):
    """Run a program RUNS times. Return (text, None) or (None, error_message)."""
    first = None
    for attempt in range(RUNS):
        text, error = run_once(path)
        if error:
            return None, error
        if attempt == 0:
            first = text
        elif text != first:
            return None, "output differs between two runs (not deterministic)"
    return first, None


def select_programs(patterns):
    programs = sorted(CONF_DIR.glob("*.py"))
    if not patterns:
        return programs
    chosen = []
    for program in programs:
        if any(program.match(p) or program.match(p + ".py") for p in patterns):
            chosen.append(program)
    return chosen


def main(argv):
    args = [a for a in argv if a != "--check"]
    check_only = len(args) != len(argv)
    if not CONF_DIR.is_dir():
        print("ERROR: missing directory %s" % CONF_DIR, file=sys.stderr)
        return 2
    programs = select_programs(args)
    if not programs:
        print("ERROR: no programs found in %s" % CONF_DIR, file=sys.stderr)
        return 2

    failures = []
    written = 0
    started = time.perf_counter()
    for program in programs:
        out_path = program.with_suffix(".out")
        text, error = expected_output(program)
        if error is None and check_only:
            if not out_path.exists():
                error = "missing %s" % out_path.name
            elif out_path.read_bytes() != text.encode("utf-8"):
                error = "%s is out of date" % out_path.name
        if error is not None:
            failures.append((program.name, error))
            print("FAIL  %s: %s" % (program.name, error.splitlines()[0]))
            continue
        if not check_only:
            with open(out_path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(text)
            written += 1
        print("ok    %s (%d lines)" % (program.name, text.count("\n")))

    if not args:
        names = {p.stem for p in programs}
        for stale in sorted(CONF_DIR.glob("*.out")):
            if stale.stem not in names:
                failures.append((stale.name, "no matching .py program"))
                print("FAIL  %s: no matching .py program" % stale.name)

    elapsed = time.perf_counter() - started
    version = "%d.%d.%d" % sys.version_info[:3]
    action = "checked" if check_only else "generated"
    print()
    print("%d programs %s with CPython %s in %.1f s, %d .out files written, %d failed"
          % (len(programs), action, version, elapsed, written, len(failures)))
    if failures:
        print(file=sys.stderr)
        print("ERROR: %d file(s) failed:" % len(failures), file=sys.stderr)
        for name, error in failures:
            print("--- %s" % name, file=sys.stderr)
            for line in error.splitlines():
                print("    " + line, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
