# Custom exceptions, the built-in hierarchy, raise from, bare raise, e.args
class AppError(Exception):
    pass
class ValidationError(AppError):
    def __init__(self, field, problem):
        super().__init__(f"{field}: {problem}")
        self.field = field
        self.problem = problem
class NotFound(AppError):
    def __str__(self):
        return "not found -> " + str(self.args[0])
try:
    raise AppError("plain custom error")
except AppError as e:
    print("custom:", e, e.args, type(e).__name__)
try:
    raise ValidationError("age", "must be positive")
except AppError as e:
    print("subclass caught by base:", e, "|", e.field, e.problem, e.args)
try:
    raise NotFound("user 7")
except Exception as e:
    print("custom __str__:", e, e.args)
print("custom hierarchy:", issubclass(ValidationError, AppError), issubclass(AppError, Exception),
      isinstance(NotFound("x"), AppError), isinstance(NotFound("x"), ValidationError))
e = ValueError("bad", 42)
print("args:", e.args, str(e), str(ValueError("one")), repr(str(ValueError())))
print("repr:", repr(ValueError("x")), repr(KeyError("k")), repr(AppError("a", 1)))
pairs = [(KeyError, LookupError), (IndexError, LookupError), (ZeroDivisionError, ArithmeticError),
         (OverflowError, ArithmeticError), (NotImplementedError, RuntimeError), (ValueError, Exception),
         (TypeError, Exception), (AttributeError, Exception), (NameError, Exception),
         (StopIteration, Exception), (AssertionError, Exception), (KeyError, ValueError)]
for child, parent in pairs:
    print("issubclass:", child.__name__, parent.__name__, issubclass(child, parent))
def classify(exc):
    try:
        raise exc
    except LookupError:
        return "lookup"
    except ArithmeticError:
        return "arithmetic"
    except RuntimeError:
        return "runtime"
    except Exception:
        return "other"
errors = [KeyError("k"), IndexError(), ZeroDivisionError(), OverflowError("big"), NotImplementedError(),
          ValueError(), RuntimeError()]
print("caught by base class:", [classify(x) for x in errors])
def load(key):
    try:
        return {"a": 1}[key]
    except KeyError as err:
        raise ValidationError(key, "unknown key") from err
def reraise():
    try:
        int("x")
    except ValueError:
        print("  logging, then re-raising")
        raise
try:
    load("zz")
except ValidationError as e:
    print("raise from:", e, "| cause:", type(e.__cause__).__name__, e.__cause__)
try:
    reraise()
except ValueError as e:
    print("bare raise keeps the exception:", type(e).__name__)
