# Two sum with a dictionary of seen values, plus related pair problems
def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        need = target - n
        if need in seen:
            return [seen[need], i]
        seen[n] = i
    return None

def two_sum_brute(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return None

cases = [([2, 7, 11, 15], 9), ([3, 2, 4], 6), ([3, 3], 6), ([1, 2, 3], 7), ([-1, -2, -3, -4, -5], -8),
         ([0, 4, 3, 0], 0)]
for nums, target in cases:
    print("two_sum", nums, target, "->", two_sum(nums, target))
print("brute force agrees:", all(two_sum(n, t) == two_sum_brute(n, t) for n, t in cases))

def all_pairs(nums, target):
    seen = set()
    pairs = set()
    for n in nums:
        if target - n in seen:
            pairs.add((min(n, target - n), max(n, target - n)))
        seen.add(n)
    return sorted(pairs)

def two_sum_sorted(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]
        if total == target:
            return [lo, hi]
        if total < target:
            lo += 1
        else:
            hi -= 1
    return None

print("all unique pairs:", all_pairs([1, 5, 7, -1, 5, 3, 3], 6))
print("two pointers on sorted input:", two_sum_sorted([1, 2, 4, 7, 11, 15], 15), two_sum_sorted([1, 2, 3], 10))

def three_sum(nums):
    nums = sorted(nums)
    found = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total == 0:
                found.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
            elif total < 0:
                lo += 1
            else:
                hi -= 1
    return found

print("three sum:", three_sum([-1, 0, 1, 2, -1, -4]))
print("three sum, no answer:", three_sum([1, 2, 3]), three_sum([0, 0, 0, 0]))
