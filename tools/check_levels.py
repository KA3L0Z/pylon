#!/usr/bin/env python3
"""Validate Pylon level files against real CPython.

    python tools/check_levels.py 2 3     # check zones 2 and 3
    python tools/check_levels.py         # check every js/levels-z*.js

For every 'code' level this checks the schema, the HTML in lesson/task/explain/hints,
that the starter code compiles and does NOT already pass, that the reference solution
passes every test, and that the naive solution (if any) passes every non-perf test.
Exit code 0 only when there are no errors.
"""
import contextlib
import io
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, 'tools', 'prelude.py'), encoding='utf-8') as f:
    PRELUDE = f.read()

ALLOWED_TAGS = {'p', 'b', 'i', 'code', 'pre', 'ul', 'ol', 'li'}
INLINE_TAGS = {'b', 'i', 'code'}
ENTITIES = {'lt', 'gt', 'amp', 'quot', 'nbsp', 'times', 'le', 'ge', 'rarr', 'minus'}
REQUIRED = ['id', 'zone', 'order', 'kind', 'title', 'concept', 'difficulty',
            'lesson', 'task', 'starter', 'tests', 'hints', 'solution', 'explain']
TEST_KEYS = {'setup', 'call', 'expect', 'show', 'perf', 'stdout'}
TAG_RE = re.compile(r'<(/?)([a-zA-Z0-9]+)>')


def load_levels(zones):
    cmd = ['node', os.path.join(ROOT, 'tools', 'dump_levels.js')] + [str(z) for z in zones]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    problems = [line for line in r.stderr.splitlines() if line.strip()]
    levels = json.loads(r.stdout) if r.stdout.strip() else []
    return levels, problems


def check_html(text, where, errors, inline_only=False):
    stack = []
    i = 0
    while True:
        i = text.find('<', i)
        if i < 0:
            break
        m = TAG_RE.match(text, i)
        if not m or m.group(2) not in ALLOWED_TAGS:
            snippet = text[max(0, i - 25):i + 25].replace('\n', ' ')
            errors.append(f"{where}: stray '<' near ...{snippet}... (write &lt; in text and code; "
                          f"allowed tags, without attributes: {', '.join(sorted(ALLOWED_TAGS))})")
            i += 1
            continue
        closing, tag = m.group(1), m.group(2)
        if inline_only and tag not in INLINE_TAGS:
            errors.append(f"{where}: <{tag}> is not allowed here (only b, i, code)")
        if closing:
            if not stack or stack[-1] != tag:
                errors.append(f"{where}: </{tag}> does not match an open tag")
            else:
                stack.pop()
        else:
            stack.append(tag)
        i = m.end()
    if stack:
        errors.append(f"{where}: <{stack[-1]}> is never closed")
    if re.search(r'&(?![a-zA-Z]+;|#\d+;)', text):
        errors.append(f"{where}: bare '&' (write &amp;)")
    for m in re.finditer(r'&([a-zA-Z]+);', text):
        if m.group(1) not in ENTITIES:
            errors.append(f"{where}: entity &{m.group(1)}; is not in the allowed list {sorted(ENTITIES)}")
    if '`' in text:
        errors.append(f"{where}: contains a backtick; use <code>...</code>")


def words(html):
    return len(re.sub(r'<[^>]+>', ' ', html).split())


def norm_out(s):
    lines = [line.rstrip() for line in s.replace('\r\n', '\n').split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)


def loose(v):
    """Lists and tuples compare as equal in the game, so normalise both to lists."""
    if isinstance(v, (list, tuple)):
        return [loose(x) for x in v]
    return v


def run_code(src, label):
    ns = {'__name__': '__main__'}
    exec(compile(PRELUDE, 'prelude.py', 'exec'), ns)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        exec(compile(src, label, 'exec'), ns)
    return ns, out.getvalue()


def run_tests(level, src, label, perf=True):
    """Run the level's tests against src. Returns (failures, timings)."""
    fails, timings = [], []
    try:
        ns, out = run_code(src, label)
    except BaseException as e:  # noqa: BLE001 - report anything the code does
        return [f'code raised {type(e).__name__}: {e}'], timings
    for i, t in enumerate(level['tests']):
        name = f'test {i + 1}'
        if 'stdout' in t:
            if norm_out(out) != norm_out(t['stdout']):
                fails.append(f'{name}: printed {out!r}, expected {t["stdout"]!r}')
            continue
        if t.get('perf') and not perf:
            continue
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                if t.get('setup'):
                    exec(compile(t['setup'], f'{label}:{name}:setup', 'exec'), ns)
                t0 = time.perf_counter()
                got = eval(compile(t['call'].strip(), f'{label}:{name}:call', 'eval'), ns)
                dt = time.perf_counter() - t0
                want = eval(compile(t['expect'].strip(), f'{label}:{name}:expect', 'eval'), ns)
        except BaseException as e:  # noqa: BLE001
            fails.append(f'{name}: raised {type(e).__name__}: {e}')
            continue
        if t.get('perf'):
            timings.append((name, dt))
        if loose(got) != loose(want):
            shown = t.get('show') or t['call']
            fails.append(f'{name}: {shown} returned {got!r}, expected {want!r}')
    return fails, timings


def check_level(lv, errors, warnings):
    tag = f"{lv.get('_file', '?')} [{lv.get('id', '?')}]"
    if lv.get('kind') == 'robot':
        return  # robot levels are validated by tools/check_minipy.js
    for key in REQUIRED:
        if key not in lv:
            errors.append(f'{tag}: missing field "{key}"')
    if any(key not in lv for key in REQUIRED):
        return
    if lv['kind'] != 'code':
        return  # robot levels are validated by the game's own tools
    if lv['difficulty'] not in ('Easy', 'Medium', 'Hard'):
        errors.append(f'{tag}: difficulty must be Easy, Medium or Hard')
    if not re.fullmatch(r'z\d-[a-z0-9-]+', lv['id']):
        errors.append(f'{tag}: id must look like z3-two-sum-fast')
    if len(lv['title']) > 30:
        warnings.append(f'{tag}: title is {len(lv["title"])} characters (keep it to 30)')
    if len(lv['concept']) > 44:
        warnings.append(f'{tag}: concept is {len(lv["concept"])} characters (keep it to 44)')

    for field in ('lesson', 'task', 'explain'):
        check_html(lv[field], f'{tag} {field}', errors)
    n = words(lv['lesson'])
    if n < 60 or n > 260:
        warnings.append(f'{tag}: lesson has {n} words (aim for 90-200)')
    if not (2 <= len(lv['hints']) <= 4):
        errors.append(f'{tag}: needs 2 to 4 hints')
    for i, h in enumerate(lv['hints']):
        check_html(h, f'{tag} hint {i + 1}', errors, inline_only=True)

    tests = lv['tests']
    if not isinstance(tests, list) or not tests:
        errors.append(f'{tag}: tests must be a non-empty list')
        return
    stdout_level = any('stdout' in t for t in tests)
    for i, t in enumerate(tests):
        extra = set(t) - TEST_KEYS
        if extra:
            errors.append(f'{tag} test {i + 1}: unknown keys {sorted(extra)}')
        if 'stdout' in t:
            continue
        if 'call' not in t or 'expect' not in t:
            errors.append(f'{tag} test {i + 1}: needs "call" and "expect" (or "stdout")')
            return
    if not stdout_level and not (4 <= len(tests) <= 10):
        warnings.append(f'{tag}: has {len(tests)} tests (aim for 5-8)')
    has_perf = any(t.get('perf') for t in tests)
    if has_perf and not lv.get('naive'):
        errors.append(f'{tag}: has perf tests but no "naive" solution')
    if lv.get('naive') and not has_perf:
        errors.append(f'{tag}: has a "naive" solution but no perf test')

    try:
        compile(lv['starter'], 'starter', 'exec')
    except SyntaxError as e:
        errors.append(f'{tag}: starter does not compile: {e}')
        return
    fails, _ = run_tests(lv, lv['starter'], 'starter', perf=False)
    if not fails:
        errors.append(f'{tag}: the starter code already passes every non-perf test')

    fails, timings = run_tests(lv, lv['solution'], 'solution')
    for msg in fails:
        errors.append(f'{tag}: SOLUTION {msg}')
    for name, dt in timings:
        if dt > 0.05:
            warnings.append(f'{tag}: solution takes {dt * 1000:.0f} ms on perf {name} in CPython; '
                            f'the game interpreter is far slower, so shrink the input')
    if lv.get('naive'):
        fails, _ = run_tests(lv, lv['naive'], 'naive', perf=False)
        for msg in fails:
            errors.append(f'{tag}: NAIVE {msg}')


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    zones = sys.argv[1:]
    levels, problems = load_levels(zones)
    errors, warnings = list(problems), []
    seen_ids, seen_slots = set(), set()
    for lv in levels:
        if lv.get('id') in seen_ids:
            errors.append(f"duplicate id {lv.get('id')}")
        seen_ids.add(lv.get('id'))
        slot = (lv.get('zone'), lv.get('order'))
        if slot in seen_slots:
            errors.append(f"two levels share zone {slot[0]} order {slot[1]}")
        seen_slots.add(slot)
        before = len(errors)
        check_level(lv, errors, warnings)
        status = 'ok  ' if len(errors) == before else 'FAIL'
        print(f"{status} z{lv.get('zone')}.{lv.get('order')} {lv.get('id')}")
    print()
    for w in warnings:
        print('warning:', w)
    for e in errors:
        print('ERROR:', e)
    print(f'\n{len(levels)} levels, {len(errors)} errors, {len(warnings)} warnings')
    sys.exit(1 if errors or not levels else 0)


if __name__ == '__main__':
    main()
