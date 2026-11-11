# with statements: __enter__ / __exit__ classes and contextlib.contextmanager
from contextlib import contextmanager
class Resource:
    def __init__(self, name, log):
        self.name, self.log = name, log
    def __enter__(self):
        self.log.append("enter " + self.name)
        return self
    def __exit__(self, exc_type, exc, tb):
        kind = exc_type.__name__ if exc_type else "no error"
        self.log.append(f"exit {self.name} ({kind})")
        return False
class Suppress:
    def __init__(self, *types):
        self.types = types
        self.caught = None
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None and issubclass(exc_type, self.types):
            self.caught = exc
            return True
        return False
log = []
with Resource("a", log) as r:
    log.append("body sees " + r.name)
print("basic:", log)
log = []
try:
    with Resource("b", log):
        raise ValueError("inside with")
except ValueError as e:
    log.append("caught " + str(e))
print("exit runs on error:", log)
log = []
with Resource("outer", log) as o, Resource("inner", log) as i:
    log.append("body")
print("two managers exit in reverse:", log)
with Suppress(ZeroDivisionError) as s:
    1 / 0
    print("not reached")
print("suppressed:", type(s.caught).__name__, "| execution continues")
@contextmanager
def tag(name, out):
    out.append(f"<{name}>")
    try:
        yield name.upper()
    finally:
        out.append(f"</{name}>")
@contextmanager
def swallow(kind):
    try:
        yield
    except kind as e:
        print("  swallowed:", type(e).__name__)
out = []
with tag("b", out) as label:
    out.append(label)
print("contextmanager:", out)
out = []
try:
    with tag("i", out), tag("u", out):
        raise RuntimeError("oops")
except RuntimeError:
    out.append("caught")
print("generator finally runs on error:", out)
with swallow(KeyError):
    {}["missing"]
print("after swallow")
