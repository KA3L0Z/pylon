# Pylon prelude: helpers that exist in every level, for the player's code and for the tests.
# Keep this file plain Python. The game's interpreter runs this exact text before the player's code.


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return "ListNode(" + repr(self.val) + ")"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return "TreeNode(" + repr(self.val) + ")"


def linked(values):
    """Build a linked list from a Python list. Returns the head node, or None for an empty list."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def unlinked(node):
    """Turn a linked list back into a Python list."""
    out = []
    while node is not None:
        out.append(node.val)
        node = node.next
        if len(out) > 10000:
            raise ValueError("this linked list never ends (it has a cycle)")
    return out


def tree(values):
    """Build a binary tree from a level-order list. None marks a missing child (LeetCode style)."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0
    i = 1
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def untree(root):
    """Turn a binary tree back into a level-order list with None gaps (trailing Nones removed)."""
    out = []
    queue = [root]
    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        if head > 20000:
            raise ValueError("this tree never ends (it has a cycle)")
    while out and out[-1] is None:
        out.pop()
    return out


def inplace(fn, *args):
    """Call fn(*args) for a function that changes its first argument in place, then return that argument."""
    fn(*args)
    return args[0]


def ops(cls, methods, args):
    """Run a LeetCode-style design test.

    methods[0] names the class (the constructor call); the rest are method names.
    args[i] is the argument list for methods[i]. Returns the list of results,
    with None for the constructor and for methods that return nothing.
    """
    obj = cls(*args[0])
    results = [None]
    for name, a in zip(methods[1:], args[1:]):
        results.append(getattr(obj, name)(*a))
    return results


def _ops_text(cls, methods, args):
    """The same design test written as a readable chain of calls (the game shows this next to the result)."""
    parts = []
    for name, a in zip(methods, args):
        parts.append(name + "(" + ", ".join([repr(x) for x in a]) + ")")
    return "  ".join(parts)
