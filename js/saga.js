/* Pylon's plot: the silent colony.

   The tower was the only link to the colony ship Meridian: 4,112 people asleep, eleven light-hours out, waiting for the
   course correction that tells them when to brake. Three years ago the chief engineer, T. Reyes, shut the tower down
   floor by floor. The player is sent to bring it back before the braking window closes.

   MISSIONS gives every level a reason to exist: two or three sentences shown at the top of its briefing.
   SCENES are played when a floor begins and when it comes back online, and at the summit. A scene is a list of lines:
     { w: who, t: text }        who: '' (the narrator), 'pip', 'reyes' (a recording), 'voice' (whatever answers), 'you'
     { choice: key, q: question, opts: [[value, label], ...] }       the answer is kept and later lines can depend on it
     a line with { on: key, is: value } is only said when that choice was made */
(function (root) {
const MISSIONS = {
  // Floor 1, Boot Deck
  'z1-first-steps': 'PIP is the only thing in the tower that still answers. It was left on the Boot Deck with four commands and no memory. Before anything else comes back, it has to move.',
  'z1-turn-the-corner': 'The corridor to the lift bends. PIP does what it is told, in the order it is told, and it will happily walk off an edge if that is what the order says.',
  'z1-dont-repeat-yourself': 'Power shards are scattered along the deck where the cells burst. The tower needs every one of them, and you do not have time to write the same line eleven times.',
  'z1-square-patrol': 'The deck\'s outer ring has four sides and a relay on each. Whoever built it walked this square every morning. Now PIP does.',
  'z1-until-the-wall': 'The maps of the lower corridors were wiped with everything else. PIP has to walk until something stops it, because nobody can tell it how far that is.',
  'z1-fork-in-the-road': 'Some tiles still hold a shard and some were cleaned out years ago. PIP cannot know which until it stands on one.',
  'z1-teach-pip-a-trick': 'Reyes left PIP four commands on purpose. A fifth one has to come from you. Teach it once, and it will know it for the rest of the climb.',
  'z1-the-maze': 'The last door of the Boot Deck is behind the maintenance maze. There is no map and there never was: the crew followed the wall. So will PIP.',
  // Floor 2, Logic Gardens
  'z2-status-report': 'The first console wakes up and waits. The settlement council is listening on the other end and wants three lines: that the tower is alive, where you are, and how much charge is left.',
  'z9-console-input': 'The operator console has not been typed at in three years. It asks for a name and a number, and it will take whatever it is given.',
  'z2-shelf-slots': 'The garden shelves hold spare cells in crates. Nobody remembers how many slots a delivery needs, and the last guess left cells on the floor.',
  'z2-name-plates': 'Every relay has a name plate, typed by hand, by tired people. Spaces at the ends, capitals in the middle. The tower compares them letter by letter and matches none.',
  'z2-relay-modes': 'This is where it started to go wrong. The relays switch mode on charge and heat, and the rule lived in the operators\' heads. Write it down so that a machine can check it.',
  'z7-leap-cycle': 'Meridian\'s clock and the tower\'s clock have to agree to the day, across eleven light-hours and a great many years. One calendar rule decides whether they do.',
  'z2-fizz-buzz': 'Before a relay is trusted it sends a test pattern: a known sequence, so that the far end can see at once if a line is dropped.',
  'z2-running-sum': 'The garden cells charge one after another. The meter on the wall shows only the last reading. You need the total after every cell.',
  'z2-palindrome-number': 'Relay codes that read the same both ways were reserved for the links to the ship. The old checker compared them as text and got the negative ones wrong.',
  'z2-two-sum': 'The gate to the Data Vaults opens for exactly two cells that supply exactly the right charge together. It has been shut since the day Reyes left.',
  // Floor 3, Cipher Hall
  'z7-tape-splice': 'The hall\'s message tapes run in loops. To read one from the right place you cut it and join it again further along.',
  'z7-reverse-words': 'A relay in the hall has been sending its words back to front for years. Nobody fixed the relay. They learned to read backwards.',
  'z7-common-prefix': 'Every station on the same line starts its call sign the same way. Find what a group of them share and you know which line you are hearing.',
  'z7-caesar': 'The crew sent private notes up the tower with every letter shifted along the alphabet. It was never meant to be secure. It was meant to keep the council from reading over their shoulders.',
  'z7-flexible-functions': 'The dials in the hall have a setting most people never touch. A good tool has sensible settings already, and lets you change one by name.',
  'z8-modules': 'The range finder measures how far a signal has to travel in hops of a fixed reach. The arithmetic is in a toolbox that somebody else already wrote.',
  'z7-safe-parse': 'Half the sensors in the hall are dead and send nonsense. The old code met the first bad reading and stopped. Three settlements got no weather that week.',
  'z7-bug-hunt': 'Reyes left one program in the hall half repaired, with a note: "four things wrong, found two." Find all four.',
  'z7-decoder': 'Every message to the ship carries a check number, so that the far end can tell a true line from a damaged one. The decoder that tests it is the last thing between you and the vaults. Remember this check. You will want it at the top.',
  // Floor 4, Data Vaults
  'z3-contains-duplicate': 'The vault index lists every reading the tower ever took. Some are listed twice, and a correction worked out from doubled readings is wrong.',
  'z8-pythonic-loops': 'Two channels carried the ship\'s telemetry, one for position and one for time. They only mean something read side by side.',
  'z3-valid-anagram': 'The shards of memory in the vault were shelved by their letters, shuffled. Two shards with the same letters belong to the same record.',
  'z3-two-sum-fast': 'The same gate as two floors down, with a row of cells too long to try every pair. The vault slowed to a crawl doing exactly that.',
  'z3-sorted-squares': 'Signal strength falls with the square of the distance. The readings arrive sorted, the squares do not stay sorted, and the next stage needs them in order.',
  'z3-max-profit': 'Cells were traded with the settlements at a price that moved every day. The log shows what the crew paid. It does not show what they could have saved.',
  'z3-rotate-array': 'The vault door is a ring of numbered positions. It opens when the ring is turned by the right amount, in place, with nothing taken off it.',
  'z3-top-k-frequent': 'Most of what the tower heard came from a handful of channels. Find the busiest ones and you know where the crew spent its attention in the last year.',
  'z3-group-anagrams': 'The whole shelf of shards, sorted into records. When the last one is in place the vault\'s log opens, and something far away notices that Pylon is drawing power again.',
  // Floor 5, Signal Archive
  'z9-read-log': 'Reyes kept the tower\'s logs here. One file, eleven months long. Start by counting how many lines in it are alerts.',
  'z9-write-report': 'The council wants a report on paper, in the format the old tower used, because their machines still read that format and nothing else.',
  'z9-pattern-scan': 'Part codes are buried all through the logs, written by different hands in the middle of sentences. They all have the same shape.',
  'z9-field-extract': 'Each reading in the archive packs a station, a channel and a value into one string. The tower needs them apart, and needs to refuse the lines that are not readings at all.',
  'z9-incident-report': 'The same relay, the same error, four thousand times, in a file nobody opened. Write the ten lines that would have told them, and read what they say.',
  // Floor 6, Pattern Forge
  'z4-valid-palindrome': 'The forge tested each link to the ship with a signal that reads the same from both ends. Noise gets in between the letters. The pattern underneath has to hold.',
  'z4-valid-parentheses': 'Every coupling in the forge is opened and must be closed, in the right order. One left open and the line carries nothing.',
  'z4-binary-search': 'Two hundred thousand relays in a sorted row, and one of them is the one the voice keeps naming. You do not have time to look at each.',
  'z8-single-number': 'Every part in the forge was made in pairs, a working one and a spare. One part on this list has no twin. That is the one Reyes took with her.',
  'z4-maximum-subarray': 'The power log is a run of surges and drains. Somewhere in it is the stretch where the tower was strongest. That is the stretch a correction has to be sent in.',
  'z4-longest-substring': 'A clean signal never repeats a symbol inside one window. The longest clean stretch in a noisy line is the part you can trust.',
  'z8-product-except-self': 'Each relay\'s gain depends on all the others and never on itself. The crew worked it out by hand, one relay at a time, fourteen different ways.',
  'z4-merge-intervals': 'The watch shifts in the last year overlap, because people stayed late and came early. Merge them and you can see how long the tower was really unattended.',
  'z4-three-sum': 'The forge balances when three cells cancel to nothing. Find every such three. When it balances, the answers from the dark start arriving faster. Much too fast.',
  // Floor 7, Structure Works
  'z5-min-stack': 'The works keep readings on a stack and ask, constantly, for the lowest one. Searching the stack each time is what brought the floor down.',
  'z8-inheritance': 'Every sensor in the works is a kind of sensor. The crew copied the same code into each kind and then fixed bugs in some copies and not others.',
  'z8-recursion': 'Supplies for the ship were packed in crates inside crates inside crates. The manifest gives the weight of the loose items only.',
  'z5-reverse-linked-list': 'Messages to the ship were chained oldest first. To see what the tower sent last, the chain has to be turned around without breaking a link.',
  'z8-merge-two-lists': 'Two logs of the same night, kept by two operators, each in order. One true account has to come out of both.',
  'z5-max-depth': 'The tower\'s decision tree grew a branch for every special case anyone thought of. How deep the deepest one goes tells you how lost they were.',
  'z5-level-order': 'To shut the works down safely Reyes went through the tree floor by floor, top to bottom. To start it again you read it the same way.',
  'z8-validate-bst': 'A search tree is only fast if it is in order everywhere, not just at the top. One of these was "fixed" by hand.',
  'z5-lru-cache': 'The cache holds the shards used most recently and drops the rest. Build it, and the works can hold the voice\'s last hundred messages side by side. Look at when each one arrived.',
  // Floor 8, Path Reactor
  'z8-matrix': 'The reactor\'s grid was drawn with rows and columns swapped by whoever copied it last. Turn it the right way before you trust a single coordinate.',
  'z4-climbing-stairs': 'The forge stairs can be taken one step or two at a time. The reactor asks how many ways there are, and the obvious way to count never finishes.',
  'z8-house-robber': 'Charge can be drawn from the cells in a row, but never from two neighbours, or both burn out. Take the most the row will give.',
  'z8-unique-paths': 'A signal crossing the lattice can only go right or down. The number of routes says how many ways a message could have reached the ship. One of them did.',
  'z5-coin-change': 'The correction needs an exact amount of power, made from cells of a few fixed sizes, using as few as possible. The router always grabbed the biggest first. It was often wrong.',
  'z8-jump-game': 'Each relay can throw a signal a certain number of hops ahead. Taking the nearest one at every step is how messages ended up in dead ends.',
  'z5-number-of-islands': 'Parts of the reactor floor still have power and parts are dark. Count the separate lit regions and you know how many places the fire can start from.',
  'z8-subsets': 'There are five people left in the settlement who can climb this tower. Every possible crew has to be considered, including the one with only you in it.',
  'z6-course-schedule': 'The reactor\'s modules need one another running first. Find an order that starts them all, or prove that Reyes left it so that it cannot be started by accident.',
  // Floor 9, Summit Core
  'z6-fibonacci-generator': 'The beacon\'s pulse grows without end, each beat the sum of the two before it. Nobody can store all of it. It has to be made as it is asked for.',
  'z6-memoize-decorator': 'The summit asks the same questions again and again. A relay that remembers its answers does the work once.',
  'z6-vector-class': 'The antenna is aimed with vectors: added, scaled, compared. Eleven light-hours out, a tenth of a degree is a different star.',
  'z6-permutations': 'The beacon\'s charges can be fired in any order, and only some orders are safe. List every order, then choose.',
  'z6-longest-increasing-subsequence': 'Three years of the ship\'s position, as the tower last knew it, with bad readings mixed in. The longest run that only rises is the real track.',
  'z8-trie': 'Every call sign the tower has ever heard, indexed by how it begins. Look up the one the voice uses. See how long the tower has known it.',
  'z5-kth-largest': 'The summit can lock on to only a few beacons at once. It needs the strongest few out of thousands, and it cannot sort them all in time.',
  'z6-trapping-rain-water': 'The cooling fins hold coolant between them like rain between walls. Too little and the beacon burns out in the first minute of the burn.',
  'z6-merge-k-sorted-lists': 'Every log in the tower, each one in order, merged into a single account of what was sent and when. This is the last thing Reyes did not have time to write.',
};

const SCENES = {
  f1s: [
    { w: '', t: 'The lift stops at the lowest deck and will not go higher. The tower above you is dark, floor after floor.' },
    { w: '', t: 'Your orders are one page long. Pylon was the only link to the colony ship Meridian: 4,112 people asleep, eleven light-hours out. They brake when Pylon tells them to. Pylon has told them nothing for three years.' },
    { w: '', t: 'The braking window closes in nineteen days.' },
    { w: 'pip', t: 'Systems online. I am PIP. I know four commands.' },
    { w: 'you', t: 'Four? The manual lists two hundred.' },
    { w: 'pip', t: 'Chief Engineer Reyes removed the rest before she shut the tower down. She said: "Whoever wakes it, start small." I do not know why. I was not asked.' },
  ],
  f1e: [
    { w: '', t: 'The Boot Deck lights come up in rows. Somewhere above, a second floor starts to draw power.' },
    { w: 'pip', t: 'There is something in my memory that I cannot open. A block, sealed, dated the day of the shutdown.' },
    { w: 'pip', t: 'It unlocks a little with every floor that comes back. I can keep opening it as we climb, or I can leave it shut.' },
    { choice: 'mem', q: 'What do you tell PIP?', opts: [['open', 'Open it. I want to know what happened.'], ['shut', 'Leave it shut. We have a job to do.']] },
    { on: 'mem', is: 'open', w: 'pip', t: 'Opening. The first thing in it is her voice. I will play you what I find.' },
    { on: 'mem', is: 'shut', w: 'pip', t: 'Understood. I will not open it. I will tell you if it opens by itself.' },
  ],
  f2s: [
    { w: '', t: 'The Logic Gardens. Rows of relays under glass, every one of them stuck in the mode it was in when the power went.' },
    { w: 'reyes', t: 'Log, shutdown day two. If you are hearing this, you got PIP moving. Good. From here it stops being a drone on a deck. From here you write the rules the tower runs on.' },
    { w: 'reyes', t: 'We never wrote ours down. Remember that when it is tempting to guess.' },
  ],
  f2e: [
    { w: '', t: 'The gate to the Data Vaults opens for the first time in three years.' },
    { on: 'mem', is: 'open', w: 'pip', t: 'More of the block has opened. A list. Dates and a number beside each. The number is called "deviation". It grows.' },
    { on: 'mem', is: 'shut', w: 'pip', t: 'The sealed block is larger than it was. I have not looked. You said not to.' },
    { w: 'you', t: 'Deviation of what?' },
    { w: 'pip', t: 'I have a number. I do not have its meaning. That is higher up.' },
  ],
  f3s: [
    { w: '', t: 'Cipher Hall. Message tapes hang from the ceiling like vines. Most are blank. A few still turn.' },
    { w: 'reyes', t: 'Log, shutdown day three. Every message we sent the ship carried a check number. The last digits of the line, worked out from the rest. If the check fails, the ship throws the line away.' },
    { w: 'reyes', t: 'That check is the only reason they are still alive. Learn it here. I mean that.' },
  ],
  f3e: [
    { w: '', t: 'The decoder runs clean. On the far wall a counter starts: LINES VERIFIED.' },
    { w: 'pip', t: 'I have run the decoder over the last messages this tower sent before the shutdown.' },
    { w: 'you', t: 'And?' },
    { w: 'pip', t: 'They pass the check. Every one of them. And the course figures inside them are wrong. The check tells you a line arrived whole. It does not tell you the line was true.' },
  ],
  f4s: [
    { w: '', t: 'The Data Vaults. Cold. Shelves of memory shards to the ceiling, and a single terminal with its screen still on.' },
    { on: 'mem', is: 'open', w: 'reyes', t: 'This is from PIP\'s sealed block. "I asked for a week to restructure the vaults. I was given a weekend. So the corrections were computed from readings we held twice and searched badly. They were small errors. Eleven light-hours makes small errors large."' },
    { on: 'mem', is: 'shut', w: 'reyes', t: 'Log, shutdown day four. The data was fine. The way we held it was not. Every correction we sent was computed from a pile nobody could search. Do it properly this time.' },
  ],
  f4e: [
    { w: '', t: 'The vault log opens. The tower\'s receiver, idle for three years, twitches.' },
    { w: 'voice', t: '...lon. ...ylon, respond. This is Meridian watch. We see power on your carrier. Pylon, respond.' },
    { w: 'you', t: 'That is the ship.' },
    { w: 'pip', t: 'It is a signal on the ship\'s channel, using the ship\'s call sign. I can tell you that much.' },
  ],
  f5s: [
    { w: '', t: 'The Signal Archive. Every word the tower ever sent or heard, filed by date. Reyes\'s chair is still pulled up to the desk.' },
    { w: 'voice', t: 'Pylon, this is Meridian watch. We have been without correction for three years. We are off our line. Please respond.' },
    { w: 'reyes', t: 'Log, shutdown day five. I finally read the logs. All of them. The warnings were there for eleven months. The tower told us. We were not listening.' },
  ],
  f5e: [
    { w: '', t: 'The incident report prints: one relay, one error, four thousand and twelve times. Under it, in Reyes\'s handwriting: "Every correction after this date is wrong. I sent them anyway. I did not know."' },
    { w: 'voice', t: 'Pylon, we can see you. Why do you not answer? We are running out of time to brake. Give us a number, any number, and we will fly it.' },
    { choice: 'talk', q: 'The transmitter on this floor works. Do you answer?', opts: [['answer', 'Answer: "Meridian, this is Pylon. Stand by."'], ['listen', 'Stay silent and keep listening.']] },
    { on: 'talk', is: 'answer', w: 'voice', t: 'Pylon! Thank you. Thank you. Standing by for your correction. Send it as soon as you have it.' },
    { on: 'talk', is: 'answer', w: 'pip', t: 'It answered you in four seconds.' },
    { on: 'talk', is: 'listen', w: 'voice', t: 'Pylon, respond. Pylon, respond. Pylon, respond.' },
    { on: 'talk', is: 'listen', w: 'pip', t: 'The same words, the same spacing, every ninety seconds. I am counting.' },
  ],
  f6s: [
    { w: '', t: 'The Pattern Forge. The same handful of problems, solved fourteen ways each, on benches down both walls.' },
    { w: 'pip', t: 'I have a question and no instruction to ask it.' },
    { w: 'you', t: 'Ask.' },
    { w: 'pip', t: 'The ship is eleven light-hours away. A question takes eleven hours to reach it. An answer takes eleven hours to come back.' },
    { on: 'talk', is: 'answer', w: 'pip', t: 'It answered you in four seconds.' },
    { on: 'talk', is: 'listen', w: 'pip', t: 'It began calling the moment the vault drew power. Not eleven hours later.' },
  ],
  f6e: [
    { w: '', t: 'The forge balances. For a moment every bench on the floor shows the same thing: an arrival time beside each message from the voice.' },
    { w: 'you', t: 'Seconds. All of them. Whatever that is, it is not eleven light-hours away.' },
    { w: 'voice', t: 'Pylon, we are waiting for your correction. Send the figures in our last message back to us and we will fly them. Please. There are children asleep on this ship.' },
    { w: 'pip', t: 'It wants us to send it its own numbers.' },
  ],
  f7s: [
    { w: '', t: 'Structure Works. One program, nine thousand lines long, printed and pinned along the whole length of the floor like a frieze.' },
    { on: 'mem', is: 'open', w: 'reyes', t: 'From PIP\'s block. "When I understood, I had two choices. Keep sending corrections I could not trust, or send nothing. A ship that hears nothing holds its course. A ship that hears a wrong number flies it. So I turned the tower off."' },
    { on: 'mem', is: 'shut', w: 'reyes', t: 'Log, shutdown day seven. A ship that hears nothing holds its course. A ship that hears a wrong number flies it. That is the whole reason. Remember it when something asks you to hurry.' },
  ],
  f7e: [
    { w: '', t: 'The cache fills: the last hundred messages from the voice, side by side.' },
    { w: 'pip', t: 'There are only eleven different messages. The rest are the same eleven, repeated. The newest one is three years old.' },
    { w: 'you', t: 'It is a recording.' },
    { w: 'pip', t: 'It is the tower. The receiver kept the ship\'s last calls and has been playing them back to itself since the power returned. Nobody is lying to us. Nobody is there. Not within four seconds.' },
    { w: 'you', t: 'Then the ship is still out there, holding its course, hearing nothing.' },
    { w: 'pip', t: 'For nineteen days more. Fewer, now.' },
  ],
  f8s: [
    { w: '', t: 'The Path Reactor. Every route a signal can take from here to the ship is drawn on the floor in light.' },
    { w: 'reyes', t: 'Log, shutdown day eight. The router took the nearest relay at every step, because nearest felt safe. Planning a whole route costs more thought than taking the next step. I did not have the thought to spare.' },
    { w: 'voice', t: 'Pylon, send the figures in our last message. Pylon, send the figures in our last message.' },
    { w: 'pip', t: 'I can mute that.' },
    { w: 'you', t: 'Leave it. I want to remember what hurrying sounds like.' },
  ],
  f8e: [
    { w: '', t: 'The reactor\'s modules start in order, one after another, and stay up.' },
    { w: 'pip', t: 'The route is planned. The summit is next. The beacon is there, and the last thing she did not have time to write.' },
    { on: 'mem', is: 'open', w: 'pip', t: 'The block is fully open. The last entry is not for the council. It is addressed to "whoever climbed".' },
    { on: 'mem', is: 'shut', w: 'pip', t: 'The sealed block has opened by itself. I did not open it. The last entry is addressed to "whoever climbed".' },
  ],
  f9s: [
    { w: '', t: 'The Summit Core. The beacon sits dark above a ring of consoles. Through the open roof, stars.' },
    { w: 'reyes', t: '"To whoever climbed. You rebuilt it the other way: from the bottom, one idea at a time. I patched what I never understood, and four thousand people are off their line because of it."' },
    { w: 'reyes', t: '"The true track of the ship is in these logs, under the noise. Merge them, work out a correction from what is real, and check it. Then send it once, and wait the twenty-two hours like an adult. Do not send them a number because something is begging for one."' },
  ],
  summit: [
    { w: '', t: 'Every log in the tower lies merged in one line of light across the summit floor. The beacon is charged. The antenna is aimed.' },
    { w: 'voice', t: 'Pylon, send the figures in our last message. Pylon, please. There is no more time.' },
    { w: 'pip', t: 'Two corrections are ready. The first is the one in the recording: the last figures this tower ever sent, three years old. It passes the check. It can go this second.' },
    { w: 'pip', t: 'The second is the one you can work out now, from the merged logs, with everything you built on the way up. It will take the rest of the night, and I will check every line of it.' },
    { choice: 'end', q: 'Which correction do you send?', opts: [['verify', 'Work it out from the merged logs, check it, then send.'], ['send', 'Send the recorded figures now. There is no time.']] },
    { on: 'end', is: 'verify', w: '', t: 'You work until the stars have turned a quarter of the sky. PIP checks each line against the decoder from Cipher Hall and says nothing until the last one passes.' },
    { on: 'end', is: 'verify', w: 'pip', t: 'It is whole, and as far as anything in this tower can tell, it is true. Sending. Once.' },
    { on: 'end', is: 'send', w: '', t: 'The figures leave the antenna in under a second. The recording goes quiet, as if satisfied. PIP watches the empty channel.' },
    { on: 'end', is: 'send', w: 'pip', t: 'Sent. It passed the check. It was three years old. I am going to work out the other one anyway, and send it behind the first. It will arrive four hours later. That may be enough.' },
    { w: '', t: 'The beacon turns. Eleven hours out. Eleven hours back.' },
  ],
};

// What comes back, twenty-two hours later.
const REPLY = {
  verify: ['Twenty-two hours and nine minutes later, PIP\'s antenna twitches.', '"PYLON, THIS IS MERIDIAN. CORRECTION RECEIVED AND CHECKED. BRAKING ON YOUR MARK. WE THOUGHT YOU WERE GONE."', '"WHO IS YOUR ENGINEER?"', 'PIP looks at you.'],
  send: ['Twenty-two hours and nine minutes later, PIP\'s antenna twitches.', '"PYLON, THIS IS MERIDIAN. YOUR FIRST CORRECTION WAS THREE YEARS STALE. WE HAD BEGUN TO FLY IT. YOUR SECOND REACHED US IN TIME. BRAKING ON THE SECOND."', '"NEXT TIME, SEND ONE. WHO IS YOUR ENGINEER?"', 'PIP looks at you.'],
};
const WHO = { pip: 'PIP', reyes: 'T. Reyes, recorded', voice: 'On the ship\'s channel', you: 'You', '': '' };

root.PYLON_SAGA = { MISSIONS, SCENES, REPLY, WHO };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PYLON_SAGA;
})(typeof window !== 'undefined' ? window : globalThis);
