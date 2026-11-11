/* Pylon levels, zone 3: Data Vaults (collections and Python idioms).
   Format and field notes: tools/level-example.js.
   Validate with: python tools/check_levels.py 3 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z3-rotate-array',
      zone: 3,
      order: 1,
      kind: 'code',
      title: 'Turn the Lock Ring',
      concept: 'Slicing and negative indexes',
      classic: 'Rotate Array (LeetCode #189)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A negative index counts from the end: <code>a[-1]</code> is the last item and <code>a[-2]</code> is the one before it. This works on lists and on strings.</p>
<p>A <b>slice</b> copies a run of items into a new list. <code>a[start:stop]</code> begins at index <code>start</code> and ends just before <code>stop</code>. Leave one side empty to go all the way to that end. A third number sets the step, and a step of -1 walks backwards.</p>
<pre><code>a = ["A", "B", "C", "D", "E"]
print(a[1:4])            # ['B', 'C', 'D']
print(a[:2])             # ['A', 'B'], the first two
print(a[-2:])            # ['D', 'E'], the last two
print(a[::-1])           # ['E', 'D', 'C', 'B', 'A'], a reversed copy
print(a[:2] + a[-2:])    # ['A', 'B', 'D', 'E'], + joins two lists</code></pre>
<p>A function that receives a list works on the caller's own list. To replace its contents, assign to the full slice <code>items[:]</code>. Plain <code>items = ...</code> only points the name at a different list, and the caller never sees it.</p>
<pre><code>def reverse_in_place(items):
    items[:] = items[::-1]     # same list, new contents

row = [1, 2, 3]
reverse_in_place(row)
print(row)                     # [3, 2, 1]</code></pre>`,
      task: py`
<p>The vault lock is a ring of numbered plates. Write <code>rotate(nums, k)</code>. It turns the list <code>k</code> steps to the right. One step moves the last item to the front.</p>
<p>Change <code>nums</code> itself and return nothing. The tests call your function and then look at the list.</p>
<pre><code>nums = [1, 2, 3, 4, 5, 6, 7]
rotate(nums, 3)
print(nums)                  # [5, 6, 7, 1, 2, 3, 4]</code></pre>
<p><code>nums</code> has at least one item. <code>k</code> is 0 or more and can be larger than the list: on a ring of 3 plates, 4 steps end where 1 step does.</p>`,
      starter: py`def rotate(nums, k):
    # Cut the list in two with slices and write the pieces back into nums[:].
    pass
`,
      tests: [
        {
          call: py`inplace(rotate, [1, 2, 3, 4, 5, 6, 7], 3)`,
          expect: py`[5, 6, 7, 1, 2, 3, 4]`,
          show: py`nums = [1, 2, 3, 4, 5, 6, 7]; rotate(nums, 3); nums`,
        },
        {
          call: py`inplace(rotate, [-1, -100, 3, 99], 2)`,
          expect: py`[3, 99, -1, -100]`,
          show: py`nums = [-1, -100, 3, 99]; rotate(nums, 2); nums`,
        },
        {
          call: py`inplace(rotate, [1, 2, 3], 0)`,
          expect: py`[1, 2, 3]`,
          show: py`nums = [1, 2, 3]; rotate(nums, 0); nums`,
        },
        {
          call: py`inplace(rotate, [1, 2, 3], 4)`,
          expect: py`[3, 1, 2]`,
          show: py`nums = [1, 2, 3]; rotate(nums, 4); nums`,
        },
        {
          call: py`inplace(rotate, [1, 2, 3, 4], 4)`,
          expect: py`[1, 2, 3, 4]`,
          show: py`nums = [1, 2, 3, 4]; rotate(nums, 4); nums`,
        },
        {
          call: py`inplace(rotate, [7], 5)`,
          expect: py`[7]`,
          show: py`nums = [7]; rotate(nums, 5); nums`,
        },
        {
          call: py`inplace(rotate, [1, 2], 3)`,
          expect: py`[2, 1]`,
          show: py`nums = [1, 2]; rotate(nums, 3); nums`,
        },
        {
          call: py`inplace(rotate, [1, 2, 3, 4, 5], 12)`,
          expect: py`[4, 5, 1, 2, 3]`,
          show: py`nums = [1, 2, 3, 4, 5]; rotate(nums, 12); nums`,
        },
      ],
      hints: [
        py`After a turn of <code>k</code> steps, the last <code>k</code> items sit at the front and everything else follows in its old order.`,
        py`<code>nums[-k:]</code> is the last <code>k</code> items and <code>nums[:-k]</code> is everything before them. First shrink <code>k</code> with <code>k % len(nums)</code>, so that a turn longer than the ring wraps around.`,
        py`Two lines: <code>k = k % len(nums)</code>, then assign <code>nums[-k:] + nums[:-k]</code> to <code>nums[:]</code>. Writing <code>nums = ...</code> instead would leave the caller's list untouched.`,
      ],
      solution: py`def rotate(nums, k):
    k = k % len(nums)                  # full turns change nothing
    nums[:] = nums[-k:] + nums[:-k]    # last k items first, then the rest
`,
      explain: py`
<p><code>k % len(nums)</code> throws away full turns, so <code>k</code> ends up between 0 and the length minus 1. <code>nums[-k:]</code> copies the last <code>k</code> items and <code>nums[:-k]</code> copies everything before them. Joined in that order they are the rotated list, and assigning to <code>nums[:]</code> writes it into the list the caller owns.</p>
<p>When <code>k</code> is 0 the same line still works: <code>nums[-0:]</code> is the whole list and <code>nums[:-0]</code> is empty.</p>
<p>The cost is one pass to copy the items and one to write them back, plus a temporary list as long as <code>nums</code>. A well-known follow-up avoids the temporary list: reverse the whole list, then reverse the first <code>k</code> items and the rest separately.</p>`,
    },
    {
      id: 'z3-sorted-squares',
      zone: 3,
      order: 2,
      kind: 'code',
      title: 'Squared Signals',
      concept: 'List comprehensions and sorted',
      classic: 'Squares of a Sorted Array (LeetCode #977)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Building a list with a loop and <code>append</code> takes three lines. A <b>list comprehension</b> does the same job in one. <code>[c * 2 for c in charges]</code> reads: take each <code>c</code> in <code>charges</code> and put <code>c * 2</code> into a new list. An <code>if</code> at the end keeps only the items that pass a test.</p>
<pre><code>charges = [40, 5, 90, 12]
doubled = [c * 2 for c in charges]
print(doubled)                          # [80, 10, 180, 24]
low = [c for c in charges if c &lt; 20]
print(low)                              # [5, 12]</code></pre>
<p><code>sorted()</code> takes a list and returns a new list in ascending order. The original list stays as it was. Add <code>reverse=True</code> for descending order.</p>
<pre><code>print(sorted(charges))                  # [5, 12, 40, 90]
print(sorted(charges, reverse=True))    # [90, 40, 12, 5]
print(charges)                          # [40, 5, 90, 12]</code></pre>`,
      task: py`
<p>A sensor sends its readings sorted from lowest to highest, and some of them are negative. The vault stores the square of each reading. Write <code>sorted_squares(nums)</code>. <code>nums</code> is in ascending order. Return a new list that holds the square of every number, also in ascending order.</p>
<pre><code>sorted_squares([-4, -1, 0, 3, 10])   # [0, 1, 9, 16, 100]
sorted_squares([-7, -3, 2, 3, 11])   # [4, 9, 9, 49, 121]</code></pre>
<p>Squaring can change the order: -4 comes before -1, and 16 comes after 1.</p>`,
      starter: py`def sorted_squares(nums):
    # Square every number with a comprehension, then sort the result.
    pass
`,
      tests: [
        { call: py`sorted_squares([-4, -1, 0, 3, 10])`, expect: py`[0, 1, 9, 16, 100]` },
        { call: py`sorted_squares([-7, -3, 2, 3, 11])`, expect: py`[4, 9, 9, 49, 121]` },
        { call: py`sorted_squares([5])`, expect: py`[25]` },
        { call: py`sorted_squares([-5, -3, -1])`, expect: py`[1, 9, 25]` },
        { call: py`sorted_squares([1, 2, 3])`, expect: py`[1, 4, 9]` },
        { call: py`sorted_squares([-2, -2, 0, 2, 2])`, expect: py`[0, 4, 4, 4, 4]` },
        { call: py`sorted_squares([-10, 0, 0, 1])`, expect: py`[0, 0, 1, 100]` },
      ],
      hints: [
        py`Do it in two steps: make a list of the squares, then put that list in order.`,
        py`A comprehension can build the list of squares in one line, the way the lesson builds <code>doubled</code>. <code>sorted()</code> then returns the squares in ascending order.`,
        py`The whole body can be one <code>return</code>: <code>sorted()</code> wrapped around <code>[n * n for n in nums]</code>.`,
      ],
      solution: py`def sorted_squares(nums):
    squares = [n * n for n in nums]    # negatives square large, so order can break
    return sorted(squares)
`,
      explain: py`
<p>The comprehension squares every number in one pass. Negative numbers turn positive, so the squares can come out in the wrong order, and <code>sorted()</code> puts them right.</p>
<p>Sorting is the expensive step, because it has to compare items many times over. A faster version uses the fact that the input is already sorted: the largest square always comes from one of the two ends of the list. Keep one index at each end, take the larger square, move that index inward, and fill the result from the back. That <b>two-pointer</b> walk visits each number once and needs no sort.</p>
<p>Both versions pass here. On a very long list the two-pointer walk does less work.</p>`,
    },
    {
      id: 'z3-valid-anagram',
      zone: 3,
      order: 3,
      kind: 'code',
      title: 'Scrambled Shards',
      concept: 'Dictionaries: get and counting',
      classic: 'Valid Anagram (LeetCode #242)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A <b>dictionary</b> stores pairs: a <b>key</b> and the value that belongs to it. You write one in curly brackets with a colon inside each pair. You look a value up by its key, much as you look a list item up by its index.</p>
<pre><code>stock = {"cells": 12, "relays": 3}
print(stock["cells"])            # 12
stock["beacons"] = 1             # a new key adds a pair
stock["cells"] = 11              # an existing key replaces its value
print(len(stock))                # 3</code></pre>
<p>Reading a missing key with square brackets is an error. <code>get</code> is the safe way to read: it returns the value, or a default of your choice when the key is absent. That makes counting short.</p>
<pre><code>print(stock.get("drones", 0))    # 0
counts = {}
for vote in ["red", "blue", "red"]:
    counts[vote] = counts.get(vote, 0) + 1
print(counts)                    # {'red': 2, 'blue': 1}</code></pre>
<p>Two dictionaries are equal under <code>==</code> when they hold the same keys with the same values.</p>
<p>A <code>for</code> loop also works on a string: it gives you the characters one at a time.</p>`,
      task: py`
<p>Two data shards hold the same data when one label is a rearrangement of the other. Write <code>is_anagram(s, t)</code>. Both arguments are strings of lower-case letters. Return <code>True</code> if <code>t</code> uses exactly the same letters as <code>s</code>, each the same number of times, and <code>False</code> if it does not.</p>
<pre><code>is_anagram("anagram", "nagaram")   # True
is_anagram("rat", "car")           # False</code></pre>`,
      starter: py`def is_anagram(s, t):
    # Count the letters of each string in a dictionary, then compare the counts.
    pass
`,
      tests: [
        { call: py`is_anagram("anagram", "nagaram")`, expect: py`True` },
        { call: py`is_anagram("rat", "car")`, expect: py`False` },
        { call: py`is_anagram("a", "a")`, expect: py`True` },
        { call: py`is_anagram("ab", "a")`, expect: py`False` },
        { call: py`is_anagram("a", "ab")`, expect: py`False` },
        { call: py`is_anagram("aab", "abb")`, expect: py`False` },
        { call: py`is_anagram("listen", "silent")`, expect: py`True` },
        { call: py`is_anagram("dot", "net")`, expect: py`False` },
      ],
      hints: [
        py`Two strings are anagrams when every letter appears the same number of times in both. So count the letters.`,
        py`Build one dictionary of letter counts for <code>s</code> and another for <code>t</code>, using the <code>get</code> pattern from the lesson on each character.`,
        py`Write the counting loop twice, or once in a small helper function that takes a string and returns its dictionary. Then <code>return</code> the result of comparing the two dictionaries with <code>==</code>.`,
      ],
      solution: py`def count_letters(text):
    counts = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1    # 0 the first time a letter appears
    return counts


def is_anagram(s, t):
    # Anagrams have exactly the same letter counts.
    return count_letters(s) == count_letters(t)
`,
      explain: py`
<p>Apart from the order of its letters, a word is fully described by how many times each letter occurs. <code>count_letters</code> builds that description. <code>get(ch, 0)</code> reads the count so far, or 0 for a letter it has not met yet.</p>
<p>Two strings are anagrams exactly when their counts match, and <code>==</code> compares the two dictionaries key by key. Strings of different lengths can never produce equal counts, so no separate length check is needed.</p>
<p>The cost is one pass over each string. The dictionaries stay small, because there are only 26 letters.</p>
<p>Another correct answer is <code>sorted(s) == sorted(t)</code>, because <code>sorted</code> also accepts a string and returns its letters as a sorted list. It is shorter, and it does more work, since sorting compares letters many times.</p>`,
    },
    {
      id: 'z3-contains-duplicate',
      zone: 3,
      order: 4,
      kind: 'code',
      title: 'No Two Alike',
      concept: 'Sets: membership and uniqueness',
      classic: 'Contains Duplicate (LeetCode #217)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A <b>set</b> is a collection that holds each value at most once. Adding a value that is already there changes nothing.</p>
<pre><code>seen = set()           # an empty set ({} is an empty dictionary)
seen.add(4)
seen.add(9)
seen.add(4)            # already present, ignored
print(len(seen))       # 2
print(9 in seen)       # True
print(5 in seen)       # False</code></pre>
<p><code>in</code> is the reason to use a set. On a list, <code>in</code> checks the items one by one until it finds a match. A set answers in a single step, whether it holds ten values or ten thousand.</p>
<p><code>set()</code> also converts a list or a string, dropping the repeats on the way. You can write a set out directly with curly brackets.</p>
<pre><code>print(len(set("banana")))    # 3, the letters b, a and n
tags = {"red", "blue"}</code></pre>
<p>A set has no order and no indexes. Reach for it when you only need to know whether a value is present, or how many different values there are.</p>`,
      task: py`
<p>Every data shard in a vault needs its own serial number. Write <code>contains_duplicate(nums)</code>. Return <code>True</code> if the list holds the same value more than once, and <code>False</code> if all of its values are different.</p>
<pre><code>contains_duplicate([1, 2, 3, 1])   # True
contains_duplicate([1, 2, 3, 4])   # False</code></pre>
<p>The last test has 2,000 serial numbers and a step limit. Comparing every pair of shards is too slow for it. A set is fast enough.</p>`,
      starter: py`def contains_duplicate(nums):
    # Remember the values you have already seen in a set.
    pass
`,
      tests: [
        { call: py`contains_duplicate([1, 2, 3, 1])`, expect: py`True` },
        { call: py`contains_duplicate([1, 2, 3, 4])`, expect: py`False` },
        { call: py`contains_duplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2])`, expect: py`True` },
        { call: py`contains_duplicate([7])`, expect: py`False` },
        { call: py`contains_duplicate([])`, expect: py`False` },
        { call: py`contains_duplicate([-2, 2, 0])`, expect: py`False` },
        { call: py`contains_duplicate([5, 6, 7, 7])`, expect: py`True` },
        {
          setup: py`serials = list(range(2000))`,
          call: py`contains_duplicate(serials)`,
          expect: py`False`,
          show: py`contains_duplicate([0, 1, 2, ..., 1999])`,
          perf: true,
        },
      ],
      hints: [
        py`Walk through the list once. For each value, the only question is whether you have met it before.`,
        py`Keep a set of the values seen so far. Before you add a value, test whether it is already in the set. If it is, you have found a duplicate.`,
        py`Start with <code>seen = set()</code>. In the loop, return <code>True</code> if <code>n in seen</code>, and call <code>seen.add(n)</code> if it is not. Return <code>False</code> after the loop, once every value has passed the test.`,
      ],
      solution: py`def contains_duplicate(nums):
    seen = set()
    for n in nums:
        if n in seen:        # one step, however large the set is
            return True
        seen.add(n)
    return False             # every value was new
`,
      naive: py`def contains_duplicate(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False
`,
      explain: py`
<p>The set holds every value met so far. <code>n in seen</code> takes one step however large the set is, so each value costs one question and at most one <code>add</code>. The first repeated value ends the function with <code>True</code>. If the loop finishes, no value was met twice.</p>
<p>That is a single pass. For 2,000 serial numbers it means about 2,000 lookups, where the nested loops need about two million comparisons. The price is memory: the set can grow as large as the list.</p>
<p>A shorter version is <code>len(set(nums)) != len(nums)</code>. Converting to a set drops repeats, so a shorter set means a duplicate existed. It always reads the whole list, while the loop can stop early.</p>`,
    },
    {
      id: 'z3-two-sum-fast',
      zone: 3,
      order: 5,
      kind: 'code',
      title: 'Pair the Power Cells II',
      concept: 'Dictionary lookups and Big-O',
      classic: 'Two Sum (LeetCode #1)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Your nested loops from the Logic Gardens check every pair of cells. With 2,000 cells that is about two million checks, and the vault door will not wait that long.</p>
<p>A <b>dictionary</b> finds a key in one step, however many keys it holds. So remember each number you have seen, together with its position:</p>
<pre><code>seen = {}            # value -&gt; index
seen[7] = 0
print(3 in seen)     # False, answered in one step
print(seen[7])       # 0</code></pre>
<p>Walk the list once. For each number, the partner you need is <code>target - number</code>. If the partner is already in <code>seen</code>, you are done. If it is not, store the current number and move on.</p>
<p>Engineers describe this difference with <b>Big-O</b>. The nested loops take <code>O(n²)</code> steps: double the cells and the work grows four times. The dictionary version takes <code>O(n)</code> steps: double the cells and the work only doubles.</p>`,
      task: py`
<p>Write <code>two_sum(nums, target)</code>. Return the indexes of the two numbers in <code>nums</code> that add up to <code>target</code>, smaller index first.</p>
<p>Exactly one pair works, and one cell cannot be used twice.</p>
<pre><code>two_sum([2, 7, 11, 15], 9)   # [0, 1]
two_sum([3, 2, 4], 6)        # [1, 2]</code></pre>
<p>The last test has 2,000 cells and a step limit. Only a single pass through the list is fast enough.</p>`,
      starter: py`def two_sum(nums, target):
    # Walk the list once. Remember what you have seen in a dictionary.
    pass
`,
      tests: [
        { call: py`two_sum([2, 7, 11, 15], 9)`, expect: py`[0, 1]` },
        { call: py`two_sum([3, 2, 4], 6)`, expect: py`[1, 2]` },
        { call: py`two_sum([3, 3], 6)`, expect: py`[0, 1]` },
        { call: py`two_sum([-4, 10, 1, 9, -6], 3)`, expect: py`[3, 4]` },
        { call: py`two_sum([0, 4, 3, 0], 0)`, expect: py`[0, 3]` },
        {
          setup: py`cells = list(range(1, 2001))`,
          call: py`two_sum(cells, 3999)`,
          expect: py`[1998, 1999]`,
          show: py`two_sum([1, 2, 3, ..., 2000], 3999)`,
          perf: true,
        },
      ],
      hints: [
        py`For each number <code>n</code>, the partner you need is <code>target - n</code>. The question becomes: have I already seen that partner?`,
        py`Keep a dictionary that maps each value to its index. Check for the partner <b>before</b> you store the current number, so a cell never pairs with itself.`,
        py`Loop with <code>for i, n in enumerate(nums)</code>. If <code>target - n</code> is in the dictionary, return <code>[seen[target - n], i]</code>. Otherwise set <code>seen[n] = i</code>.`,
      ],
      solution: py`def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, n in enumerate(nums):
        partner = target - n
        if partner in seen:
            return [seen[partner], i]
        seen[n] = i
`,
      naive: py`def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
`,
      explain: py`
<p>The dictionary replaces the inner loop. Asking <code>partner in seen</code> takes one step, so the whole list is handled in a single pass.</p>
<p>Checking before storing matters: in <code>[3, 3]</code> with target 6, the second 3 finds the first one, and no cell is paired with itself.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(n)</code> extra space. You spend memory on the dictionary to save time, a trade you will make again and again.</p>`,
    },
    {
      id: 'z3-top-k-frequent',
      zone: 3,
      order: 6,
      kind: 'code',
      title: 'Busiest Channels',
      concept: 'Sorting with key= and lambda; tuples',
      classic: 'Top K Frequent Elements (LeetCode #347)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A <b>tuple</b> is a fixed group of values in parentheses, such as <code>("B", 95)</code>. You read its parts by index, like a list, and it cannot be changed once made. Tuples suit small records.</p>
<p><code>sorted()</code> accepts a <code>key</code>: a function it calls on every item to get the value to sort by. A <code>lambda</code> is a small function with no name, written right where it is needed. <code>lambda cell: cell[1]</code> means: given <code>cell</code>, return <code>cell[1]</code>.</p>
<pre><code>cells = [("A", 40), ("B", 95), ("C", 70)]    # (name, charge)
ranked = sorted(cells, key=lambda cell: cell[1], reverse=True)
print(ranked)          # [('B', 95), ('C', 70), ('A', 40)]
print(ranked[0][0])    # B, the name of the strongest cell</code></pre>
<p>Sorting by a key changes the order of the items and leaves each item as it was.</p>
<p>A dictionary can hand you its contents as tuples. <code>items()</code> gives one <code>(key, value)</code> pair per entry, ready to loop over or to sort.</p>
<pre><code>stock = {"cells": 12, "relays": 3}
for pair in stock.items():
    print(pair)        # ('cells', 12), then ('relays', 3)</code></pre>`,
      task: py`
<p>The vault log is a list of channel numbers, one entry for every signal received. Write <code>top_k_frequent(nums, k)</code>. Return a list of the <code>k</code> values that appear most often in <code>nums</code>. The order of the values in your list does not matter.</p>
<pre><code>top_k_frequent([1, 1, 1, 2, 2, 3], 2)   # [1, 2] or [2, 1]
top_k_frequent([1], 1)                  # [1]</code></pre>
<p><code>k</code> is at least 1 and at most the number of different values. There is never a tie for the last place, so the answer is always unique.</p>`,
      starter: py`def top_k_frequent(nums, k):
    # Count each value, sort the values by their count, keep the first k.
    pass
`,
      tests: [
        {
          call: py`sorted(top_k_frequent([1, 1, 1, 2, 2, 3], 2))`,
          expect: py`[1, 2]`,
          show: py`top_k_frequent([1, 1, 1, 2, 2, 3], 2), sorted`,
        },
        {
          call: py`sorted(top_k_frequent([1], 1))`,
          expect: py`[1]`,
          show: py`top_k_frequent([1], 1), sorted`,
        },
        {
          call: py`sorted(top_k_frequent([4, 4, 4, 6, 6, 6, 6, 5], 1))`,
          expect: py`[6]`,
          show: py`top_k_frequent([4, 4, 4, 6, 6, 6, 6, 5], 1), sorted`,
        },
        {
          call: py`sorted(top_k_frequent([3, 0, 1, 0, 3, 0, 3, 3], 2))`,
          expect: py`[0, 3]`,
          show: py`top_k_frequent([3, 0, 1, 0, 3, 0, 3, 3], 2), sorted`,
        },
        {
          call: py`sorted(top_k_frequent([-1, -1, 2, 2, 2, 3], 2))`,
          expect: py`[-1, 2]`,
          show: py`top_k_frequent([-1, -1, 2, 2, 2, 3], 2), sorted`,
        },
        {
          call: py`sorted(top_k_frequent([5, 5, 7, 7, 7, 9], 3))`,
          expect: py`[5, 7, 9]`,
          show: py`top_k_frequent([5, 5, 7, 7, 7, 9], 3), sorted`,
        },
        {
          call: py`sorted(top_k_frequent([8, 9, 9, 8, 9, 7, 8, 9, 7, 6], 3))`,
          expect: py`[7, 8, 9]`,
          show: py`top_k_frequent([8, 9, 9, 8, 9, 7, 8, 9, 7, 6], 3), sorted`,
        },
      ],
      hints: [
        py`This is two jobs in a row: count how often each value appears, then rank the values by that count.`,
        py`Count with a dictionary, as you did for the scrambled shards. Then sort <code>counts.items()</code> with a <code>key</code> that picks the count out of each <code>(value, count)</code> pair, largest first.`,
        py`<code>sorted(counts.items(), key=lambda pair: pair[1], reverse=True)</code> gives the pairs in rank order. Slice off the first <code>k</code> and return only <code>pair[0]</code>, the value, from each.`,
      ],
      solution: py`def top_k_frequent(nums, k):
    counts = {}
    for n in nums:
        counts[n] = counts.get(n, 0) + 1
    # (value, count) pairs, highest count first
    ranked = sorted(counts.items(), key=lambda pair: pair[1], reverse=True)
    return [pair[0] for pair in ranked[:k]]
`,
      explain: py`
<p>The dictionary turns the log into <code>(value, count)</code> pairs, one for each different value. Sorting the pairs with <code>key=lambda pair: pair[1]</code> and <code>reverse=True</code> puts the most frequent value first. The first <code>k</code> pairs are the answer, and <code>pair[0]</code> picks the value out of each.</p>
<p><b>Cost:</b> counting is <code>O(n)</code>. Sorting is the larger part: sorting <code>n</code> items takes <code>O(n log n)</code> time, which grows a little faster than <code>O(n)</code> and far slower than <code>O(n²)</code>. The dictionary and the sorted list need <code>O(n)</code> extra space.</p>
<p><code>collections.Counter(nums)</code> builds the same dictionary in one call, and its <code>most_common(k)</code> method does the ranking for you.</p>`,
    },
    {
      id: 'z3-max-profit',
      zone: 3,
      order: 7,
      kind: 'code',
      title: 'Buy Low, Sell High',
      concept: 'Best-so-far in one pass',
      classic: 'Best Time to Buy and Sell Stock (LeetCode #121)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>Many questions about a list can be answered in one pass if you carry the <b>best value so far</b> in a variable and update it at every step.</p>
<p>Two tools keep that tidy. <b>Unpacking</b> assigns several names in one line: <code>a, b = 1, 2</code> gives <code>a</code> the 1 and <code>b</code> the 2. <code>enumerate</code> walks a list and gives you <code>(index, item)</code> pairs, which unpack straight into two loop variables.</p>
<pre><code>readings = [12, 30, 7, 25]
best_day, best = 0, readings[0]       # two assignments in one line
for day, value in enumerate(readings):
    if value &gt; best:
        best_day, best = day, value
print(best_day, best)                 # 1 30</code></pre>
<p>When you only need the value, <code>min</code> and <code>max</code> do the comparing. Given two arguments, they return the smaller or the larger one.</p>
<pre><code>lowest = readings[0]
for value in readings:
    lowest = min(lowest, value)       # the smallest reading so far
print(lowest)                         # 7</code></pre>
<p>At every point in the loop, <code>lowest</code> is the right answer for the part of the list already visited.</p>`,
      task: py`
<p>The price of a power cell changes every day, and <code>prices[i]</code> is the price on day <code>i</code>. You may buy one cell on one day and sell it on a later day. Write <code>max_profit(prices)</code>. Return the largest profit you can make, or <code>0</code> if no trade makes a profit.</p>
<pre><code>max_profit([7, 1, 5, 3, 6, 4])   # 5, buy at 1 and sell at 6
max_profit([7, 6, 4, 3, 1])      # 0, the price only falls</code></pre>
<p>The last test has 2,000 days and a step limit. Trying every pair of days is <code>O(n²)</code> and too slow for it. One pass is fast enough.</p>`,
      starter: py`def max_profit(prices):
    # One pass: track the lowest price so far and the best profit so far.
    pass
`,
      tests: [
        { call: py`max_profit([7, 1, 5, 3, 6, 4])`, expect: py`5` },
        { call: py`max_profit([7, 6, 4, 3, 1])`, expect: py`0` },
        { call: py`max_profit([5])`, expect: py`0` },
        { call: py`max_profit([1, 2])`, expect: py`1` },
        { call: py`max_profit([2, 4, 1])`, expect: py`2` },
        { call: py`max_profit([3, 3, 3])`, expect: py`0` },
        { call: py`max_profit([3, 8, 1, 9])`, expect: py`8` },
        {
          setup: py`prices = list(range(2000, 1000, -1)) + list(range(1, 1001))`,
          call: py`max_profit(prices)`,
          expect: py`999`,
          show: py`max_profit([2000, 1999, ..., 1001, 1, 2, ..., 1000])`,
          perf: true,
        },
      ],
      hints: [
        py`Imagine selling on each day in turn. The best day to have bought is the cheapest day before it, and that is one number you can carry along.`,
        py`Carry two values through a single loop: the lowest price so far and the best profit so far. On each day, update the lowest price, then work out what selling today would earn.`,
        py`Start with <code>lowest = prices[0]</code> and <code>best = 0</code>. For each price: <code>lowest = min(lowest, price)</code>, then <code>best = max(best, price - lowest)</code>. Return <code>best</code>.`,
      ],
      solution: py`def max_profit(prices):
    lowest, best = prices[0], 0              # cheapest day so far, best profit so far
    for price in prices:
        lowest = min(lowest, price)
        best = max(best, price - lowest)     # sell today, having bought at the lowest
    return best
`,
      naive: py`def max_profit(prices):
    best = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            if prices[j] - prices[i] > best:
                best = prices[j] - prices[i]
    return best
`,
      explain: py`
<p>For any selling day, the best buying day is the cheapest day up to that point. The loop keeps that one number in <code>lowest</code> and never looks back at earlier prices. <code>price - lowest</code> is the most you could earn by selling today, and <code>best</code> remembers the largest such value.</p>
<p>Updating <code>lowest</code> first is safe: buying and selling on the same day earns 0, which never beats a real profit. Starting <code>best</code> at 0 covers a price that only falls.</p>
<p><b>Cost:</b> <code>O(n)</code> time for the single pass, and <code>O(1)</code> extra space, meaning two variables are enough however long the list is. Trying every pair of days takes <code>O(n²)</code> time.</p>`,
    },
    {
      id: 'z3-group-anagrams',
      zone: 3,
      order: 8,
      kind: 'code',
      title: 'Shelve the Shards',
      concept: 'Dictionaries of lists, defaultdict',
      classic: 'Group Anagrams (LeetCode #49)',
      difficulty: 'Medium',
      boss: true,
      lesson: py`
<p>The values in a dictionary can be lists. That makes the dictionary a row of labelled bins: each key names a group, and its list holds the members.</p>
<p>With a plain dictionary you have to create the empty list the first time a key shows up. <code>defaultdict(list)</code> does it for you: using a missing key creates an empty list on the spot. It lives in the <code>collections</code> module, so import it first.</p>
<pre><code>from collections import defaultdict

bins = defaultdict(list)
for word in ["relay", "beacon", "rotor", "bolt"]:
    bins[word[0]].append(word)      # group by first letter
print(bins["r"])                    # ['relay', 'rotor']
print(list(bins.values()))          # [['relay', 'rotor'], ['beacon', 'bolt']]</code></pre>
<p><code>values()</code> gives every list in the dictionary, and <code>list()</code> gathers them into one list of groups.</p>
<p>A key must be a value that cannot change. Strings, numbers and tuples all qualify. A list cannot be a key, and <code>tuple(some_list)</code> turns one into a tuple that can.</p>
<pre><code>by_shape = defaultdict(list)
for word in ["relay", "bolt", "rotor"]:
    key = (word[0], len(word))      # a tuple as the key
    by_shape[key].append(word)
print(by_shape[("r", 5)])           # ['relay', 'rotor']</code></pre>`,
      task: py`
<p>Shards whose labels are anagrams of each other belong on the same shelf. Write <code>group_anagrams(words)</code>. Return a list of groups. Each group is a list of the words that are anagrams of one another, and every word goes into exactly one group.</p>
<pre><code>group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
# [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]</code></pre>
<p>The groups can come in any order, and so can the words inside a group. A word with no partner forms a group of one. If a word appears twice, keep both copies. Words are made of lower-case letters, and a word can be empty.</p>`,
      starter: py`def group_anagrams(words):
    # Give every word a key that all its anagrams share, and group by that key.
    pass
`,
      tests: [
        {
          call: py`sorted(sorted(g) for g in group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))`,
          expect: py`[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]`,
          show: py`group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams([""]))`,
          expect: py`[[""]]`,
          show: py`group_anagrams([""]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams(["a"]))`,
          expect: py`[["a"]]`,
          show: py`group_anagrams(["a"]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams([]))`,
          expect: py`[]`,
          show: py`group_anagrams([]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams(["dot", "net", "ten"]))`,
          expect: py`[["dot"], ["net", "ten"]]`,
          show: py`group_anagrams(["dot", "net", "ten"]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams(["ab", "ba", "ab"]))`,
          expect: py`[["ab", "ab", "ba"]]`,
          show: py`group_anagrams(["ab", "ba", "ab"]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams(["aab", "abb", "aba", "bab"]))`,
          expect: py`[["aab", "aba"], ["abb", "bab"]]`,
          show: py`group_anagrams(["aab", "abb", "aba", "bab"]), sorted`,
        },
        {
          call: py`sorted(sorted(g) for g in group_anagrams(["a", "aa", "aaa", "aa"]))`,
          expect: py`[["a"], ["aa", "aa"], ["aaa"]]`,
          show: py`group_anagrams(["a", "aa", "aaa", "aa"]), sorted`,
        },
      ],
      hints: [
        py`The words in a group have something in common that words outside the group lack. Look for a form of a word that comes out identical for every one of its anagrams.`,
        py`Sort the letters. <code>sorted("tea")</code> and <code>sorted("eat")</code> both give <code>['a', 'e', 't']</code>. A list cannot be a dictionary key, so wrap it in <code>tuple(...)</code>.`,
        py`Import <code>defaultdict</code> and make <code>groups = defaultdict(list)</code>. For each word, append it to <code>groups[tuple(sorted(word))]</code>. Return <code>list(groups.values())</code>.`,
      ],
      solution: py`from collections import defaultdict


def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        key = tuple(sorted(word))    # anagrams share the same sorted letters
        groups[key].append(word)
    return list(groups.values())
`,
      explain: py`
<p>Sorting the letters of a word gives a signature that all of its anagrams share and no other word has. <code>"eat"</code>, <code>"tea"</code> and <code>"ate"</code> all become <code>('a', 'e', 't')</code>. With the signature as the dictionary key, every word drops into its group in one step, and no word is ever compared with another.</p>
<p>The signature is turned into a tuple because a list cannot be a key. <code>defaultdict(list)</code> removes the check for a new key.</p>
<p><b>Cost:</b> for <code>n</code> words of at most <code>k</code> letters, sorting one word takes <code>O(k log k)</code>, so the total time is <code>O(n &times; k log k)</code>. The dictionary stores every word once, which is <code>O(n &times; k)</code> space.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
