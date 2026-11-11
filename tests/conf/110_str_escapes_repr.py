# String literals: escapes, raw strings, triple quotes, repr quoting rules
print("newline:", "a\nb")
print("tab:", "a\tb")
print("backslash:", "a\\b")
print("quotes:", "say \"hi\"", 'it\'s', "it's", 'say "hi"')
print("lengths:", len("a\nb"), len("a\\nb"), len("\t"), len("\\"), len(""))
print("raw:", r"a\nb", r"C:\temp\new", len(r"\n"))
print("raw equals escaped:", r"\d+" == "\\d+", r"\t" == "\\t", len(r"\\"))
print("hex/unicode escapes:", "\x41", "\u0041", "\x41" == "A")
multi = """line one
line two
    indented line"""
print(multi)
print("triple lines:", multi.split("\n"))
print("triple with quotes:", """He said "it's fine".""")
single = '''triple single
quotes'''
print(single)
continued = """no newline \
after backslash"""
print(continued)
print("leading newline:", repr("""
x"""))
print("continued literal:", "abc" \
      "def")
long_text = ("implicit "
             "concatenation "
             "across lines")
print(long_text)

print("repr simple:", repr("abc"), repr(""), repr("a b"))
print("repr with single quote:", repr("it's"))
print("repr with double quote:", repr('say "hi"'))
print("repr with both:", repr("it's \"x\""))
print("repr escapes:", repr("a\nb"), repr("tab\there"), repr("back\\slash"))
print("repr carriage return:", repr("a\rb"))
print("repr in containers:", ["it's", 'q"q', "a\nb"], ("x",), {"k": "v\t"})
print("str vs repr:", str("hi"), repr("hi"), str(repr("hi")))
print("repr of repr:", repr(repr("a")))
print("repr numbers:", repr(1), repr(1.5), repr(True), repr(None))
print("repr nested:", repr([1, "two", (3.0, None)]))
print("f-string !r:", f"{'text'!r}", f"{'it' + chr(39) + 's'!r}")
print("format %r:", "%r and %s" % ("a", "a"))
print("escaped braces:", "{{}}".format(), f"{{literal}}")
print("backslash at end:", "path\\", len("path\\"))
print("tab aligned:\n\tindented\n\t\ttwice")
print("char codes:", ord("\n"), ord("\t"), ord("\\"), ord("'"), ord('"'))
print("escaped quote equals other style:", 'a\'b' == "a'b", "a\"b" == 'a"b')
print("join with escapes:", "\\".join(["a", "b"]), "\n".join(["x", "y"]).count("\n"))
print("triple one-liner:", """  spaces kept  """.strip())
print("a", "b", sep="\n")
text = 'mixed "double" and \'single\''
print("mixed quotes:", text, len(text))
print("repr of mixed:", repr(text))
print("newline count:", "one\ntwo\nthree".count("\n"), len("one\ntwo".split("\n")))
print("unknown escape is kept by raw:", r"\q", len(r"\q"))
