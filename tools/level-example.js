/* Pylon level file format. One file per zone: js/levels-z<zone>.js, eight levels per file.
   The level below is finished and real (zone 3, order 5). It is the quality bar.

   Field notes
   - id:         unique, "z<zone>-kebab-case".
   - order:      1..8 inside the zone. 8 is the zone boss (boss: true).
   - kind:       'code'.
   - title:      short in-world name, 30 characters at most.
   - concept:    the one Python or algorithm idea this level teaches, 44 characters at most.
   - classic:    the well-known problem and its LeetCode number. Omit when it is not a classic.
   - difficulty: 'Easy' | 'Medium' | 'Hard' (LeetCode's own label for classics).
   - lesson:     HTML. Teaches the one new idea with one or two short code examples. 90-200 words.
   - task:       HTML. The exact job: function name, arguments, return value, one or two examples.
   - starter:    what the editor starts with. Must compile, must not pass.
   - tests:      each { call, expect } is Python source: the test passes when (call) == (expect).
                 Optional: setup (statements run first), show (text displayed instead of call),
                 perf: true (a big input with a step limit; the level then needs `naive`).
                 Lists and tuples compare as equal. For "print" levels use { stdout: 'text\n' } instead.
   - hints:      2-4 short HTML fragments (only <b>, <i>, <code>), from gentle nudge to near-answer.
   - solution:   clean, idiomatic reference solution.
   - naive:      only with perf tests: the slow version those tests are meant to reject.
   - explain:    HTML shown with the solution: why it works, then time and space cost.

   HTML rules: only <p> <b> <i> <code> <pre> <ul> <ol> <li>, no attributes. Write &lt; &gt; &amp;
   for those characters, also inside code. No backticks. Never write a dollar sign followed by "{".
   Every string holding Python or HTML uses the py`...` tag so backslashes stay literal. */
(function (root) {
  const py = String.raw;

  const LEVELS = [
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
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
