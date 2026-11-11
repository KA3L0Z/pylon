/* Pylon levels, zone 5: Structure Works. Classes and data structures.
   Format and rules: see tools/level-example.js. Validate with: python tools/check_levels.py 5 */
(function (root) {
  const py = String.raw;

  const LEVELS = [
    {
      id: 'z5-min-stack',
      zone: 5,
      order: 1,
      kind: 'code',
      title: 'Lowest Reading Stack',
      concept: 'Classes: __init__, attributes, methods',
      classic: 'Min Stack (LeetCode #155)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Until now your data and your functions have lived apart. A <b>class</b> bundles them. It describes a kind of object that carries its own data, called <b>attributes</b>, and its own functions, called <b>methods</b>. Reach for one when data and its operations belong together.</p>
<pre><code>class Gauge:
    def __init__(self, limit):       # runs when a Gauge is created
        self.limit = limit           # attributes live on self
        self.level = 0

    def fill(self, amount):
        self.level = min(self.limit, self.level + amount)

    def is_full(self):
        return self.level == self.limit

g = Gauge(10)                        # calls __init__ with limit = 10
g.fill(4)
print(g.level, g.is_full())          # 4 False</code></pre>
<p>Every method takes <code>self</code> first: the object it was called on. <code>g.fill(4)</code> runs <code>fill</code> with <code>self</code> set to <code>g</code>. Each object has its own attributes, so two gauges never share a level.</p>
<p>The tests on this floor drive a class with the helper <code>ops</code>. Its first list names the calls, starting with the class itself. Its second list holds the arguments of each call. It returns the results. <code>None</code>, Python's value for <i>nothing</i>, marks a call that returns nothing.</p>
<pre><code>ops(Gauge, ["Gauge", "fill", "is_full"], [[10], [4], []])
# [None, None, False]</code></pre>`,
      task: py`
<p>The Works logs pressure readings on a stack and has to report the lowest one at any moment.</p>
<p>Write a class <code>MinStack</code> with four methods:</p>
<ul>
<li><code>push(val)</code> puts <code>val</code> on top and returns nothing.</li>
<li><code>pop()</code> removes the top value and returns nothing.</li>
<li><code>top()</code> returns the top value without removing it.</li>
<li><code>get_min()</code> returns the smallest value in the stack.</li>
</ul>
<p><code>pop</code>, <code>top</code> and <code>get_min</code> are only called when the stack is not empty.</p>
<pre><code>s = MinStack()
s.push(-2)
s.push(0)
s.push(-3)
s.get_min()   # -3
s.pop()
s.top()       # 0
s.get_min()   # -2</code></pre>
<p>The last test makes about 9,000 calls with a step limit, so every method has to run in <code>O(1)</code> time. Scanning the whole stack for its minimum is too slow.</p>`,
      starter: py`class MinStack:
    def __init__(self):
        # Next to the values, remember the minimum at every height of the stack.
        pass

    def push(self, val):
        pass

    def pop(self):
        pass

    def top(self):
        pass

    def get_min(self):
        pass
`,
      tests: [
        {
          call: py`ops(MinStack, ["MinStack", "push", "push", "push", "get_min", "pop", "top", "get_min"], [[], [-2], [0], [-3], [], [], [], []])`,
          expect: py`[None, None, None, None, -3, None, 0, -2]`,
        },
        {
          call: py`ops(MinStack, ["MinStack", "push", "top", "get_min"], [[], [5], [], []])`,
          expect: py`[None, None, 5, 5]`,
        },
        {
          call: py`ops(MinStack, ["MinStack", "push", "push", "push", "pop", "get_min", "pop", "get_min"], [[], [3], [1], [1], [], [], [], []])`,
          expect: py`[None, None, None, None, None, 1, None, 3]`,
        },
        {
          call: py`ops(MinStack, ["MinStack", "push", "push", "push", "get_min", "top", "pop", "pop", "top", "get_min"], [[], [1], [2], [3], [], [], [], [], [], []])`,
          expect: py`[None, None, None, None, 1, 3, None, None, 1, 1]`,
        },
        {
          call: py`ops(MinStack, ["MinStack", "push", "push", "push", "get_min", "pop", "get_min", "pop", "get_min"], [[], [5], [4], [3], [], [], [], [], []])`,
          expect: py`[None, None, None, None, 3, None, 4, None, 5]`,
        },
        {
          call: py`ops(MinStack, ["MinStack", "push", "push", "pop", "push", "get_min", "top", "push", "get_min"], [[], [0], [-1], [], [7], [], [], [-5], []])`,
          expect: py`[None, None, None, None, None, 0, 7, None, -5]`,
        },
        {
          setup: py`count = 3000
names = ["MinStack"] + ["push"] * count + ["get_min"] * count + ["pop"] * (count - 1) + ["get_min", "top"]
params = [[]] + [[v] for v in range(count, 0, -1)] + [[]] * (2 * count + 1)`,
          call: py`ops(MinStack, names, params)[-2:]`,
          expect: py`[3000, 3000]`,
          show: py`ops(MinStack, ...)[-2:]   # push 3000, 2999, ..., 1, then 3,000 get_min, 2,999 pop, get_min, top`,
          perf: true,
        },
      ],
      hints: [
        py`<code>min(self.items)</code> gives the right answer, but it reads the whole stack on every call. Think about what you could store at push time so that the minimum is ready without a search.`,
        py`In <code>__init__</code>, create two lists on <code>self</code>: one for the values and one for minimums. The entry at each height of the second list is the smallest value in the stack up to that height. When a value is popped, its entry goes with it, and the entry below is the correct minimum again.`,
        py`In <code>push</code>, append <code>val</code> to the values. Then append to the second list either <code>val</code> or that list's current last entry, whichever is smaller. <code>pop</code> pops both lists and returns nothing. <code>top</code> returns <code>self.items[-1]</code> and <code>get_min</code> returns <code>self.mins[-1]</code>.`,
      ],
      solution: py`class MinStack:
    def __init__(self):
        self.items = []        # every value, bottom to top
        self.mins = []         # mins[i] is the smallest of items[0..i]

    def push(self, val):
        self.items.append(val)
        if self.mins and self.mins[-1] < val:
            self.mins.append(self.mins[-1])    # the old minimum still holds
        else:
            self.mins.append(val)              # val is the new minimum

    def pop(self):
        self.items.pop()
        self.mins.pop()

    def top(self):
        return self.items[-1]

    def get_min(self):
        return self.mins[-1]
`,
      naive: py`class MinStack:
    def __init__(self):
        self.items = []

    def push(self, val):
        self.items.append(val)

    def pop(self):
        self.items.pop()

    def top(self):
        return self.items[-1]

    def get_min(self):
        return min(self.items)     # reads the whole stack on every call
`,
      explain: py`
<p>A stack only changes at the top, so the minimum of the bottom <code>k</code> values is fixed for as long as those values stay. The <code>mins</code> list records that minimum for every height. Popping removes the top entry of both lists, and the entry underneath is already the right answer for the smaller stack.</p>
<p><b>Cost:</b> every method runs in <code>O(1)</code> time. Space is <code>O(n)</code>: one extra number per value.</p>
<p>The simple alternative calls <code>min(self.items)</code> inside <code>get_min</code>. That is <code>O(n)</code> per call, which the last test rejects. A leaner variant pushes onto <code>mins</code> only when the new value is less than or equal to the current minimum, and pops <code>mins</code> only when the popped value equals it.</p>`,
    },
    {
      id: 'z5-reverse-linked-list',
      zone: 5,
      order: 2,
      kind: 'code',
      title: 'Reverse the Chain',
      concept: 'Linked lists: nodes and next pointers',
      classic: 'Reverse Linked List (LeetCode #206)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A <b>linked list</b> is a chain of objects called nodes. Each node stores a value in <code>val</code> and a reference to the following node in <code>next</code>. The last node's <code>next</code> is <code>None</code>. You hold only the first node, the <b>head</b>, and reach the others by following <code>next</code>.</p>
<p>Every level has a <code>ListNode</code> class and two helpers: <code>linked</code> builds a chain from a list, and <code>unlinked</code> turns one back into a list. Test for the end of a chain with <code>is None</code> or <code>is not None</code>.</p>
<pre><code>head = linked([4, 7, 9])       # 4 -&gt; 7 -&gt; 9
print(head.val)                # 4
print(head.next.val)           # 7

node = head                    # walk the chain
while node is not None:
    print(node.val)            # 4, then 7, then 9
    node = node.next

head.next = head.next.next     # re-point one link: 4 -&gt; 9
print(unlinked(head))          # [4, 9]</code></pre>
<p>There is no indexing and no <code>len</code>. You change the list by assigning to <code>next</code>, and order matters: once you overwrite a <code>next</code>, the node it pointed to is lost unless another variable holds it.</p>
<p>Reach for a linked list when items are often inserted or removed: only a link or two changes.</p>`,
      task: py`
<p>A conveyor in the Works is a chain of carriers, each pointing at the next. It has to run the other way.</p>
<p>Write <code>reverse_list(head)</code>. <code>head</code> is the first node of a linked list, or <code>None</code> for an empty list. Reverse the list by re-pointing the <code>next</code> of the existing nodes, without creating new nodes, and return the new head.</p>
<pre><code>unlinked(reverse_list(linked([1, 2, 3, 4, 5])))   # [5, 4, 3, 2, 1]
unlinked(reverse_list(linked([])))                # []</code></pre>
<p>The last test checks that the original nodes were reused: after the call, the old head must be the tail.</p>`,
      starter: py`def reverse_list(head):
    # Walk the chain. Point each node's next at the node that came before it.
    pass
`,
      tests: [
        { call: py`unlinked(reverse_list(linked([1, 2, 3, 4, 5])))`, expect: py`[5, 4, 3, 2, 1]` },
        { call: py`unlinked(reverse_list(linked([])))`, expect: py`[]` },
        { call: py`unlinked(reverse_list(linked([1, 2])))`, expect: py`[2, 1]` },
        { call: py`unlinked(reverse_list(linked([7])))`, expect: py`[7]` },
        { call: py`unlinked(reverse_list(linked([3, 3, -1, 0, 3])))`, expect: py`[3, 0, -1, 3, 3]` },
        {
          setup: py`values = list(range(1, 61))`,
          call: py`unlinked(reverse_list(linked(values))) == values[::-1]`,
          expect: py`True`,
          show: py`unlinked(reverse_list(linked([1, 2, ..., 60]))) == [60, 59, ..., 1]`,
        },
        {
          setup: py`head = linked([1, 2, 3])`,
          call: py`[unlinked(reverse_list(head)), unlinked(head)]`,
          expect: py`[[3, 2, 1], [1]]`,
          show: py`[unlinked(reverse_list(head)), unlinked(head)]   # with head = linked([1, 2, 3])`,
        },
      ],
      hints: [
        py`Each node needs only one change: its <code>next</code> must point at the node that used to come before it. The first node has nothing before it, so its <code>next</code> becomes <code>None</code>.`,
        py`Walk the list with two variables: <code>prev</code>, which starts as <code>None</code>, and <code>node</code>, which starts as <code>head</code>. Before you overwrite <code>node.next</code>, save its old value in a third variable, or the rest of the list is lost.`,
        py`In the loop: save <code>node.next</code>, set <code>node.next = prev</code>, move <code>prev</code> to <code>node</code>, then move <code>node</code> to the saved node. When <code>node</code> becomes <code>None</code>, <code>prev</code> is the new head.`,
      ],
      solution: py`def reverse_list(head):
    prev = None                   # head of the part that is already reversed
    node = head
    while node is not None:
        following = node.next     # keep hold of the rest before cutting the link
        node.next = prev          # turn this node's pointer around
        prev = node
        node = following
    return prev                   # the old tail is the new head
`,
      explain: py`
<p>The loop keeps the list in two parts: a reversed part that starts at <code>prev</code>, and the untouched rest that starts at <code>node</code>. Each pass moves one node from the front of the rest to the front of the reversed part. Saving <code>node.next</code> first is what keeps the rest reachable after the link is turned around.</p>
<p>When the rest is empty, <code>prev</code> holds the old tail, which is the new head. For an empty list the loop never runs and <code>None</code> comes back.</p>
<p><b>Cost:</b> <code>O(n)</code> time and <code>O(1)</code> extra space. The recursive alternative reverses everything after the head and then hooks the head onto the end. It reads well, but it uses <code>O(n)</code> space on the call stack.</p>`,
    },
    {
      id: 'z5-max-depth',
      zone: 5,
      order: 3,
      kind: 'code',
      title: 'Deepest Branch',
      concept: 'Binary trees and recursion',
      classic: 'Maximum Depth of Binary Tree (LeetCode #104)',
      difficulty: 'Easy',
      boss: false,
      lesson: py`
<p>A <b>binary tree</b> is made of nodes that each hold a value and up to two children, <code>left</code> and <code>right</code>. A missing child is <code>None</code>. The top node is the <b>root</b>, and a node with no children is a <b>leaf</b>. Trees hold anything that branches: folders inside folders, or the moves in a game.</p>
<p>Every level has a <code>TreeNode</code> class and the helper <code>tree</code>, which builds a tree from a list written level by level, left to right. <code>None</code> in the list marks a missing child.</p>
<pre><code>root = tree([8, 3, 10, 1, None, 9])
#         8
#       /   \
#      3     10
#     /     /
#    1     9
print(root.val, root.left.val, root.right.left.val)   # 8 3 9
print(root.left.right)                                # None</code></pre>
<p>Each child is the root of a smaller tree. That makes recursion the natural tool: answer the empty tree directly, and for any other tree combine the node with the answers from its two subtrees.</p>
<pre><code>def size(node):                  # how many nodes
    if node is None:
        return 0                 # base case: the empty tree
    return 1 + size(node.left) + size(node.right)

print(size(root))                # 5</code></pre>`,
      task: py`
<p>The Works routes power through a tree of junctions.</p>
<p>Write <code>max_depth(root)</code>. Return the depth of the tree: the number of levels it has, counting the root as level 1. An empty tree, where <code>root</code> is <code>None</code>, has depth 0.</p>
<pre><code>max_depth(tree([3, 9, 20, None, None, 15, 7]))   # 3
max_depth(tree([1, None, 2]))                    # 2</code></pre>`,
      starter: py`def max_depth(root):
    # An empty tree has depth 0. Any other tree is one level deeper than its deeper subtree.
    pass
`,
      tests: [
        { call: py`max_depth(tree([3, 9, 20, None, None, 15, 7]))`, expect: py`3` },
        { call: py`max_depth(tree([1, None, 2]))`, expect: py`2` },
        { call: py`max_depth(tree([]))`, expect: py`0` },
        { call: py`max_depth(tree([1]))`, expect: py`1` },
        { call: py`max_depth(tree([1, 2, None, 3, None, 4, None, 5]))`, expect: py`5` },
        { call: py`max_depth(tree([1, 2, 3, 4, 5, 6, 7]))`, expect: py`3` },
        { call: py`max_depth(tree([1, 2, 3, None, None, None, 4, None, 5]))`, expect: py`4` },
        { call: py`max_depth(tree([0, -4, 0, None, 0]))`, expect: py`3` },
      ],
      hints: [
        py`The depth of a tree depends only on the depths of its two subtrees. You do not have to keep track of paths.`,
        py`An empty tree has depth 0. Any other tree is one level, the root, plus the deeper of its left and right subtrees.`,
        py`If <code>root is None</code>, return 0. Otherwise return <code>1 + max(max_depth(root.left), max_depth(root.right))</code>.`,
      ],
      solution: py`def max_depth(root):
    if root is None:
        return 0                  # base case: an empty tree has no levels
    # this node is one level; below it, the deeper subtree decides
    return 1 + max(max_depth(root.left), max_depth(root.right))
`,
      explain: py`
<p>The function trusts itself on smaller trees. The longest path from a node goes through whichever child has the deeper subtree, and the node itself adds one level. The empty tree is the base case, so a leaf needs no special handling: both of its children report 0 and the leaf returns 1.</p>
<p><b>Cost:</b> <code>O(n)</code> time, because every node is visited once. Space is <code>O(h)</code> for the call stack, where <code>h</code> is the height of the tree: about <code>log n</code> for a balanced tree, and <code>n</code> for a tree that is one long chain.</p>
<p>The alternative walks the tree level by level with a queue and counts the levels. You will build that traversal in the next level.</p>`,
    },
    {
      id: 'z5-level-order',
      zone: 5,
      order: 4,
      kind: 'code',
      title: 'Floor by Floor',
      concept: 'Breadth-first search with a deque',
      classic: 'Binary Tree Level Order Traversal (LeetCode #102)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>Recursion dives down one branch before it looks at the next. <b>Breadth-first search</b> (BFS) visits a tree the other way: the root, then every node one step below it, then every node two steps below.</p>
<p>BFS runs on a <b>queue</b>: items join at the back and leave from the front, first in, first out. A list is slow at removing from the front, because every other item has to shift. <code>collections.deque</code> works at both ends in <code>O(1)</code>, with <code>append</code> and <code>popleft</code>.</p>
<pre><code>from collections import deque

def show(root):
    queue = deque([root])
    while queue:                          # until the queue is empty
        node = queue.popleft()            # the oldest node first
        print(node.val)
        if node.left is not None:
            queue.append(node.left)       # children wait at the back
        if node.right is not None:
            queue.append(node.right)

show(tree([1, 2, 3, 4, None, 5]))         # 1 2 3 4 5, one per line</code></pre>
<p>Children always queue up behind the nodes already waiting, so a whole level leaves the queue before the next level starts. Reach for BFS when distance from the start matters: the levels of a tree, or the shortest route through a grid.</p>`,
      task: py`
<p>PIP inspects the junction tree one level at a time.</p>
<p>Write <code>level_order(root)</code>. Return a list with one inner list per level, top level first. Each inner list holds the values of that level from left to right. An empty tree gives <code>[]</code>.</p>
<pre><code>level_order(tree([3, 9, 20, None, None, 15, 7]))   # [[3], [9, 20], [15, 7]]
level_order(tree([1]))                             # [[1]]</code></pre>`,
      starter: py`from collections import deque

def level_order(root):
    # Use a queue. In each round, handle exactly the nodes that are in it when the round starts.
    pass
`,
      tests: [
        { call: py`level_order(tree([3, 9, 20, None, None, 15, 7]))`, expect: py`[[3], [9, 20], [15, 7]]` },
        { call: py`level_order(tree([1]))`, expect: py`[[1]]` },
        { call: py`level_order(tree([]))`, expect: py`[]` },
        { call: py`level_order(tree([1, 2, 3, 4, 5, 6, 7]))`, expect: py`[[1], [2, 3], [4, 5, 6, 7]]` },
        { call: py`level_order(tree([1, 2, None, 3, None, 4]))`, expect: py`[[1], [2], [3], [4]]` },
        { call: py`level_order(tree([1, 2, 3, None, 4, None, 5]))`, expect: py`[[1], [2, 3], [4, 5]]` },
        { call: py`level_order(tree([0, -1, 0, None, None, 0]))`, expect: py`[[0], [-1, 0], [0]]` },
      ],
      hints: [
        py`A queue hands nodes back in the order they were added. If the queue holds exactly one level, then once those nodes have left, it holds exactly the next level.`,
        py`Start with the root in a <code>deque</code>. Each round: note how many nodes are in the queue, take exactly that many from the front, collect their values in a list, and append their children at the back. Then add the list to the result.`,
        py`Return <code>[]</code> at once if <code>root</code> is <code>None</code>. Otherwise loop <code>while queue:</code>, and inside it loop <code>for _ in range(len(queue)):</code> with <code>popleft</code>. The name <code>_</code> is an ordinary variable for a counter you never read. The <code>range</code> is fixed when the inner loop starts, so children added during the round wait for the next one.`,
      ],
      solution: py`from collections import deque

def level_order(root):
    if root is None:
        return []
    levels = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):           # exactly the nodes of this level
            node = queue.popleft()
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)       # children belong to the next round
            if node.right is not None:
                queue.append(node.right)
        levels.append(level)
    return levels
`,
      explain: py`
<p>The queue always holds nodes in the order they were discovered. At the start of a round it contains one complete level and nothing else. <code>len(queue)</code> is read once, before the inner loop, so the loop removes exactly that level while the children it appends form the next one.</p>
<p><b>Cost:</b> <code>O(n)</code> time, because each node is appended once and popped once, and both deque operations are <code>O(1)</code>. Space is <code>O(n)</code> for the result. The queue itself never holds more than two neighbouring levels.</p>
<p>The alternative is a depth-first recursion that carries the depth along and appends each value to <code>levels[depth]</code>. It produces the same lists, but BFS matches the level-by-level shape of the question directly.</p>`,
    },
    {
      id: 'z5-number-of-islands',
      zone: 5,
      order: 5,
      kind: 'code',
      title: 'Powered Islands',
      concept: 'Grid traversal with visited marking',
      classic: 'Number of Islands (LeetCode #200)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A grid is a list of rows, and <code>grid[r][c]</code> is the cell in row <code>r</code>, column <code>c</code>. Many grid questions are about <b>regions</b>: groups of cells joined up, down, left or right.</p>
<p>To explore a region, start at one cell and spread to its four neighbours, then to theirs. Stop when you step off the grid or reach a cell that does not belong. <b>Mark each cell as visited</b> before moving on, or neighbours will send you back and forth forever.</p>
<pre><code>def region_size(grid, r, c):
    if r &lt; 0 or r &gt;= len(grid) or c &lt; 0 or c &gt;= len(grid[0]):
        return 0                       # off the grid
    if grid[r][c] != "1":
        return 0                       # not land, or already counted
    grid[r][c] = "#"                   # mark as visited
    return (1 + region_size(grid, r + 1, c) + region_size(grid, r - 1, c)
              + region_size(grid, r, c + 1) + region_size(grid, r, c - 1))

plan = [["1", "1", "0"],
        ["0", "1", "0"],
        ["0", "0", "1"]]
print(region_size(plan, 0, 0))         # 3</code></pre>
<p>This spreading search is a <b>flood fill</b>. Written with recursion it is a depth-first search. Reach for it when cells or nodes form connected groups.</p>`,
      task: py`
<p>A floor map of the Works marks powered plates with <code>"1"</code> and dead plates with <code>"0"</code>.</p>
<p>Write <code>num_islands(grid)</code>. The grid is a list of rows, and each row is a list of the strings <code>"1"</code> and <code>"0"</code>. An island is a group of <code>"1"</code> cells connected up, down, left or right. Diagonal neighbours do not connect. Return the number of islands. The grid has at least one row and one column, and you may change its cells.</p>
<pre><code>num_islands([["1", "1", "0", "0"],
             ["1", "0", "0", "1"],
             ["0", "0", "1", "1"]])   # 2</code></pre>`,
      starter: py`def num_islands(grid):
    # Scan every cell. Each unvisited "1" is a new island: count it, then flood all of it.
    pass
`,
      tests: [
        {
          call: py`num_islands([["1", "1", "0", "0"], ["1", "0", "0", "1"], ["0", "0", "1", "1"]])`,
          expect: py`2`,
        },
        {
          call: py`num_islands([["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]])`,
          expect: py`1`,
          show: py`num_islands(grid)   # rows: 11110 / 11010 / 11000 / 00000`,
        },
        {
          call: py`num_islands([["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]])`,
          expect: py`3`,
          show: py`num_islands(grid)   # rows: 11000 / 11000 / 00100 / 00011`,
        },
        { call: py`num_islands([["0", "0"], ["0", "0"]])`, expect: py`0` },
        { call: py`num_islands([["1"]])`, expect: py`1` },
        {
          call: py`num_islands([["1", "0", "1"], ["0", "1", "0"], ["1", "0", "1"]])`,
          expect: py`5`,
          show: py`num_islands(grid)   # rows: 101 / 010 / 101`,
        },
        {
          call: py`num_islands([["1", "0", "1"], ["1", "0", "1"], ["1", "1", "1"]])`,
          expect: py`1`,
          show: py`num_islands(grid)   # rows: 101 / 101 / 111`,
        },
        { call: py`num_islands([["1", "0", "1", "1", "0", "1"]])`, expect: py`3` },
      ],
      hints: [
        py`One search from a single land cell can visit a whole island. The number of islands is the number of times you have to start a new search.`,
        py`Loop over every cell. When you find a <code>"1"</code>, add 1 to the count and flood that island: change the cell to <code>"0"</code>, then do the same for its four neighbours. A flooded cell can never start another search.`,
        py`Write a helper <code>sink(grid, r, c)</code>. It returns at once if <code>r</code> or <code>c</code> is outside the grid, or if the cell is not <code>"1"</code>. Otherwise it sets the cell to <code>"0"</code> and calls itself for <code>(r + 1, c)</code>, <code>(r - 1, c)</code>, <code>(r, c + 1)</code> and <code>(r, c - 1)</code>.`,
      ],
      solution: py`def sink(grid, r, c):
    # Stop at the edge of the grid, at water, and at land that is already sunk.
    if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] != "1":
        return
    grid[r][c] = "0"                     # mark as visited
    sink(grid, r + 1, c)
    sink(grid, r - 1, c)
    sink(grid, r, c + 1)
    sink(grid, r, c - 1)


def num_islands(grid):
    count = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == "1":        # land that no search has reached yet
                count += 1
                sink(grid, r, c)         # remove the whole island
    return count
`,
      explain: py`
<p>The outer loops look at every cell. The first time they reach a piece of an island, the island is counted and <code>sink</code> turns all of it into water, so no other cell of it can be counted again. Overwriting the cell is the visited mark. It is set before the recursive calls, which stops two neighbours from calling each other forever.</p>
<p><b>Cost:</b> <code>O(rows &times; cols)</code> time, since each cell is sunk at most once and checked a constant number of times. Space is <code>O(rows &times; cols)</code> in the worst case for the call stack, when one island snakes through the whole grid.</p>
<p>The solution changes the caller's grid. To avoid that, record visited cells in a set of <code>(r, c)</code> tuples. A breadth-first search with a <code>deque</code> works as well, and it avoids deep recursion on large grids.</p>`,
    },
    {
      id: 'z5-kth-largest',
      zone: 5,
      order: 6,
      kind: 'code',
      title: 'Kth Strongest Beacon',
      concept: 'Heaps with heapq',
      classic: 'Kth Largest Element in an Array (LeetCode #215)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>A <b>heap</b> is a list arranged so that its smallest item is always at index 0. Adding an item, or removing the smallest, takes <code>O(log n)</code> steps. That is much cheaper than sorting again after every change.</p>
<p>The <code>heapq</code> module runs a plain list as a heap:</p>
<pre><code>import heapq

heap = []
for v in [5, 1, 8, 3]:
    heapq.heappush(heap, v)      # add, keeping the heap order

print(heap[0])                   # 1, the smallest, still in the heap
print(heapq.heappop(heap))       # 1, removed
print(heapq.heappop(heap))       # 3
print(len(heap))                 # 2</code></pre>
<p>Only <code>heap[0]</code> is guaranteed. The rest of the list is not in sorted order, so do not read it as if it were.</p>
<p>Reach for a heap when you need the smallest item again and again while the collection keeps changing. A heap also finds the largest few values of a long list: keep it small, and each time it grows past the size you want, pop its smallest value. What survives are the largest values, with the smallest of them at index 0.</p>`,
      task: py`
<p>The Works ranks its beacons by signal strength.</p>
<p>Write <code>find_kth_largest(nums, k)</code>. Return the value that would be at position <code>k</code> if <code>nums</code> were sorted from largest to smallest, counting from 1. Equal values each take their own position. <code>k</code> is always between 1 and <code>len(nums)</code>.</p>
<pre><code>find_kth_largest([3, 2, 1, 5, 6, 4], 2)            # 5
find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)   # 4</code></pre>`,
      starter: py`import heapq

def find_kth_largest(nums, k):
    # Keep a heap of the k largest values seen so far. Its smallest item is the answer.
    pass
`,
      tests: [
        { call: py`find_kth_largest([3, 2, 1, 5, 6, 4], 2)`, expect: py`5` },
        { call: py`find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)`, expect: py`4` },
        { call: py`find_kth_largest([1], 1)`, expect: py`1` },
        { call: py`find_kth_largest([7, 2, 9], 3)`, expect: py`2` },
        { call: py`find_kth_largest([7, 2, 9], 1)`, expect: py`9` },
        { call: py`find_kth_largest([2, 2, 2, 2], 3)`, expect: py`2` },
        { call: py`find_kth_largest([-1, -5, -3, 0], 2)`, expect: py`-1` },
        { call: py`find_kth_largest([1, 2, 3, 4, 5, 6], 4)`, expect: py`3` },
      ],
      hints: [
        py`You do not need the whole list in order. You only need to know which <code>k</code> values are the largest, and which of those is the smallest.`,
        py`Walk through <code>nums</code> and push each value onto a heap. Whenever the heap holds more than <code>k</code> values, pop once. The pop removes the smallest, which can no longer be among the <code>k</code> largest.`,
        py`After the loop the heap holds exactly the <code>k</code> largest values, and a heap keeps its smallest item at index 0. Return <code>heap[0]</code>.`,
      ],
      solution: py`import heapq

def find_kth_largest(nums, k):
    heap = []                        # the k largest values seen so far
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)      # drop the smallest of the k + 1
    return heap[0]                   # the smallest of the k largest
`,
      explain: py`
<p>The heap is a filter that holds at most <code>k</code> values. Each time it grows to <code>k + 1</code>, the smallest value is removed: <code>k</code> larger values are known, so it can never be the answer. At the end the heap contains the <code>k</code> largest values of the list, and the smallest of those, at <code>heap[0]</code>, is the kth largest overall.</p>
<p><b>Cost:</b> <code>O(n log k)</code> time and <code>O(k)</code> extra space.</p>
<p>The main alternative is one line: <code>sorted(nums, reverse=True)[k - 1]</code>. It costs <code>O(n log n)</code> time and <code>O(n)</code> space. On a small list you will not see a difference. The heap wins when <code>k</code> is small and the data is large, or arrives as a stream too long to hold in memory. <code>heapq.nlargest(k, nums)</code> packages the same idea.</p>`,
    },
    {
      id: 'z5-coin-change',
      zone: 5,
      order: 7,
      kind: 'code',
      title: 'Fewest Power Cells',
      concept: 'Bottom-up dynamic programming',
      classic: 'Coin Change (LeetCode #322)',
      difficulty: 'Medium',
      boss: false,
      lesson: py`
<p>In the Pattern Forge you stored a recursion's answers in a memo. <b>Bottom-up dynamic programming</b> (DP) builds those answers from the other end: a loop starts with the smallest subproblem and fills a table upwards.</p>
<p>The recipe: decide what one table entry means, fill in the entries you know outright, and compute every later entry from earlier ones.</p>
<p>Here each stair step charges a fee when you leave it. You climb one or two at a time, starting on step 0 or 1.</p>
<pre><code>def cheapest(fee):
    # best[i]: least fee to arrive at step i (the top is step len(fee))
    best = [0] * (len(fee) + 1)       # all zeros: steps 0 and 1 are free
    for i in range(2, len(fee) + 1):
        one = best[i - 1] + fee[i - 1]      # arrived with one step
        two = best[i - 2] + fee[i - 2]      # arrived with two steps
        best[i] = min(one, two)
    return best[-1]

print(cheapest([10, 15, 20]))         # 15: start on step 1</code></pre>
<p>Each entry keeps the cheaper of its two possible last moves.</p>
<p>Reach for DP when a problem asks for a best value or a count that can be built from answers for smaller inputs.</p>`,
      task: py`
<p>The reactor needs an exact charge, built from power cells of fixed sizes. You have an unlimited supply of every size.</p>
<p>Write <code>coin_change(coins, amount)</code>. <code>coins</code> lists the available sizes, all positive, and <code>amount</code> is the total to reach, zero or more. Return the smallest number of coins that adds up to exactly <code>amount</code>, or <code>-1</code> if no combination does.</p>
<pre><code>coin_change([1, 2, 5], 11)   # 3, as 5 + 5 + 1
coin_change([2], 3)          # -1</code></pre>
<p>The last test has a step limit. A recursion that tries every combination without storing results is too slow.</p>`,
      starter: py`def coin_change(coins, amount):
    # Build a table: fewest[a] is the smallest number of coins that makes the amount a.
    pass
`,
      tests: [
        { call: py`coin_change([1, 2, 5], 11)`, expect: py`3` },
        { call: py`coin_change([2], 3)`, expect: py`-1` },
        { call: py`coin_change([1], 0)`, expect: py`0` },
        { call: py`coin_change([1, 3, 4], 6)`, expect: py`2` },
        { call: py`coin_change([5, 7], 13)`, expect: py`-1` },
        { call: py`coin_change([9, 6, 5, 1], 11)`, expect: py`2` },
        { call: py`coin_change([7], 21)`, expect: py`3` },
        { call: py`coin_change([1, 5, 6, 9], 58)`, expect: py`8`, perf: true },
      ],
      hints: [
        py`Suppose you already knew the smallest number of coins for every amount below <code>a</code>. The last coin you add is one of the given sizes, and what is left after removing it is a smaller amount.`,
        py`Make a list <code>fewest</code> with one entry for each amount from 0 to <code>amount</code>. Entry 0 is 0. Start every other entry at a value that means <i>not reachable</i>, such as <code>amount + 1</code>. Fill the list from left to right.`,
        py`For each amount <code>a</code> and each coin <code>c</code> with <code>c &lt;= a</code>, try <code>fewest[a - c] + 1</code> and keep the smallest. At the end, if <code>fewest[amount]</code> is still larger than <code>amount</code>, return <code>-1</code>.`,
      ],
      solution: py`def coin_change(coins, amount):
    unreachable = amount + 1                 # more coins than any real answer
    fewest = [0] + [unreachable] * amount    # fewest[a]: fewest coins that make a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                # use coin c last: one coin on top of the best way to make a - c
                fewest[a] = min(fewest[a], fewest[a - c] + 1)
    if fewest[amount] > amount:
        return -1                            # still the filler: no combination works
    return fewest[amount]
`,
      naive: py`def coin_change(coins, amount):
    if amount == 0:
        return 0
    best = -1
    for c in coins:
        if c <= amount:
            rest = coin_change(coins, amount - c)    # solved again on every path
            if rest != -1 and (best == -1 or rest + 1 < best):
                best = rest + 1
    return best
`,
      explain: py`
<p><code>fewest[a]</code> is the smallest number of coins that makes the amount <code>a</code>. The last coin in any way of making <code>a</code> is some coin <code>c</code>, and the coins before it make <code>a - c</code> as cheaply as possible. So trying every coin as the last one and keeping the minimum gives the best count. Smaller entries are final when the loop reaches <code>a</code>.</p>
<p>The filler <code>amount + 1</code> means <i>not reachable</i>. No real answer uses more than <code>amount</code> coins, so it never wins a <code>min</code> by mistake.</p>
<p><b>Cost:</b> <code>O(amount &times; len(coins))</code> time and <code>O(amount)</code> space. Plain recursion is exponential. Taking the largest coin first is fast but wrong: for <code>[1, 3, 4]</code> and 6 it uses three coins, where <code>3 + 3</code> needs two. Recursion with a memo is the top-down form of the same table.</p>`,
    },
    {
      id: 'z5-lru-cache',
      zone: 5,
      order: 8,
      kind: 'code',
      title: 'The Shard Cache',
      concept: 'Design: dictionary plus an ordering',
      classic: 'LRU Cache (LeetCode #146)',
      difficulty: 'Medium',
      boss: true,
      lesson: py`
<p>A cache keeps a limited number of results close at hand. When it is full, something has to go. The <b>least recently used</b> (LRU) rule removes the entry that has gone longest without being read or written.</p>
<p>That takes two abilities at once: find any key in one step, and know the order in which keys were last used. A dictionary gives the first. <code>collections.OrderedDict</code> adds the second: it is a dictionary whose keys you can reorder.</p>
<pre><code>from collections import OrderedDict

recent = OrderedDict()
recent["a"] = 1
recent["b"] = 2
recent["c"] = 3
recent.move_to_end("a")              # "a" is now the newest
print(list(recent))                  # ['b', 'c', 'a']
print(recent.popitem(last=False))    # ('b', 2): the oldest, removed
print(list(recent))                  # ['c', 'a']</code></pre>
<p>Both calls take <code>O(1)</code> time. Keep the oldest key at the front and the newest at the back, and move a key to the back each time it is used.</p>
<p>Problems like this one are <b>design</b> problems. You combine structures so that each covers what the other lacks: here, fast lookup from the dictionary and memory of use from the ordering.</p>`,
      task: py`
<p>The Works keeps recently used data shards close at hand, with room for only a few.</p>
<p>Write a class <code>LRUCache</code>:</p>
<ul>
<li><code>LRUCache(capacity)</code> creates an empty cache that holds at most <code>capacity</code> keys. <code>capacity</code> is 1 or more.</li>
<li><code>get(key)</code> returns the value stored for <code>key</code>, or <code>-1</code> if the key is not in the cache.</li>
<li><code>put(key, value)</code> stores the value, replacing any old value for that key, and returns nothing. If the cache then holds more than <code>capacity</code> keys, it removes the least recently used one.</li>
</ul>
<p>A <code>get</code> that finds its key and every <code>put</code> count as using that key. The tests drive the class with <code>ops</code>, as on the first level of this floor.</p>
<pre><code>cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
cache.get(1)      # 1
cache.put(3, 3)   # removes key 2
cache.get(2)      # -1</code></pre>
<p>The last test makes about 2,500 calls on a cache of 1,000 keys, with a step limit. Both methods have to run in <code>O(1)</code> time, so searching through a list is too slow.</p>`,
      starter: py`from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        # Keep the keys ordered from least recently used to most recently used.
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass
`,
      tests: [
        {
          call: py`ops(LRUCache, ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"], [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]])`,
          expect: py`[None, None, None, 1, None, -1, None, -1, 3, 4]`,
        },
        {
          call: py`ops(LRUCache, ["LRUCache", "get", "put", "get"], [[1], [5], [5, 50], [5]])`,
          expect: py`[None, -1, None, 50]`,
        },
        {
          call: py`ops(LRUCache, ["LRUCache", "put", "put", "get", "get"], [[1], [1, 10], [2, 20], [1], [2]])`,
          expect: py`[None, None, None, -1, 20]`,
        },
        {
          call: py`ops(LRUCache, ["LRUCache", "put", "put", "put", "put", "get", "get", "get"], [[2], [1, 1], [2, 2], [1, 10], [3, 3], [1], [2], [3]])`,
          expect: py`[None, None, None, None, None, 10, -1, 3]`,
        },
        {
          call: py`ops(LRUCache, ["LRUCache", "put", "put", "put", "get", "get"], [[2], [1, 1], [2, 2], [2, 20], [1], [2]])`,
          expect: py`[None, None, None, None, 1, 20]`,
        },
        {
          call: py`ops(LRUCache, ["LRUCache", "put", "get", "get", "put", "get"], [[2], [0, 0], [0], [7], [7, 0], [7]])`,
          expect: py`[None, None, 0, -1, None, 0]`,
        },
        {
          call: py`ops(LRUCache, ["LRUCache", "put", "put", "put", "get", "put", "get", "get", "put", "get", "get", "get"], [[3], [1, 1], [2, 2], [3, 3], [1], [4, 4], [2], [3], [5, 5], [1], [4], [5]])`,
          expect: py`[None, None, None, None, 1, None, -1, 3, None, -1, 4, 5]`,
        },
        {
          setup: py`count = 1000
names = ["LRUCache"] + ["put"] * count + ["get"] * count + ["put"] * 500 + ["get"] * 3
params = [[count]] + [[k, k * 2] for k in range(count)]
params += [[k] for k in range(count - 1, -1, -1)]
params += [[k, k * 2] for k in range(count, count + 500)]
params += [[500], [499], [1499]]`,
          call: py`ops(LRUCache, names, params)[-3:]`,
          expect: py`[-1, 998, 2998]`,
          show: py`ops(LRUCache, ...)[-3:]   # capacity 1,000: 1,000 put, 1,000 get, 500 put, then get(500), get(499), get(1499)`,
          perf: true,
        },
      ],
      hints: [
        py`You need two things at once: find a key in one step, and know which key was used longest ago. An ordered dictionary gives you both.`,
        py`Keep the keys in order of use, oldest first. Every <code>get</code> that finds its key, and every <code>put</code>, moves that key to the newest end. When a <code>put</code> leaves the cache over capacity, remove the key at the oldest end.`,
        py`In <code>get</code>: return <code>-1</code> if the key is missing, otherwise call <code>move_to_end(key)</code> and return the value. In <code>put</code>: if the key is already there, call <code>move_to_end(key)</code>. Store the value. If <code>len</code> is now above the capacity, call <code>popitem(last=False)</code>.`,
      ],
      solution: py`from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()            # least recently used first

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)           # reading counts as a use
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)       # an update is a use as well
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)    # evict the least recently used key
`,
      naive: py`class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.items = []                      # [key, value] pairs, oldest first

    def get(self, key):
        for i, (k, v) in enumerate(self.items):     # scan for the key
            if k == key:
                self.items.append(self.items.pop(i))
                return v
        return -1

    def put(self, key, value):
        for i, (k, v) in enumerate(self.items):     # scan again
            if k == key:
                self.items.pop(i)
                break
        self.items.append([key, value])
        if len(self.items) > self.capacity:
            self.items.pop(0)
`,
      explain: py`
<p>The <code>OrderedDict</code> keeps its keys in order of use: oldest at the front, newest at the back. A hit in <code>get</code> and every <code>put</code> move the key to the back, so the front is always the least recently used key and <code>popitem(last=False)</code> removes exactly that one. In <code>put</code> the size check comes after storing, so updating a key that is already present never evicts anything.</p>
<p><b>Cost:</b> <code>O(1)</code> time for both methods and <code>O(capacity)</code> space.</p>
<p>The classic hand-built answer is a dictionary that maps each key to a node in a doubly linked list. The list holds the order of use, and a node can be unhooked and moved to the end in <code>O(1)</code> because it knows both of its neighbours. <code>OrderedDict</code> works that way inside. Interviewers often ask for the hand-built version, so practise it once.</p>`,
    },
  ];

  (root.PYLON_LEVELS = root.PYLON_LEVELS || []).push(...LEVELS);
})(typeof window !== 'undefined' ? window : globalThis);
