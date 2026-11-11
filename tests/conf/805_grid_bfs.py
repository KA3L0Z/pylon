# BFS shortest path on a small grid with collections.deque
from collections import deque

GRID = [
    "S.#.....",
    ".##.###.",
    "....#...",
    ".##.#.#.",
    "...#..#E",
]

def find(grid, symbol):
    for r, row in enumerate(grid):
        for c, cell in enumerate(row):
            if cell == symbol:
                return (r, c)
    return None

def neighbors(grid, r, c):
    for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] != "#":
            yield nr, nc

def shortest_path(grid, start, goal):
    queue = deque([start])
    came_from = {start: None}
    while queue:
        current = queue.popleft()
        if current == goal:
            path = []
            while current is not None:
                path.append(current)
                current = came_from[current]
            return path[::-1]
        for nxt in neighbors(grid, current[0], current[1]):
            if nxt not in came_from:
                came_from[nxt] = current
                queue.append(nxt)
    return None

def distances(grid, start):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        for nxt in neighbors(grid, r, c):
            if nxt not in dist:
                dist[nxt] = dist[(r, c)] + 1
                queue.append(nxt)
    return dist

start, goal = find(GRID, "S"), find(GRID, "E")
print("start:", start, "goal:", goal)
path = shortest_path(GRID, start, goal)
print("steps:", len(path) - 1)
print("path:", path)
drawn = [list(row) for row in GRID]
for r, c in path[1:-1]:
    drawn[r][c] = "*"
for row in drawn:
    print("".join(row))
dist = distances(GRID, start)
print("reachable cells:", len(dist), "| farthest distance:", max(dist.values()))
print("distance to goal:", dist[goal], "| to (2, 3):", dist[(2, 3)])
print("cells at distance 3:", sorted(cell for cell, d in dist.items() if d == 3))
print("no path:", shortest_path(["S#", "#E"], (0, 0), (1, 1)))
print("start equals goal:", shortest_path(GRID, start, start))
open_cells = sum(row.count(".") for row in GRID) + 2
print("unreachable open cells:", open_cells - len(dist))
