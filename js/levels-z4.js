/* Pylon levels, zone 4: Pattern Forge. The patterns behind most interview questions.
   Format and rules: see tools/level-example.js. Validate with: python tools/check_levels.py 4 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z4-valid-parentheses',
      zone: 4,
      order: 1,
      kind: 'code',
      title: 'Coupling Check',
      concept: 'Stacks: last in, first out',
      classic: 'Valid Parentheses (LeetCode #20)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>The Pattern Forge runs on a handful of small tools. The first is the <b>stack</b>: a pile where you add to the top and take from the top. The last item in is the first one out.</p>
<p>A Python list already works as a stack. <code>append</code> pushes an item, <code>pop</code> removes and returns the top one, and <code>stack[-1]</code> reads the top without removing it. An empty list counts as false, so <code>if stack:</code> asks whether anything is on it.</p>
<pre><code>def typed(keys):               # "#" is the backspace key
    stack = []
    for k in keys:
        if k == "#":
            if stack:              # never pop an empty stack
                stack.pop()
        else:
            stack.append(k)
    return stack

print(typed("ab#c"))           # ['a', 'c']</code></pre>
<p>Reach for a stack when the newest unfinished thing has to be dealt with first: undo, a browser's back button, nested brackets. An opening bracket is unfinished business, so push it. When a closing bracket arrives, the opener it must match is the one on top.</p>`,
      task: py`
<p>The couplings on a forge conduit are written as brackets, and each one that opens has to be closed by its own kind.</p>
<p>Write <code>is_valid(s)</code>. The string <code>s</code> holds only the characters <code>()[]{}</code>. Return <code>True</code> if the brackets nest properly: each closing bracket matches the most recent opening bracket that is still open, and nothing is left open at the end. Otherwise return <code>False</code>. An empty string is valid.</p>
<pre><code>is_valid("{[]}")   # True
is_valid("([)]")   # False</code></pre>`,
      starter: py`def is_valid(s):
    # Push each opening bracket on a stack. A closing bracket must match the top.
    pass
`,
      tests: [
        { call: py`is_valid("{[]}")`, expect: py`True` },
        { call: py`is_valid("([)]")`, expect: py`False` },
        { call: py`is_valid("()[]{}")`, expect: py`True` },
        { call: py`is_valid("(]")`, expect: py`False` },
        { call: py`is_valid("((")`, expect: py`False` },
        { call: py`is_valid("]")`, expect: py`False` },
        { call: py`is_valid("(){}}{")`, expect: py`False` },
        { call: py`is_valid("")`, expect: py`True` },
      ],
      hints: [
        py`The bracket that has to close first is the one that opened last. A stack hands you exactly that one.`,
        py`Walk the string. Push every opening bracket. For a closing bracket, pop the stack and compare: the popped opener must be the partner of this closer. If the stack is empty at that moment, the string is invalid.`,
        py`Keep a dictionary <code>pairs = {")": "(", "]": "[", "}": "{"}</code>. For a closer, return <code>False</code> if the stack is empty or <code>stack.pop() != pairs[ch]</code>. After the loop return <code>not stack</code>, because leftover openers were never closed.`,
      ],
      solution: py`def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}    # closer -> the opener it needs
    stack = []                                # openers still waiting for a partner
    for ch in s:
        if ch in pairs:                       # a closer
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:                                 # an opener
            stack.append(ch)
    return not stack                          # nothing may be left open
`,
      explain: py`
<p>Brackets close in the reverse of the order they opened, and a stack returns items in exactly that reverse order. Each closer is compared with the newest opener still waiting. A mismatch, or a closer that arrives when the stack is empty, ends the check at once.</p>
<p>The final <code>not stack</code> catches strings such as <code>"(("</code>, where openers are left over.</p>
<p><b>Cost:</b> <code>O(n)</code> time, since each character is pushed and popped at most once, and <code>O(n)</code> extra space for the stack in the worst case. Counting each kind of bracket with three counters looks simpler, but it accepts <code>"([)]"</code>, so it is wrong.</p>`,
    },
    {
      id: 'z4-valid-palindrome',
      zone: 4,
      order: 2,
      kind: 'code',
      title: 'Mirror Signal',
      concept: 'Two pointers moving inward',
      classic: 'Valid Palindrome (LeetCode #125)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p><b>Two pointers</b> means keeping two indexes into the same sequence and moving them according to what they find. The most common form starts one at each end and walks them toward each other.</p>
<pre><code>def reverse_in_place(items):
    left, right = 0, len(items) - 1
    while left &lt; right:
        items[left], items[right] = items[right], items[left]
        left += 1
        right -= 1

cells = [1, 2, 3, 4]
reverse_in_place(cells)
print(cells)                 # [4, 3, 2, 1]</code></pre>
<p>The loop stops when the pointers meet, so each item is handled once and no second list is needed. Reach for this pattern when the answer depends on comparing the front of a sequence with its back.</p>
<p>Two string methods help in this level. <code>ch.isalnum()</code> is <code>True</code> when <code>ch</code> is a letter or a digit, and <code>ch.lower()</code> gives its lowercase form.</p>
<pre><code>print("7".isalnum(), "x".isalnum(), "!".isalnum())   # True True False
print("Q".lower())                                    # q</code></pre>`,
      task: py`
<p>A beacon message is clean when it reads the same forwards and backwards.</p>
<p>Write <code>is_palindrome(s)</code>. Look only at the letters and digits in <code>s</code>, and treat uppercase and lowercase as equal. Return <code>True</code> if what is left reads the same in both directions, otherwise <code>False</code>. A string with no letters or digits counts as a palindrome.</p>
<pre><code>is_palindrome("A man, a plan, a canal: Panama")   # True
is_palindrome("race a car")                       # False</code></pre>`,
      starter: py`def is_palindrome(s):
    # One pointer at each end. Skip what is not a letter or digit, compare, move inward.
    pass
`,
      tests: [
        { call: py`is_palindrome("A man, a plan, a canal: Panama")`, expect: py`True` },
        { call: py`is_palindrome("race a car")`, expect: py`False` },
        { call: py`is_palindrome(" ")`, expect: py`True` },
        { call: py`is_palindrome("")`, expect: py`True` },
        { call: py`is_palindrome("0P")`, expect: py`False` },
        { call: py`is_palindrome(".,")`, expect: py`True` },
        { call: py`is_palindrome("ab_a")`, expect: py`True` },
        { call: py`is_palindrome("ab2a")`, expect: py`False` },
      ],
      hints: [
        py`You do not need a cleaned copy of the string. Two indexes, one at each end, can do the comparing in place.`,
        py`While <code>left</code> is below <code>right</code>: if the left character is not a letter or digit, move <code>left</code> forward. If the right one is not, move <code>right</code> back. Only when both are usable do you compare them, in lowercase.`,
        py`Inside the loop use <code>if / elif / elif / else</code>: skip on the left, skip on the right, return <code>False</code> on a lowercase mismatch, otherwise move both pointers inward. Return <code>True</code> after the loop.`,
      ],
      solution: py`def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if not s[left].isalnum():
            left += 1                    # skip spaces and punctuation
        elif not s[right].isalnum():
            right -= 1
        elif s[left].lower() != s[right].lower():
            return False
        else:
            left += 1                    # this pair matches: move inward
            right -= 1
    return True
`,
      explain: py`
<p>A palindrome matches itself end to end: first character with last, second with second to last, and so on. The two pointers make exactly those comparisons. Characters that are not letters or digits are stepped over one side at a time, so the pointers can never pass each other while skipping.</p>
<p><b>Cost:</b> <code>O(n)</code> time, because every pass of the loop moves at least one pointer inward, and <code>O(1)</code> extra space.</p>
<p>The main alternative builds a cleaned copy and compares it with its reverse: <code>clean == clean[::-1]</code>. That is also <code>O(n)</code> time and shorter to write, but it needs <code>O(n)</code> extra space.</p>`,
    },
    {
      id: 'z4-longest-substring',
      zone: 4,
      order: 3,
      kind: 'code',
      title: 'Clean Signal Window',
      concept: 'Sliding window with a set',
      classic: 'Longest Substring Without Repeating Characters (LeetCode #3)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A <b>sliding window</b> is a stretch of a sequence marked by two indexes, <code>left</code> and <code>right</code>. The right edge moves forward one item at a time. Whenever the window breaks its rule, the left edge moves forward until the rule holds again.</p>
<p>This example finds the longest run of positive readings whose sum stays within a limit:</p>
<pre><code>def longest_run(nums, limit):
    best, left, total = 0, 0, 0
    for right, n in enumerate(nums):
        total += n                    # grow on the right
        while total &gt; limit:          # rule broken: shrink from the left
            total -= nums[left]
            left += 1
        best = max(best, right - left + 1)
    return best

print(longest_run([1, 2, 1, 5, 1, 1, 1, 1], 4))   # 4</code></pre>
<p>Both edges only move forward, so the list is covered in <code>O(n)</code> steps. Checking every possible run takes <code>O(n²)</code>.</p>
<p>Reach for a window when the question asks for the best <i>contiguous</i> stretch. What you track about the window depends on the rule: a running total here, a <b>set</b> of the items inside when the rule is about repeats.</p>`,
      task: py`
<p>The relay accepts a stretch of signal only while no symbol in it repeats.</p>
<p>Write <code>length_of_longest_substring(s)</code>. Return the length of the longest substring of <code>s</code> in which every character is different. A substring is a run of neighbouring characters.</p>
<pre><code>length_of_longest_substring("abcabcbb")   # 3, for "abc"
length_of_longest_substring("pwwkew")     # 3, for "wke"</code></pre>
<p>The last test has 1,500 symbols and a step limit. Checking every substring is too slow.</p>`,
      starter: py`def length_of_longest_substring(s):
    # Slide a window over s. Keep the characters inside it in a set.
    pass
`,
      tests: [
        { call: py`length_of_longest_substring("abcabcbb")`, expect: py`3` },
        { call: py`length_of_longest_substring("pwwkew")`, expect: py`3` },
        { call: py`length_of_longest_substring("bbbbb")`, expect: py`1` },
        { call: py`length_of_longest_substring("")`, expect: py`0` },
        { call: py`length_of_longest_substring("dvdf")`, expect: py`3` },
        { call: py`length_of_longest_substring("abba")`, expect: py`2` },
        { call: py`length_of_longest_substring("tmmzuxt")`, expect: py`5` },
        {
          setup: py`signal = "".join(chr(1000 + i) for i in range(1500))`,
          call: py`length_of_longest_substring(signal)`,
          expect: py`1500`,
          show: py`length_of_longest_substring(signal)   # 1,500 symbols, all different`,
          perf: true,
        },
      ],
      hints: [
        py`A window with no repeats stays useful when you extend it by one character. You never have to start again from scratch.`,
        py`Keep a set of the characters in the current window. Before you add the new character on the right, remove characters from the left until the new one is no longer in the set. Then add it and measure the window.`,
        py`Loop with <code>for right, ch in enumerate(s)</code>. Inside: <code>while ch in window:</code> call <code>window.remove(s[left])</code> and add 1 to <code>left</code>. Then <code>window.add(ch)</code> and update <code>best</code> with <code>right - left + 1</code>.`,
      ],
      solution: py`def length_of_longest_substring(s):
    window = set()                 # the characters between left and right
    best, left = 0, 0
    for right, ch in enumerate(s):
        while ch in window:        # shrink until ch is no longer a repeat
            window.remove(s[left])
            left += 1
        window.add(ch)
        best = max(best, right - left + 1)
    return best
`,
      naive: py`def length_of_longest_substring(s):
    best = 0
    for i in range(len(s)):
        for j in range(i + 1, len(s) + 1):
            piece = s[i:j]
            if len(set(piece)) == len(piece):    # no repeats in this piece
                best = max(best, len(piece))
    return best
`,
      explain: py`
<p>The window between <code>left</code> and <code>right</code> never holds a repeat. When the next character is already inside, the left edge moves forward, dropping characters from the set, until the earlier copy is gone. The window is then valid again, and it is as long as it can be for this right edge.</p>
<p><b>Cost:</b> <code>O(n)</code> time. The <code>while</code> loop looks nested, but each character enters the set once and leaves at most once, so the total work is about <code>2n</code> steps. Space is <code>O(k)</code>, where <code>k</code> is the number of different characters.</p>
<p>The main alternative stores each character's last index in a dictionary and jumps <code>left</code> straight past the earlier copy. That has the same Big-O and takes fewer steps.</p>`,
    },
    {
      id: 'z4-binary-search',
      zone: 4,
      order: 4,
      kind: 'code',
      title: 'Find the Relay',
      concept: 'Binary search: halve the range',
      classic: 'Binary Search (LeetCode #704)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>When a list is sorted, one comparison can rule out half of it. Look at the middle item. If it is too small, everything before it is too small as well. If it is too big, so is everything after it. Repeating this on the half that remains is <b>binary search</b>.</p>
<p>Keep two bounds, <code>lo</code> and <code>hi</code>, around the part still in play. Here the same idea closes in on a secret number between 1 and 100, and prints the bounds after every guess:</p>
<pre><code>secret = 37
lo, hi = 1, 100
while lo &lt; hi:
    mid = (lo + hi) // 2
    if mid &lt; secret:
        lo = mid + 1          # too small: everything up to mid is out
    else:
        hi = mid              # big enough: everything above mid is out
    print(lo, hi)
# 1 50, 26 50, 26 38, 33 38, 36 38, 36 37, 37 37</code></pre>
<p>This loop never asks whether a guess is exactly right. It narrows until one number is left. A search that has to report a hit, or report that the value is not there at all, needs one more question inside the loop and a decision about what an empty range means.</p>
<p>Each guess halves the range, so 100 numbers never need more than 7 guesses, and 200,000 need at most 18. That growth is written <code>O(log n)</code>. Reach for binary search whenever the data is sorted and you are looking for one position in it.</p>`,
      task: py`
<p>The Forge keeps its relay codes in a sorted list, smallest first, with no repeats.</p>
<p>Write <code>search(nums, target)</code>. Return the index of <code>target</code> in <code>nums</code>, or <code>-1</code> if it is not there.</p>
<pre><code>search([-1, 0, 3, 5, 9, 12], 9)   # 4
search([-1, 0, 3, 5, 9, 12], 2)   # -1</code></pre>
<p>The last two tests search 200,000 codes with a step limit. Reading the list from one end is too slow.</p>`,
      starter: py`def search(nums, target):
    # Keep lo and hi around the part that can still hold target. Check the middle.
    pass
`,
      tests: [
        { call: py`search([-1, 0, 3, 5, 9, 12], 9)`, expect: py`4` },
        { call: py`search([-1, 0, 3, 5, 9, 12], 2)`, expect: py`-1` },
        { call: py`search([5], 5)`, expect: py`0` },
        { call: py`search([5], -5)`, expect: py`-1` },
        { call: py`search([], 7)`, expect: py`-1` },
        { call: py`[search([2, 4, 6, 8], t) for t in [2, 4, 6, 8, 1, 5, 9]]`, expect: py`[0, 1, 2, 3, -1, -1, -1]` },
        {
          setup: py`codes = list(range(0, 400000, 2))`,
          call: py`search(codes, 246912)`,
          expect: py`123456`,
          show: py`search([0, 2, 4, ..., 399998], 246912)`,
          perf: true,
        },
        {
          setup: py`codes = list(range(0, 400000, 2))`,
          call: py`search(codes, 246913)`,
          expect: py`-1`,
          show: py`search([0, 2, 4, ..., 399998], 246913)`,
          perf: true,
        },
      ],
      hints: [
        py`The list is sorted. After one look at the middle value you know which half cannot contain the target.`,
        py`Keep <code>lo = 0</code> and <code>hi = len(nums) - 1</code>. While <code>lo &lt;= hi</code>, compute the middle index. If the value there is the target, return the index. If it is smaller, the target can only be to the right. If it is larger, only to the left.`,
        py`With <code>mid = (lo + hi) // 2</code>: when <code>nums[mid] &lt; target</code> set <code>lo = mid + 1</code>, when it is greater set <code>hi = mid - 1</code>. If the loop ends without a match, return <code>-1</code>.`,
      ],
      solution: py`def search(nums, target):
    lo, hi = 0, len(nums) - 1          # target can only be in nums[lo..hi]
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1               # drop mid and everything left of it
        else:
            hi = mid - 1               # drop mid and everything right of it
    return -1                          # the range is empty: not present
`,
      naive: py`def search(nums, target):
    for i, n in enumerate(nums):
        if n == target:
            return i
    return -1
`,
      explain: py`
<p><code>lo</code> and <code>hi</code> always enclose every position where the target could still be. Comparing the middle value with the target removes that position and one whole side. The <code>+ 1</code> and <code>- 1</code> matter: they guarantee that the range shrinks on every pass, so the loop always ends. An empty range means the target is absent.</p>
<p><b>Cost:</b> <code>O(log n)</code> time and <code>O(1)</code> space. For 200,000 codes the loop runs at most 18 times, where a linear scan may have to read all 200,000.</p>
<p>Python ships this algorithm in the <code>bisect</code> module. <code>bisect.bisect_left(nums, target)</code> returns the position where the target belongs, and you then check whether it is really there.</p>`,
    },
    {
      id: 'z4-maximum-subarray',
      zone: 4,
      order: 5,
      kind: 'code',
      title: 'Strongest Surge',
      concept: "Running best (Kadane's algorithm)",
      classic: 'Maximum Subarray (LeetCode #53)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Many list problems can be solved in one pass if you carry the right two numbers: the best result for a run that <b>ends at the current item</b>, and the best result seen <b>anywhere so far</b>.</p>
<p>This function finds the longest streak of rising readings:</p>
<pre><code>def longest_rise(nums):
    best, current = 1, 1
    for i in range(1, len(nums)):
        if nums[i] &gt; nums[i - 1]:
            current += 1          # the streak goes on
        else:
            current = 1           # a new streak starts here
        best = max(best, current)
    return best

print(longest_rise([3, 4, 5, 1, 2]))   # 3</code></pre>
<p>At every item there are only two options: extend the run that ended just before, or start a new run here. <code>current</code> follows the run in progress, and <code>best</code> remembers the highest value <code>current</code> ever reached.</p>
<p><b>Kadane's algorithm</b> is this pattern applied to sums. The best run ending at a number is either that number alone, or that number added to the best run ending just before it. Reach for a running best when the answer is the best contiguous run and each step can be decided from the one before.</p>`,
      task: py`
<p>The reactor log is a list of power changes, some positive and some negative.</p>
<p>Write <code>max_sub_array(nums)</code>. Return the largest sum of any contiguous run of one or more numbers in <code>nums</code>. The list is never empty.</p>
<pre><code>max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4])   # 6, from [4, -1, 2, 1]
max_sub_array([5, 4, -1, 7, 8])                  # 23, the whole list</code></pre>
<p>The last test has 2,000 numbers and a step limit. Adding up every possible run is too slow.</p>`,
      starter: py`def max_sub_array(nums):
    # One pass. Track the best sum of a run ending at the current number, and the best overall.
    pass
`,
      tests: [
        { call: py`max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4])`, expect: py`6` },
        { call: py`max_sub_array([5, 4, -1, 7, 8])`, expect: py`23` },
        { call: py`max_sub_array([1])`, expect: py`1` },
        { call: py`max_sub_array([-3, -1, -2])`, expect: py`-1` },
        { call: py`max_sub_array([2, -1, 2])`, expect: py`3` },
        { call: py`max_sub_array([8, -19, 5, -4, 20])`, expect: py`21` },
        { call: py`max_sub_array([0, 0, -1, 0])`, expect: py`0` },
        {
          setup: py`log = [(i * 37) % 101 - 50 for i in range(2000)]`,
          call: py`max_sub_array(log)`,
          expect: py`124`,
          show: py`max_sub_array([-50, -13, 24, -40, ...])   # 2,000 numbers`,
          perf: true,
        },
      ],
      hints: [
        py`Think about the best run that <b>ends exactly at</b> each position. Once you know it for one position, the next position is easy.`,
        py`The best run ending at a number is either the number alone, or the number added to the best run ending just before it. Take the larger. The answer is the largest of these values over the whole list.`,
        py`Start <code>best</code> at <code>nums[0]</code> and <code>current</code> at 0. For each <code>n</code> in the list: <code>current = max(n, current + n)</code>, then <code>best = max(best, current)</code>. If <code>best</code> started at 0, a list of only negative numbers would give the wrong answer.`,
      ],
      solution: py`def max_sub_array(nums):
    best = nums[0]
    current = 0                          # sum of the run in progress: nothing yet
    for n in nums:
        current = max(n, current + n)    # extend the run, or start again at n
        best = max(best, current)
    return best
`,
      naive: py`def max_sub_array(nums):
    best = nums[0]
    for i in range(len(nums)):
        total = 0
        for j in range(i, len(nums)):    # every run that starts at i
            total += nums[j]
            best = max(best, total)
    return best
`,
      explain: py`
<p><code>current</code> is the largest sum of a run that ends at the present number. If the run before it has a negative sum, carrying it along can only hurt, so the run starts again. Every contiguous run ends somewhere, so the largest <code>current</code> seen is the answer.</p>
<p>Starting <code>best</code> from <code>nums[0]</code> matters. With a start of 0, a list of only negative numbers would return 0, the sum of an empty run.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(1)</code> extra space. The brute-force alternative adds up every run in <code>O(n²)</code>: about two million additions for 2,000 numbers, against two thousand here.</p>`,
    },
    {
      id: 'z4-climbing-stairs',
      zone: 4,
      order: 6,
      kind: 'code',
      title: 'The Forge Stairs',
      concept: 'Recursion and memoization',
      classic: 'Climbing Stairs (LeetCode #70)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A function may call itself. That is <b>recursion</b>. It needs a <b>base case</b>, an input small enough to answer directly, and a <b>recursive case</b>, which asks the same function about a smaller input.</p>
<pre><code>def total(n):                  # adds up 1 to n
    if n == 0:
        return 0               # base case
    return n + total(n - 1)    # recursive case

print(total(4))                # 10</code></pre>
<p>Each call waits for a smaller one. The base case answers first, and the results flow back up. Without a base case the calls never stop.</p>
<p>A function that calls itself twice can repeat work. <code>routes</code> counts the paths to a grid cell, moving only right or down. Plain recursion makes over a billion calls for the cell below. <b>Memoization</b> stores each answer in a dictionary and looks it up from then on.</p>
<pre><code>memo = {}

def routes(r, c):
    if r == 0 or c == 0:
        return 1               # an edge cell: one path
    if (r, c) not in memo:
        memo[(r, c)] = routes(r - 1, c) + routes(r, c - 1)
    return memo[(r, c)]

print(routes(16, 16))          # 601080390</code></pre>
<p>Reach for memoization when a problem splits into smaller copies of itself that repeat.</p>`,
      task: py`
<p>A stair of <code>n</code> steps leads up to the forge. PIP climbs 1 or 2 steps at a time.</p>
<p>Write <code>climb_stairs(n)</code>. Return the number of different ways to reach the top. <code>n</code> is 1 or more.</p>
<pre><code>climb_stairs(2)   # 2:  1+1, 2
climb_stairs(3)   # 3:  1+1+1, 1+2, 2+1</code></pre>
<p>The last test asks for <code>n = 60</code> with a step limit. Plain recursion repeats the same work far too often, so store what you have already computed.</p>`,
      starter: py`def climb_stairs(n):
    # The last move is 1 step or 2 steps. Recurse on what is left, and remember the answers.
    pass
`,
      tests: [
        { call: py`climb_stairs(2)`, expect: py`2` },
        { call: py`climb_stairs(3)`, expect: py`3` },
        { call: py`climb_stairs(1)`, expect: py`1` },
        { call: py`climb_stairs(5)`, expect: py`8` },
        { call: py`climb_stairs(10)`, expect: py`89` },
        { call: py`climb_stairs(20)`, expect: py`10946` },
        { call: py`climb_stairs(60)`, expect: py`2504730781961`, perf: true },
      ],
      hints: [
        py`Look at the last move. It was either a single step from <code>n - 1</code> or a double step from <code>n - 2</code>, and no route belongs to both groups.`,
        py`So the count for <code>n</code> is the count for <code>n - 1</code> plus the count for <code>n - 2</code>. The base cases are the stairs too short to split: one way for 1 step, two ways for 2 steps.`,
        py`Written directly, that recursion is correct but slow. Keep a dictionary <code>memo</code> outside the function. If <code>n</code> is not in it yet, store <code>climb_stairs(n - 1) + climb_stairs(n - 2)</code> under <code>n</code>. Then return <code>memo[n]</code>.`,
      ],
      solution: py`memo = {}                         # n -> number of ways, filled in as we go

def climb_stairs(n):
    if n <= 2:
        return n                  # base cases: 1 way for 1 step, 2 ways for 2
    if n not in memo:
        # the last move was a single step or a double step
        memo[n] = climb_stairs(n - 1) + climb_stairs(n - 2)
    return memo[n]
`,
      naive: py`def climb_stairs(n):
    if n <= 2:
        return n
    return climb_stairs(n - 1) + climb_stairs(n - 2)
`,
      explain: py`
<p>Every route to step <code>n</code> ends with a single step from <code>n - 1</code> or a double step from <code>n - 2</code>, so the two smaller counts add up to the answer. Plain recursion on that rule is exponential: each call starts two more, and <code>climb_stairs(60)</code> would make trillions of calls.</p>
<p>The dictionary removes the repeats. Each value from 3 to <code>n</code> is computed once and looked up after that.</p>
<p><b>Cost:</b> <code>O(n)</code> time, and <code>O(n)</code> space for the memo and the call stack.</p>
<p>The standard library can do the bookkeeping: add <code>from functools import lru_cache</code>, then write <code>@lru_cache(maxsize=None)</code> on the line above the plain recursive function. The main alternative is a loop that keeps only the last two counts, which needs <code>O(1)</code> space.</p>`,
    },
    {
      id: 'z4-merge-intervals',
      zone: 4,
      order: 7,
      kind: 'code',
      title: 'Overlapping Shifts',
      concept: 'Sort first, then sweep',
      classic: 'Merge Intervals (LeetCode #56)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Some problems look tangled until the data is in order. <b>Sort first, then sweep</b>: sort the items, walk through them once, and compare each item only with what came just before it.</p>
<p>The items in this level are <b>lists inside a list</b>. <code>sorted</code> orders inner lists by their first value, then by their second. One inner list can be unpacked into names.</p>
<pre><code>def has_clash(meetings):
    meetings = sorted(meetings)              # by start time
    for i in range(1, len(meetings)):
        start, end = meetings[i]             # unpack one inner list
        if start &lt; meetings[i - 1][1]:       # before the previous end
            return True
    return False

print(sorted([[9, 11], [1, 3], [2, 6]]))       # [[1, 3], [2, 6], [9, 11]]
print(has_clash([[9, 11], [1, 3], [2, 6]]))    # True
print(has_clash([[5, 8], [1, 3]]))             # False</code></pre>
<p>After sorting by start, meetings that overlap end up next to each other, so one pass finds them. Without the sort you would have to compare every pair.</p>
<p>Reach for this pattern with intervals, schedules and ranges. Sorting costs <code>O(n log n)</code> steps: a little more than <code>O(n)</code>, far less than <code>O(n²)</code>.</p>`,
      task: py`
<p>Each forge crew logs its shift as <code>[start, end]</code>. Shifts that overlap or touch should be shown as one block.</p>
<p>Write <code>merge(intervals)</code>. Each interval is a list <code>[start, end]</code> with <code>start &lt;= end</code>, and the input can be in any order. Merge every group of overlapping intervals into one, and return the merged intervals sorted by start. Intervals that only share an endpoint, such as <code>[1, 4]</code> and <code>[4, 5]</code>, also merge.</p>
<pre><code>merge([[1, 3], [2, 6], [8, 10], [15, 18]])   # [[1, 6], [8, 10], [15, 18]]
merge([[1, 4], [4, 5]])                      # [[1, 5]]</code></pre>`,
      starter: py`def merge(intervals):
    # Sort by start. Each interval then extends the last merged block or starts a new one.
    pass
`,
      tests: [
        { call: py`merge([[1, 3], [2, 6], [8, 10], [15, 18]])`, expect: py`[[1, 6], [8, 10], [15, 18]]` },
        { call: py`merge([[1, 4], [4, 5]])`, expect: py`[[1, 5]]` },
        { call: py`merge([[8, 10], [1, 3], [15, 18], [2, 6]])`, expect: py`[[1, 6], [8, 10], [15, 18]]` },
        { call: py`merge([[1, 10], [2, 3], [4, 5], [11, 12]])`, expect: py`[[1, 10], [11, 12]]` },
        { call: py`merge([[5, 7]])`, expect: py`[[5, 7]]` },
        { call: py`merge([])`, expect: py`[]` },
        { call: py`merge([[1, 4], [0, 0], [1, 4]])`, expect: py`[[0, 0], [1, 4]]` },
        { call: py`merge([[-5, -1], [3, 3], [-2, 3]])`, expect: py`[[-5, 3]]` },
      ],
      hints: [
        py`If the intervals were sorted by start, anything that overlaps the block you are building would come right after it.`,
        py`Sort, then keep a result list. For each interval, compare its start with the end of the last interval in the result. If it starts at or before that end, the two overlap: stretch the end. Otherwise it begins a new block.`,
        py`When stretching, use <code>merged[-1][1] = max(merged[-1][1], end)</code>, because the new interval may sit completely inside the last one. In the other case, and when <code>merged</code> is still empty, append <code>[start, end]</code>.`,
      ],
      solution: py`def merge(intervals):
    merged = []
    for start, end in sorted(intervals):            # by start, then by end
        if merged and start <= merged[-1][1]:       # overlaps the last block
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])             # a gap: start a new block
    return merged
`,
      explain: py`
<p>After sorting by start, an interval can only overlap the block that was built just before it. One comparison per interval is enough: its start against the end of the last merged block. Taking the <code>max</code> of the two ends handles an interval that lies completely inside the block, as in <code>[1, 10]</code> followed by <code>[2, 3]</code>.</p>
<p>The solution appends a fresh <code>[start, end]</code> list each time, so the caller's inner lists are never changed.</p>
<p><b>Cost:</b> <code>O(n log n)</code> time, all of it in the sort, since the sweep is a single <code>O(n)</code> pass. Extra space is <code>O(n)</code> for the result. Without sorting you would compare every pair of intervals and repeat until nothing changes, which is <code>O(n²)</code> or worse.</p>`,
    },
    {
      id: 'z4-three-sum',
      zone: 4,
      order: 8,
      kind: 'code',
      title: 'Three-Cell Balance',
      concept: 'Sort, two pointers, skip duplicates',
      classic: '3Sum (LeetCode #15)',
      difficulty: 'Medium',
      boss: true,
      lesson: py`
<p>The last door of the Forge combines sorting and two pointers with one new habit: <b>skipping duplicates</b>.</p>
<p>In a sorted list, two pointers find every pair with a given sum in one pass. When the sum is too small, move the low pointer up. When it is too big, move the high pointer down.</p>
<pre><code>nums = sorted([1, 5, 1, 3, 3, 5])
lo, hi = 0, len(nums) - 1
while lo &lt; hi:
    total = nums[lo] + nums[hi]
    if total &lt; 6:
        lo += 1
    elif total &gt; 6:
        hi -= 1
    else:
        print(nums[lo], nums[hi])
        lo += 1
# prints 1 5, then 1 5 again, then 3 3</code></pre>
<p>The pair <code>1 5</code> is reported twice, because the list holds two 1s. Sorting put those equal values side by side, and that is what makes the repeat easy to avoid: after using a value, keep stepping while the next one is a copy of it.</p>
<p>A search for three numbers turns into this pair search once the first number is fixed. To pass over a repeated first number, <code>continue</code> jumps straight to the next round of a <code>for</code> loop.</p>
<p>Reach for sort plus two pointers when you need pairs or triplets that hit a target sum.</p>`,
      task: py`
<p>The forge core fires when three charges cancel out exactly.</p>
<p>Write <code>three_sum(nums)</code>. Return every triplet of values, taken from three different positions in <code>nums</code>, that adds up to 0. Each triplet is a list of three numbers. A triplet of the same three values must appear only once, however many positions could produce it. The triplets, and the numbers inside each one, may be in any order.</p>
<pre><code>three_sum([-1, 0, 1, 2, -1, -4])   # [[-1, -1, 2], [-1, 0, 1]]
three_sum([0, 0, 0, 0])            # [[0, 0, 0]]</code></pre>
<p>The last test has 202 charges and a step limit. Three nested loops are too slow.</p>`,
      starter: py`def three_sum(nums):
    # Sort. Fix one number, then close two pointers on the rest. Skip repeated values.
    pass
`,
      tests: [
        {
          call: py`sorted(sorted(t) for t in three_sum([-1, 0, 1, 2, -1, -4]))`,
          expect: py`[[-1, -1, 2], [-1, 0, 1]]`,
          show: py`three_sum([-1, 0, 1, 2, -1, -4]), in any order`,
        },
        {
          call: py`sorted(sorted(t) for t in three_sum([0, 0, 0, 0]))`,
          expect: py`[[0, 0, 0]]`,
          show: py`three_sum([0, 0, 0, 0]), in any order`,
        },
        {
          call: py`sorted(sorted(t) for t in three_sum([0, 1, 1]))`,
          expect: py`[]`,
          show: py`three_sum([0, 1, 1]), in any order`,
        },
        {
          call: py`sorted(sorted(t) for t in three_sum([0, 0, 0]))`,
          expect: py`[[0, 0, 0]]`,
          show: py`three_sum([0, 0, 0]), in any order`,
        },
        {
          call: py`sorted(sorted(t) for t in three_sum([-2, 0, 0, 2, 2]))`,
          expect: py`[[-2, 0, 2]]`,
          show: py`three_sum([-2, 0, 0, 2, 2]), in any order`,
        },
        {
          call: py`sorted(sorted(t) for t in three_sum([3, -2, 1, 2, 0, -4, 2, -2]))`,
          expect: py`[[-4, 1, 3], [-4, 2, 2], [-2, 0, 2]]`,
          show: py`three_sum([3, -2, 1, 2, 0, -4, 2, -2]), in any order`,
        },
        {
          call: py`sorted(sorted(t) for t in three_sum([]))`,
          expect: py`[]`,
          show: py`three_sum([]), in any order`,
        },
        {
          setup: py`charges = [4 * k + 1 for k in range(-50, 50)] * 2 + [398, -394]`,
          call: py`sorted(sorted(t) for t in three_sum(charges))`,
          expect: py`[[-394, 197, 197], [-199, -199, 398]]`,
          show: py`three_sum(charges), in any order   # 202 charges, most values appear twice`,
          perf: true,
        },
      ],
      hints: [
        py`Sort the list first. Then fix the first number of the triplet, and what remains is a pair search in the part to its right.`,
        py`For each index <code>i</code>, put <code>lo</code> just after it and <code>hi</code> at the end. Add the three values. Below zero: move <code>lo</code> up. Above zero: move <code>hi</code> down. Zero: record the triplet and move on.`,
        py`Duplicates are skipped in two places. At the top of the outer loop, write <code>continue</code> when <code>i &gt; 0</code> and <code>nums[i] == nums[i - 1]</code>: that first value has been handled already. After recording a triplet, add 1 to <code>lo</code>, and keep adding while <code>lo &lt; hi</code> and <code>nums[lo] == nums[lo - 1]</code>.`,
      ],
      solution: py`def three_sum(nums):
    nums = sorted(nums)
    found = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                          # same first value as last round: skip
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total < 0:
                lo += 1                       # need a bigger sum
            elif total > 0:
                hi -= 1                       # need a smaller sum
            else:
                found.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1                   # skip repeats of the second value
    return found
`,
      naive: py`def three_sum(nums):
    found = []
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if nums[i] + nums[j] + nums[k] == 0:
                    triplet = sorted([nums[i], nums[j], nums[k]])
                    if triplet not in found:      # filter out repeats
                        found.append(triplet)
    return found
`,
      explain: py`
<p>Sorting does two jobs. It lets two pointers close in on a target sum, and it places equal values next to each other so that repeats can be stepped over.</p>
<p>For each first value, <code>lo</code> and <code>hi</code> sweep the rest of the list once. A sum below zero can only be fixed by a larger low value, and a sum above zero only by a smaller high value, so no matching pair is missed. Skipping equal first values and equal second values produces each triplet exactly once, with no filtering afterwards.</p>
<p><b>Cost:</b> <code>O(n²)</code> time: <code>n</code> first values, each with an <code>O(n)</code> sweep, plus <code>O(n log n)</code> for the sort. Extra space is <code>O(n)</code> for the sorted copy. Three nested loops cost <code>O(n³)</code>. The other <code>O(n²)</code> approach keeps a set of seen values for each first number.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
