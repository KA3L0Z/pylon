# Sliding window: longest substring without repeating characters, and friends
def longest_unique(s):
    last_seen = {}
    start = best_len = best_start = 0
    for i, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= start:
            start = last_seen[ch] + 1
        last_seen[ch] = i
        if i - start + 1 > best_len:
            best_len = i - start + 1
            best_start = start
    return best_len, s[best_start:best_start + best_len]
for text in ["abcabcbb", "bbbbb", "pwwkew", "", "abcdef", "dvdf", "abba", "tmmzuxt"]:
    print(repr(text), "->", longest_unique(text))

def longest_unique_set(s):
    window = set()
    left = best = 0
    for right in range(len(s)):
        while s[right] in window:
            window.remove(s[left])
            left += 1
        window.add(s[right])
        best = max(best, right - left + 1)
    return best
print("set version agrees:", all(longest_unique(t)[0] == longest_unique_set(t)
                                 for t in ["abcabcbb", "pwwkew", "dvdf", "abba", ""]))

def max_window_sum(nums, k):
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best

def shortest_subarray_at_least(nums, target):
    left = total = 0
    best = len(nums) + 1
    for right, value in enumerate(nums):
        total += value
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return best if best <= len(nums) else 0
print("max sum of 3 consecutive:", max_window_sum([1, 4, 2, 10, 23, 3, 1, 0, 20], 3), max_window_sum([5, -1, -2, 8], 2))
print("shortest subarray with sum >= 7:", shortest_subarray_at_least([2, 3, 1, 2, 4, 3], 7),
      shortest_subarray_at_least([1, 1, 1], 7))

def longest_k_distinct(s, k):
    counts = {}
    left = best = 0
    for right, ch in enumerate(s):
        counts[ch] = counts.get(ch, 0) + 1
        while len(counts) > k:
            counts[s[left]] -= 1
            if counts[s[left]] == 0:
                del counts[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best

def find_anagrams(s, p):
    need = sorted(p)
    return [i for i in range(len(s) - len(p) + 1) if sorted(s[i:i + len(p)]) == need]
print("longest with at most 2 distinct:", longest_k_distinct("eceba", 2), longest_k_distinct("aaabbcc", 2))
print("anagram start indices:", find_anagrams("cbaebabacd", "abc"), find_anagrams("abab", "ab"))
print("moving average:", [round(sum([3, 5, 7, 2, 8][i:i + 3]) / 3, 2) for i in range(3)])
