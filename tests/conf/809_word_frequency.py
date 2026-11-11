# Word-frequency report with formatted columns
from collections import Counter

TEXT = """The quick brown fox jumps over the lazy dog. The dog barks;
the fox runs away. A quick brown dog? No - the quick brown FOX!
Foxes and dogs: the oldest rivalry in the forest, the fox says."""

def tokenize(text):
    words = []
    for raw in text.lower().split():
        word = raw.strip(".,;:!?-")
        if word:
            words.append(word)
    return words

words = tokenize(TEXT)
counts = Counter(words)
print("total words:", len(words), "| unique:", len(counts))
print("lines:", len(TEXT.splitlines()), "| characters:", len(TEXT))

ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
print(f"{'rank':<5}{'word':<10}{'count':>5}{'share':>8}  bar")
print("-" * 33)
for rank, (word, n) in enumerate(ranked[:8], 1):
    share = n / len(words)
    print(f"{rank:<5}{word:<10}{n:>5}{share:>8.1%}  {'#' * n}")
print("-" * 33)

print("most common, ties by first appearance:", counts.most_common(3))
print("words used once:", sorted(w for w, n in counts.items() if n == 1))
by_length = {}
for word in counts:
    by_length.setdefault(len(word), []).append(word)
for length in sorted(by_length):
    print(f"{length:>2} letters: {', '.join(sorted(by_length[length]))}")
longest = max(counts, key=lambda w: (len(w), w))
print("longest word:", longest, "| average length:", round(sum(len(w) for w in words) / len(words), 2))
first_letters = Counter(w[0] for w in words)
print("top first letters:", sorted(first_letters.items(), key=lambda kv: (-kv[1], kv[0]))[:4])
stop_words = {"the", "a", "and", "in", "no", "over"}
content = [w for w in words if w not in stop_words]
print("without stop words:", Counter(content).most_common(4))
sentences = [s.strip() for s in TEXT.replace("?", ".").replace("!", ".").split(".") if s.strip()]
print("sentences:", len(sentences), "| words in each:", [len(s.split()) for s in sentences])
print("capitalized start:", " ".join(w.capitalize() for w in words[:6]))
manual = {}
for w in words:
    manual[w] = manual.get(w, 0) + 1
print("manual count matches Counter:", manual == dict(counts))
