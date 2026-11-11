# Coin change with dynamic programming: fewest coins, number of ways, the coins used
def min_coins(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for value in range(1, amount + 1):
        for coin in coins:
            if coin <= value and dp[value - coin] + 1 < dp[value]:
                dp[value] = dp[value - coin] + 1
    return dp[amount] if dp[amount] != INF else -1

def count_ways(coins, amount):
    ways = [1] + [0] * amount
    for coin in coins:
        for value in range(coin, amount + 1):
            ways[value] += ways[value - coin]
    return ways[amount]
print("fewest coins:", min_coins([1, 2, 5], 11), min_coins([2], 3), min_coins([1], 0),
      min_coins([1, 5, 10, 25], 63), min_coins([3, 7], 5))
print("number of ways:", count_ways([1, 2, 5], 5), count_ways([2], 3), count_ways([10], 10),
      count_ways([1, 5, 10, 25], 50))

def coins_used(coins, amount):
    best = [0] + [None] * amount
    last = [None] * (amount + 1)
    for value in range(1, amount + 1):
        for coin in coins:
            prev = value - coin
            if prev >= 0 and best[prev] is not None and (best[value] is None or best[prev] + 1 < best[value]):
                best[value] = best[prev] + 1
                last[value] = coin
    if best[amount] is None:
        return None
    used = []
    while amount > 0:
        used.append(last[amount])
        amount -= last[amount]
    return used

def greedy(coins, amount):
    used = []
    for coin in sorted(coins, reverse=True):
        while amount >= coin:
            used.append(coin)
            amount -= coin
    return used if amount == 0 else None
print("coins used:", coins_used([1, 2, 5], 11), coins_used([1, 3, 4], 6), coins_used([2], 3), coins_used([5, 10], 0))
print("greedy is not always optimal:", greedy([1, 3, 4], 6), "vs", coins_used([1, 3, 4], 6))
print("greedy on standard coins:", greedy([1, 5, 10, 25], 63))
memo = {}

def min_coins_memo(coins, amount):
    if amount == 0:
        return 0
    if amount < 0:
        return None
    if amount not in memo:
        options = [min_coins_memo(coins, amount - c) for c in coins]
        options = [o + 1 for o in options if o is not None]
        memo[amount] = min(options) if options else None
    return memo[amount]

def climb(n):
    ways = [1, 1]
    for _ in range(n - 1):
        ways.append(ways[-1] + ways[-2])
    return ways[n]
print("top-down memo:", min_coins_memo((1, 2, 5), 11), min_coins_memo((1, 2, 5), 27), len(memo))
print("dp table for [1, 3, 4]:", [min_coins([1, 3, 4], n) for n in range(11)])
print("climbing stairs with 1 or 2 steps:", [climb(n) for n in range(1, 9)])
