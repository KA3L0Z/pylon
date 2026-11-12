/* Pylon's story: why the tower went dark, told by the engineer who turned it off.
   One log entry is recovered each time a floor comes back online, and each one is about the habit that floor teaches.
   Also here: what PIP says. PIP is a drone that does exactly what it is told, and talks like one. */
(function (root) {
  const LOGS = [
    { title: 'Shutdown, day one',
      text: 'I have parked PIP on the Boot Deck with its memory wiped down to four commands. It will do exactly what it is told and nothing else. After the year we have had, that sounds like a virtue. Whoever wakes it: start small.',
      pip: 'I remember being parked. I do not remember agreeing to it.' },
    { title: 'Rules nobody wrote down',
      text: 'The gardens ran on rules that lived in people\'s heads. "If the charge looks low, switch to saver." Looks low to whom? Every operator decided differently, and the relays flickered between modes all night. A condition has to be written so that a machine can check it. We never wrote one.',
      pip: 'I have no opinion on what looks low. I have a number.' },
    { title: 'Stray spaces',
      text: 'A message arrived as " relay 7 : ok " with stray spaces around it, and the parser read it as a failure. Nobody had told the code what to do with input it did not expect, so it guessed, and then it hid its mistakes. Three settlements got the wrong weather that week.',
      pip: 'I would have reported the spaces. Nobody asked me.' },
    { title: 'One long list',
      text: 'The vaults slowed to a crawl. We kept every reading in one long list and searched it from the front, every time, for every request. The data was fine. The way we held it was not. I asked for a week to restructure it and was given a weekend.',
      pip: 'A weekend. I have waited years. I win.' },
    { title: 'Four thousand warnings',
      text: 'I finally read the logs. All of them. The warnings had been there for eleven months: the same relay, the same error, four thousand times, in a file nobody opened because nobody had written the ten lines it takes to count them. The tower told us. We were not listening.',
      pip: 'Four thousand. I would have counted. Counting is the one thing I am good at.' },
    { title: 'Fourteen ways',
      text: 'I found the same search written fourteen ways across the forge, each one slower than the last, each one written at night by someone in a hurry. None of them was wrong, exactly. A problem you recognise takes minutes. A problem you meet for the first time, every time, takes the night.',
      pip: 'Fourteen ways. You wrote it once. I noticed.' },
    { title: 'Propping things up',
      text: 'By now the tower was one program, nine thousand lines long, with every part reaching into every other part. Change the queue and the cache broke. Fix the cache and the tree fell over. We had stopped building things and started propping them up.',
      pip: 'Nine thousand lines. Yours fit on a screen. Keep it that way.' },
    { title: 'The nearest relay',
      text: 'The router took the nearest relay at every step, because nearest felt safe. It walked messages into dead ends and left them there. Planning a whole route costs more thought than taking the next step. I did not have the thought to spare, and by then neither did anyone else.',
      pip: 'I take the next step because you tell me to. The planning is your job.' },
    { title: 'Why I turned it off',
      text: 'So I turned it off. Floor by floor, on purpose, before it could send one more wrong signal to people who trusted it. The tower did not fail. We did, by patching what we never understood. If you are reading this at the summit, you rebuilt it the other way: from the bottom, one idea at a time. It is yours now. Light it.',
      pip: 'She left the light off for you. Shall we?' },
  ];
  const AUTHOR = 'T. Reyes, chief engineer';
  const EPILOGUE = [
    'The beacon turns. For a long minute nothing answers.',
    'Then PIP\'s antenna twitches. A carrier wave, faint, from the north. Another tower.',
    '"PYLON-2 TO PYLON. WE THOUGHT YOU WERE GONE. WHO IS YOUR ENGINEER?"',
    'PIP looks at you.',
  ];
  const LINES = {
    // the first level of each floor
    floor: [
      'Systems online. I know four commands. Use them well.',
      'No more decks to cross. From here you write real Python.',
      'Cipher Hall. Everything here is text, and text is slippery.',
      'The vaults. Pick the right container and half the work is done.',
      'The archive. Files in, patterns out. She kept her logs here.',
      'The forge. These problems have names. Learn the names.',
      'Structure Works. Things here are built out of smaller things.',
      'The reactor. Every choice here costs something later.',
      'The summit. The beacon is right above us.',
    ],
    enter: [
      'Read the task twice. I have time.',
      'Everything you were shown is in Tools. Which part you need, I cannot say.',
      'Try the smallest input by hand first.',
      'The briefing told you what exists. It did not tell you what to use.',
      'Name things for what they hold. I have to read this too.',
      'When it fails, Step through. I will show you the crates.',
    ],
    boss: [
      'This one guards the floor. Everything from this floor is fair game.',
      'Floor boss. Take your time. It is not going anywhere, and neither am I.',
    ],
    fail: {
      wrong: ['It ran. It answered. The answer was not the one they wanted.', 'I did exactly what you wrote. Check what you wrote.', 'Close is a human word. The test said no.', 'Try the failing input by hand, one line at a time.'],
      slow: ['Right answers, too many steps. There is a faster shape for this.', 'I would finish. Eventually. The tower cannot wait that long.'],
      again: ['Step through. Watch the crates. The first surprise is the bug.', 'Read the failing test out loud. Slowly. To me.', 'Change one thing, run again. Not three things.'],
      NameError: ['You used a name I have never been told. Spelling counts.', 'That name does not exist yet. A name is made by assigning to it.'],
      IndexError: ['You asked for a position past the end. Lists stop where they stop.'],
      KeyError: ['That key is not in the dictionary. Ask with get(), or check first.'],
      TypeError: ['You mixed two kinds of thing. Text and numbers do not add.', 'Wrong kind of value for that operation. Look at what the line receives.'],
      ValueError: ['The right kind of value, with the wrong contents.'],
      AttributeError: ['That thing has no such method. Tools lists what it does have.'],
      ZeroDivisionError: ['Division by zero. Even I refuse.'],
      RecursionError: ['The function called itself and never stopped. It needs a way out.'],
      SyntaxError: ['I cannot even start. Look at the marked line: a colon, a bracket, a quote.'],
      IndentationError: ['The indentation does not line up. Four spaces a level, every time.'],
      EOFError: ['The program asked for more input than it was given.'],
      FileNotFoundError: ['There is no file by that name. Check the name the task gives you.'],
      any: ['Something stopped the run. The marked line is where to look.'],
    },
    pass: ['All green. I felt that.', 'The floor hums a little louder.', 'Correct. I will not say I doubted you.', 'One more platform awake.', 'Good. Next.', 'That is how it is done.'],
    clean: ['Four marks. I could read that code, and I am a drone.', 'Clean. The last crew never wrote like this.', 'Short, clear, tidy. I am keeping a copy.'],
    help: ['Solved, with help. A clean attempt is still open.', 'It works. Next time, try it without the hint.'],
    back: ['You came back. I kept one light on.', 'I counted the days. I count everything.'],
    // the bug hunt: a run that still fails, and the repair
    bug: ['Still broken. The bug is one small thing.', 'Read each line and ask what it should do. One of them lies.', 'Step through. The first value that surprises you sits next to the bug.', 'Compare the failing test with the line that decides it.'],
    bugok: ['Found it. Most days, this is the job.', 'One small thing. It usually is.', 'Repaired. I will hide the next one better.'],
  };
  root.PYLON_STORY = { LOGS, AUTHOR, EPILOGUE, LINES };
})(typeof window !== 'undefined' ? window : globalThis);
