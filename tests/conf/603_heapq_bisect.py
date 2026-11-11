# heapq and bisect (the internal heap layout is never printed, only pops and heap[0])
import heapq
import bisect
from heapq import heappush, heappop

heap = []
for n in [5, 1, 8, 3, 2]:
    heapq.heappush(heap, n)
print("smallest first:", heap[0], len(heap))
print("pops in order:", [heapq.heappop(heap) for _ in range(5)], heap)
data = [9, 4, 7, 1, 8, 2]
heapq.heapify(data)
print("heapify:", data[0], sorted(data), len(data))
print("heappushpop:", heapq.heappushpop(data, 3), data[0])
print("heappushpop below the minimum:", heapq.heappushpop(data, 0), data[0])
print("heapreplace:", heapq.heapreplace(data, 10), data[0])
print("drain:", [heappop(data) for _ in range(len(data))])
print("nlargest/nsmallest:", heapq.nlargest(3, [5, 1, 8, 3, 9, 2]), heapq.nsmallest(2, [5, 1, 8, 3, 9, 2]))
print("n beyond the size:", heapq.nlargest(10, [2, 1]), heapq.nsmallest(0, [2, 1]))
words = ["kiwi", "fig", "banana", "apple"]
print("with key:", heapq.nlargest(2, words, key=len), heapq.nsmallest(2, words, key=len))
tasks = []
heappush(tasks, (2, "write"))
heappush(tasks, (1, "plan"))
heappush(tasks, (3, "test"))
heappush(tasks, (1, "align"))
print("tuples by priority then name:", [heappop(tasks) for _ in range(4)])
maxheap = []
for n in [5, 1, 8]:
    heappush(maxheap, -n)
print("max-heap by negation:", -heappop(maxheap), -heappop(maxheap))

def heapsort(items):
    h = list(items)
    heapq.heapify(h)
    return [heappop(h) for _ in range(len(h))]

print("heapsort:", heapsort([3, 1, 4, 1, 5, 9, 2, 6]))
try:
    heappop([])
except IndexError:
    print("heappop from empty raises IndexError")
stream = []
for n in [5, 3, 8, 1, 9, 2]:
    heappush(stream, n)
    if len(stream) > 3:
        heappop(stream)
print("3 largest via bounded heap:", sorted(stream))

a = [1, 3, 3, 5, 8]
print("bisect_left:", bisect.bisect_left(a, 3), bisect.bisect_left(a, 4), bisect.bisect_left(a, 0),
      bisect.bisect_left(a, 9))
print("bisect_right:", bisect.bisect_right(a, 3), bisect.bisect_right(a, 4), bisect.bisect_right(a, 0),
      bisect.bisect_right(a, 8))
for value in [4, 0, 10, 3]:
    bisect.insort(a, value)
print("insort keeps order:", a)

def contains(sorted_list, x):
    i = bisect.bisect_left(sorted_list, x)
    return i < len(sorted_list) and sorted_list[i] == x

print("binary search:", contains(a, 5), contains(a, 6), contains([], 1))
print("count of 3:", bisect.bisect_right(a, 3) - bisect.bisect_left(a, 3))
print("values below 5:", bisect.bisect_left(a, 5), "| at most 5:", bisect.bisect_right(a, 5))
grades = "FDCBA"
breaks = [60, 70, 80, 90]
print("grade lookup:", [grades[bisect.bisect_right(breaks, s)] for s in [55, 60, 79, 90, 100]])
print("strings:", bisect.bisect_left(["apple", "fig", "kiwi"], "grape"))
