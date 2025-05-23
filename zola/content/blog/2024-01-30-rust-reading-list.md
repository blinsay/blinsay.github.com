+++
title = "Rust reading list"
date = 2024-01-30
updated = 2025-04-28
description = "A Rust reading list."
+++

Rust has a reputation as a hard programming language to learn, despite [evidence
to the contrary][evidence]. My experience coming to Rust was deeply pleasant,
and hopefully the things on your reading list make your experience just as
pleasant. If you are someone who understands the difference between a move- and
copy-constructors and have used `unique_ptr` and `shared_ptr` in anger, you're
starting your Rust journey ahead of everyone else. However, you still have
things to (un)learn. The compiler will tell you that patterns from your past
life are wrong and you're going to have to live with it. Find new ways to do
things, instead of brute-forcing your way through with `unsafe`.

[evidence]: https://opensource.googleblog.com/2023/06/rust-fact-vs-fiction-5-insights-from-googles-rust-journey-2022.html

* [**The Rust Programming Language**](https://doc.rust-lang.org/book/): The
Book. This is a great place to start, even if you're a C++ veteran. It does an
excellent job covering the breadth of the language and introduces you to `cargo`
and the [crates.io](https://crates.io) ecosystem.

* [**Learn Rust With Entirely Too Many Linked Lists**](https://rust-unofficial.github.io/too-many-lists/):
A tour through everyone's favorite data structure, by one of the authors of
Rust's standard library collections. Starts off basic and veers into advanced
territory quite quickly. It's worth reading while you're new to the language,
and worth coming back to as you get more comfortable.

---

Once you're through the basics, here are some good resources that have shaped
how I think about building in Rust. A lot of the advice here is about how to
lean on the type system and borrow checker, but some of it is just community
standards.

* [**The Typestate Pattern in Rust**](https://cliffle.com/blog/rust-typestate/):
A very high-quality, straightforward demonstration of how to use the type
system to help you design an API.

* [**Rust Error Handling**](https://blog.burntsushi.net/rust-error-handling):
A long read on error handling from Andrew Gallant, the author of `ripgrep`
and the `regex` crate. This post walks through idiomatic error handling
and motivates the `?` operator. Error API design is one of the most subtle,
difficult parts of Rust to get right. Andrew's blog in general is excellent
(I like his [bstr] and [csv] posts too).

[bstr]: https://blog.burntsushi.net/bstr/
[csv]: https://blog.burntsushi.net/csv/

* [**Designing error types in Rust**](https://mmapped.blog/posts/12-rust-error-handling.html):
This post builds on Andrew Gallant's post on errors with a focus on what you
want to represent in an error API. This post is also where you'll really start
noticing that Rust is secretly an ML-style language. Lean into the functional
programming, and follow the links to [**Parse, Don't Validate**][pdv].

[pdv]: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate


* [**Writing APIs in Rust**](https://sled.rs/apis.html): A value statement by
the sled.rs author that I happen to strongly agree with. Short, direct, and to
the point.

* [**Rust API Guidelines**](https://rust-lang.github.io/api-guidelines/about.html): 
Straight from the Rust Library team, guidelines on how to write APIs. I treat
this as less of a learning tool and more of a resource, but it's good to know
that it's here.

---

Async Rust is a lot. It can feel like it's own sub-language and a completely separate ecosystem. There's a lot to learn here. If you can, try to have a solid grasp on the fundamentals of Rust and the posts above before diving into async.

* [**Asynchronous Programming in Rust**](https://rust-lang.github.io/async-book/):
The async version of The Book. This is still incomplete, but a good place to
start. You'll get a basic tour of what Rust Futures are and learn what the hell
is going on with `await` and `Pin`. After reading this book, [read the module
documentation for `std::pin`][pin]. You will return to it many, many times.

[pin]: https://doc.rust-lang.org/std/pin/index.html

* [**How to think about async/await in Rust**](https://cliffle.com/blog/async-inversion/):
A higher-level explanation of what async is and what it allows you to do at
a high level. Since most of the async documentation is how-to, this is a nice
change of pace.

* [**Async From Scratch**](https://natkr.com/2025-04-10-async-from-scratch-1/):
A socratic exploration of how the async sausage is made. It's a fairly
gentle write-your-own-Future tutorial that really takes the time to
walk you through what the heck is going on and what a Waker is and
all that nonsense. If you like to understand the guts of things, try
this one.
