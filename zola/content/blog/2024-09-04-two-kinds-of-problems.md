+++
title = "Two Kinds of Problems"
date = 2024-09-04
description = "Gross Problem, Beautiful Answer"
+++

I tend to think about hard problems as being in one of two broad categories:
easy to ask and difficult to answer, or difficult to ask and easy to answer. Not
all problems fall onto this spectrum, but I think it's a useful framework for
orienting yourself when confronting something new.

---

The first category is iceberg shaped: easy to ask questions with deep,
complicated, and disgusting answers lurking below the surface. Sometimes the
answer requires knowledge from a totally adjacent field or simply just brute
forcing your way through.

Databases and storage softare are a perfect example. You start by asking the
computer to read back exactly the bytes you wrote (how hard could it be) and
before you know it you're learning about SSD wear patterns, you have opinions
about Paxos papers, and you are probably doing something awful to make sure that
you are actually calling fsync when you think you are calling fsync. Maybe you
even waded into the whole `mmap` debate, who knows.

---

The second category is the inversion of this pyramid. Asking the question
suddenly asks more questions, until you're not sure what you were even asking
for in the first place. But, once you finally figure out precisely the right
framing of the question, the answer turns out to fall right into place.

Networking and orchestration problems tend to fall into this category, with
service discovery being an excellent example. The answer is going to be "pick
an IP address out of a list" or "set up a DNS A record", but before you can
figure out how to look up at that address, you have to sit down and decide what
addresses are even going to be in that list. Do you only include healthy hosts,
and if so where do you measure health from? How do you define healthy? Should
you tailor the list to each caller based on where they are? You "just" wanted
to populate your DNS server, and now you're on the hook for defining failure
domains for your entire organization. Oops.

