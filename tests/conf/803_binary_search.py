# Binary search and its common variants
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    steps = 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid, steps
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1, steps
data = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]
for target in [1, 7, 21, 13, 4, 0, 22]:
    index, steps = binary_search(data, target)
    print(f"search {target:>2}: index {index:>2} in {steps} steps")
print("empty list:", binary_search([], 5), "| single:", binary_search([5], 5), binary_search([5], 6))

def lower_bound(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

def upper_bound(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    return lo
dups = [1, 2, 2, 2, 3, 5, 5, 8]
print("lower bounds:", [lower_bound(dups, t) for t in [0, 2, 4, 5, 9]])
print("upper bounds:", [upper_bound(dups, t) for t in [0, 2, 4, 5, 9]])
print("count of 2 and 5:", upper_bound(dups, 2) - lower_bound(dups, 2), upper_bound(dups, 5) - lower_bound(dups, 5))
print("first and last position of 2:", lower_bound(dups, 2), upper_bound(dups, 2) - 1)

def search_recursive(nums, target, lo=0, hi=None):
    if hi is None:
        hi = len(nums) - 1
    if lo > hi:
        return -1
    mid = (lo + hi) // 2
    if nums[mid] == target:
        return mid
    if nums[mid] < target:
        return search_recursive(nums, target, mid + 1, hi)
    return search_recursive(nums, target, lo, mid - 1)

def int_sqrt(n):
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if mid * mid <= n:
            lo = mid
        else:
            hi = mid - 1
    return lo
print("recursive:", [search_recursive(data, t) for t in [1, 11, 21, 8]])
print("integer square roots:", [int_sqrt(n) for n in [0, 1, 15, 16, 17, 99, 10 ** 12]])
words = ["apple", "banana", "cherry", "fig", "kiwi"]
print("search strings:", binary_search(words, "fig")[0], binary_search(words, "grape")[0])
