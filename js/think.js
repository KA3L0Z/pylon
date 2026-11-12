/* "Work this out first": two questions at the end of every mission briefing.

   A briefing shows a tool at work on other data. These questions point at the gap between that and the mission: the
   case the example did not cover, the decision the task leaves open. They ask and never answer, so the working out
   stays with the player. tools/check_story.js makes sure every code level has them. */
(function (root) {
const THINK = {
  // Floor 2
  'z2-status-report': ['Two of the three lines need a space between their parts and one must not have it. Which way of joining values gives a space, and which gives none?', 'One of the values is a number. Which joining tool refuses a number, and what do you do to the number first?'],
  'z9-console-input': ['What type of value does input() hand you, even when the operator types digits?', 'The second line of output needs arithmetic. At which point does the text have to become a number?'],
  'z2-shelf-slots': ['Take 20 cells and crates of 6 on paper. How many full crates, how many left over, how many slots?', 'Which operator gives the full crates and which gives the leftovers? What happens to both when the cells divide exactly?'],
  'z2-name-plates': ['The name can arrive with stray spaces and in any mix of capitals. In which order do you clean it, count it and cut it, and does the order matter?', 'How many characters lie between the first and the last of a 7-letter name? Write that as arithmetic on len().'],
  'z2-relay-modes': ['The rules are checked in order and the first that fits wins. What does that tell you about using if, elif and else rather than three separate ifs?', '"At least 60" and "below 50": which comparison operator is each, exactly?'],
  'z7-leap-cycle': ['Try 1900, 2000 and 2024 by hand against the three rules. Which rule decides each one?', 'How do you ask "divides evenly by" in Python? Can the three rules become one expression with and, or, not?'],
  'z2-fizz-buzz': ['15 is a multiple of 3 and of 5. In which order must the rules be tested so that it does not come out as plain "Fizz"?', 'The list has to hold strings only. What must happen to an ordinary number before it goes in?'],
  'z2-running-sum': ['Work [3, 1, 4] by hand. What single number do you need to remember as you move from one item to the next?', 'Where does the answer list start, and at which moment in the loop does each new item go into it?'],
  'z2-palindrome-number': ['How do you get the last digit of a whole number with arithmetic alone? How do you then remove it?', 'If you build the number backwards digit by digit, what do you compare it with at the end, and what must you have kept safe to do that?'],
  'z2-two-sum': ['The briefing printed every pair. What do you test about a pair instead of printing it, and what do you do the moment the test succeeds?', 'Why can the inner loop never start at the same position as the outer one?'],
  // Floor 3
  'z7-tape-splice': ['A six-character tape turned 8 times looks the same as turned how many times? Which operator gives you that number?', 'An empty tape has length 0. Which step of your plan breaks on it, and how do you step around that?'],
  'z7-reverse-words': ['What does split() with no arguments do with several spaces in a row, and with spaces at the ends?', 'Once you have the words in a list, which two steps turn the list back into the sentence the task asks for?'],
  'z7-common-prefix': ['If every name starts with the answer, the first name does too. How can the first name serve as your starting guess?', 'When a name does not start with your guess, how do you make the guess shorter, and when do you stop?'],
  'z7-caesar': ['What number is "a" in ord()? If you subtract that from any small letter, what range of numbers do you get?', 'With a key of 3, "y" must become "b". Which operator wraps a number that has run past the end back to the start?'],
  'z7-flexible-functions': ['When skip_zero is true, which readings take part in the lowest, the highest and the average? Build that list first.', 'How do you return three values at once, and what does the caller receive?'],
  'z8-modules': ['The distance between two points is the long side of a right triangle. Which function in math gives a square root?', 'A distance of 10 with a reach of 4 needs how many hops? Rounding down gives the wrong answer: which way do you round, and which function does it?'],
  'z7-safe-parse': ['int("n/a") raises an error. Where exactly does the try go so that one bad reading does not end the whole loop?', 'How will you know, after the loop, that not a single reading was a number? What do you have to count?'],
  'z7-bug-hunt': ['Before changing a line, run the function by hand on three readings where you know the answer. Which line first gives a value you did not expect?', 'What does the function do when no reading is above the limit? Follow that path to the end.'],
  'z7-decoder': ['A line is valid only if three separate things hold. In which order do you check them so that a later check never crashes on a line the earlier one should have rejected?', 'What does split(":") give for a line with too few fields, and for one with too many?'],
  // Floor 4
  'z3-contains-duplicate': ['A set never holds the same value twice. If you pour a list into a set, what can its size tell you?', 'Could you also stop early, the moment you meet a value you have already seen? What would you keep in the set as you go?'],
  'z8-pythonic-loops': ['zip() stops at the shorter of its two inputs. After it stops, which part of the longer string is still missing from your answer?', 'How do you get "everything from position n to the end" of a string without a loop?'],
  'z3-valid-anagram': ['Two words are anagrams when what is the same about them? Say it in terms of counts.', 'The briefing counted votes. What are you counting here, and what do you compare at the end?'],
  'z3-two-sum-fast': ['Standing on one number, which other number are you hoping to have already seen? Write it as arithmetic.', 'A dictionary can answer "have I seen this value, and where?" in one step. What is the key and what is the value?'],
  'z3-sorted-squares': ['Square [-4, -1, 0, 3] by hand. Why is the result no longer in order?', 'Which two tools from the briefing, one after the other, give the answer in a single line?'],
  'z3-max-profit': ['On any day, the best sale you can make depends on one fact about the days before it. Which fact?', 'So what two numbers do you carry through the loop, and in which order do you update them?'],
  'z3-rotate-array': ['Turning a list of 5 by 7 steps is the same as turning it by how many?', 'The task says to change the list itself. What is the difference between nums = ... and nums[:] = ... for the caller?'],
  'z3-top-k-frequent': ['First you need to know how often each value appears. Which container holds that?', 'Then you need the values ordered by their count, not by themselves. What do you give sorted() so that it sorts by something else?'],
  'z3-group-anagrams': ['Which thing is identical for "tan" and "nat" but different for "tan" and "ten"? That thing can be a dictionary key.', 'A list cannot be a dictionary key. What can you turn it into?'],
  // Floor 5
  'z9-read-log': ['The briefing printed each line. What do you ask about each line instead, and what do you add to when the answer is yes?', 'Which part of your code can fail when the file is missing, and what does the task want returned then?'],
  'z9-write-report': ['print() adds a line break for you and write() does not. Whichever you choose, how does each line end up with exactly one?', 'The last line needs the sum and the function returns a count. Which two things do you keep track of as you write?'],
  'z9-pattern-scan': ['Say the shape of a part code out loud, piece by piece. Which piece of pattern stands for "a capital letter" and which for "exactly four digits"?', 'AB-12345 contains AB-1234. Should it count? Look at the examples in the task and decide whether your pattern needs an edge on each side.'],
  'z9-field-extract': ['Four parts come out of the line. How do you mark the parts of a pattern you want handed back?', 'The whole line must fit the form, with nothing before or after. Which matching function insists on that, and what does it return when the line does not fit?'],
  'z9-incident-report': ['Split the job into stages: read, pick out, count, order, write. What does each stage hand to the next?', 'The report is ordered by count first and by name second. How do you give sorted() two things to sort by?'],
  // Floor 6
  'z4-valid-palindrome': ['Characters that are not letters or digits are ignored. Do you remove them first, or step over them as you go? Either works: which is easier to get right?', 'Two positions walk toward each other. What is true the moment they meet or cross?'],
  'z4-valid-parentheses': ['When you meet a closing bracket, which opening bracket must it match: the first one still open, or the most recent?', 'A string can be wrong in two different ways: one you notice in the middle, and one you only notice at the very end. What are they?'],
  'z4-binary-search': ['The briefing searched the numbers 1 to 100. You are searching positions in a list. What are the first and last positions?', 'What is true about lo and hi when the value is not in the list at all, and what do you return then?'],
  'z8-single-number': ['What is 5 ^ 5? What is 0 ^ 7? What do those two facts do to a list in which everything but one number comes twice?', 'Does the order of the numbers matter for that? Try [4, 1, 4] by hand.'],
  'z4-maximum-subarray': ['Standing on one number, the best run that ends here is one of two things. Which two?', 'The list can be all negative. What does that say about starting your best-so-far at 0?'],
  'z4-longest-substring': ['The window grows on the right. When the new character is already inside it, what has to leave from the left, and until when?', 'At which moment in the loop is the window guaranteed clean, so that its length is worth comparing?'],
  'z8-product-except-self': ['The product of everything except position i is two products multiplied together. Which two?', 'How can one pass from the left prepare the first of them for every position at once?'],
  'z4-merge-intervals': ['After sorting by start, an interval can only overlap one earlier block. Which one?', 'When two intervals overlap, what is the end of the merged block? Careful with [1, 10] followed by [2, 3].'],
  'z4-three-sum': ['The briefing found pairs with a given sum. If you fix one number first, what sum do the other two need?', 'There are two places where a repeated value could report the same triplet twice. Where are they?'],
  // Floor 7
  'z5-min-stack': ['After a pop, the lowest value may have changed. What would you have to remember, for every item on the stack, to know the new lowest at once?', 'Where do you keep that, and when is it written?'],
  'z8-inheritance': ['label() is the same for every sensor. In which class should it be written, and what does it call to find the status?', 'TempSensor takes one more argument than Sensor. Which part of the setting up should it hand to its parent?'],
  'z8-recursion': ['An item in a crate is one of two kinds. How do you tell them apart in code?', 'What does the function return for an empty crate, and why does that one case make all the others work?'],
  'z5-reverse-linked-list': ['Draw three nodes and turn the first arrow around. Which node have you just lost hold of, and what should you have saved first?', 'When the walk reaches the end, which variable holds the new head?'],
  'z8-merge-two-lists': ['At every step you choose between two nodes. Which one, and what moves forward afterwards?', 'One list runs out first. What is the quickest thing to do with what is left of the other?'],
  'z5-max-depth': ['If you already knew the depth of the left subtree and of the right one, how deep is the whole tree?', 'What is the depth of a tree with no nodes?'],
  'z5-level-order': ['The briefing printed nodes one by one. At the start of a round, how can you tell how many nodes belong to the level you are about to read?', 'Where does each level\'s own list begin, and when is it finished?'],
  'z8-validate-bst': ['In [5, 1, 4, None, None, 3, 6] every child is on the correct side of its own parent. So why is it not a search tree?', 'Going down to the right of a node tells you something about every value below. What limit do you carry down with you?'],
  'z5-lru-cache': ['The cache has to know which key was used longest ago. Which container from the briefing keeps an order you can change?', 'A get() also counts as use. What must it do besides returning the value?'],
  // Floor 8
  'z8-matrix': ['A grid with 2 rows and 3 columns turns into a grid of what shape?', 'The new row number c is built from which cells of the old grid? Say it with indexes before you write a loop.'],
  'z4-climbing-stairs': ['The last move onto step n came from one of two steps. Which two? What does that say about the number of ways?', 'Calling the function for 60 asks for the same smaller answers again and again. Where can you keep an answer so that it is worked out once?'],
  'z8-house-robber': ['At each cell you either drain it or skip it. If you drain it, which earlier total can you add it to?', 'How many earlier totals do you really need to remember as you walk the row?'],
  'z8-unique-paths': ['You can only arrive at a cell from two directions. So the routes to it are the sum of what?', 'How many routes lead to any cell in the top row, or in the left column?'],
  'z5-coin-change': ['Suppose you already know the fewest coins for every amount below 11. How do you get the fewest for 11 from them?', 'Some amounts cannot be made at all. What do you store for those so that they never win a min()?'],
  'z8-jump-game': ['Walking left to right, what is the one number worth remembering about everything you have passed?', 'What has happened if you arrive at a position that is beyond that number?'],
  'z5-number-of-islands': ['When you find a powered plate, how do you make sure the rest of its island is not counted again later?', 'From one plate, which neighbours do you visit, and which checks stop you from walking off the grid?'],
  'z8-subsets': ['For each number there is one yes-or-no decision. How many decisions are there for three numbers, and how many outcomes?', 'When you add the current group to the answer, why must you add a copy?'],
  'z6-course-schedule': ['The briefing built the graph and counted what each node waits for. Which nodes can go first?', 'Finishing a node frees others. How do you notice, at the end, that some nodes were never freed?'],
  // Floor 9
  'z6-fibonacci-generator': ['The sequence never ends. What kind of loop does that call for, and why does it not hang the program?', 'How many earlier values do you have to keep to produce the next one?'],
  'z6-memoize-decorator': ['Where do the remembered results live so that each decorated function has its own and keeps it between calls?', 'What can serve as the dictionary key for a call such as f(2, 5)?'],
  'z6-vector-class': ['Which special method does == call, and which does + call? Write the list of the six you need before any code.', 'Two equal vectors must count once in a set. What do they have to agree on besides ==?'],
  'z6-permutations': ['In the first position you may put any of the numbers. Having put one there, what is the smaller problem that remains?', 'After exploring one choice you try the next. What must you undo in between?'],
  'z6-longest-increasing-subsequence': ['Let best[i] be the longest rising run that ends exactly at position i. Which earlier positions can it continue from?', 'The answer is not necessarily at the last position. Where is it?'],
  'z8-trie': ['"car" and "card" share three letters. What does the node after "r" need to remember so that search("car") and search("ca") give different answers?', 'How do search and starts_with differ in the very last step, when all the letters were found?'],
  'z5-kth-largest': ['If you keep only the k largest values seen so far, which of them is the answer at the end?', 'A heap gives you its smallest item fast. Why is that exactly the item you want to throw out when the heap grows past k?'],
  'z6-trapping-rain-water': ['How much liquid stands above one bar depends on two walls. Which two, and which of them sets the level?', 'With a pointer at each end, which side is it safe to settle first, and why?'],
  'z6-merge-k-sorted-lists': ['At any moment the next node of the answer is the smallest of how many candidates?', 'Two nodes with the same value cannot be compared with each other. What can you put between the value and the node in each tuple so that the heap never has to?'],
};
root.PYLON_THINK = THINK;
if (typeof module !== 'undefined' && module.exports) module.exports = THINK;
})(typeof window !== 'undefined' ? window : globalThis);
