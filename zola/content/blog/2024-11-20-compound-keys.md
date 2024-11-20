+++
title = "Map Keys and Lifetimes"
date = 2024-11-24
description = "Having a Cow, man"
+++

I ran into a weird complexity cliff with Rust's `HashMap` and lifetimes
the other day. It's enough of a head scratcher that I thought I'd write it
up and see if anyone on the broader internet knew what was going on.

The rest of this post assumes you're comfortable enough with Rust to
see some moderately complicated lifetimes and understand what's going on.
You don't need a perfect mental model of the borrow checker.

---

`HashMap` and `BTreeMap` are pretty darn good and I use them a lot. Suppose
you're me and you're [making some HTTP requests](https://junctionlabs.io) and
you want to track some request stats by host and port. It's pretty easy and
boring to do that with a `HashMap`.

```rust
use std::collections::HashMap;

fn main() {
    let bender = Host { hostname: "bender".to_string(), port: 666 };

    let mut host_stats = HashMap::new();
    host_stats.insert(
        bender.clone(),
        Stats { sent: 30, errors: 30 },
    );
    assert_eq!(
        host_stats.get(&bender),
        Some(&Stats { sent: 30, errors: 30}),
    );
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct Host {
    hostname: String,
    port: u16,
}

#[derive(Debug, PartialEq)]
struct Stats {
    sent: usize,
    errors: usize,
}
```

Now suppose you're me and you're trying to wrap stats up with some other state
or just want to hide it behind a reasonable interface because we live in a
society. I'm not trying to write `HashMap<(String, u16), Stats>` everywhere,
and I also don't want people to have to see `Host` to use this code.


```rust
struct HostStats {
    stats: HashMap<Host, Stats>,
}

impl HostStats {
    fn get(&self, hostname: &str, port: u16) -> Option<&Stats> {
        self.stats.get(&Host{
            hostname: hostname.to_string(),
            port,
        })
    }

    fn record(&mut self, hostname: String, port: u16, sent: usize, errors: usize) {
        let host = Host {
            hostname,
            port,
        };
        self.stats.insert(host, Stats { sent, errors });
    }
}
```

Now, suppose you're me and you're suddenly annoyed that we can't look up host
with just a reference in `get` - we have to copy the entire string (`hostname.to_string()`)
to build an owned `Host` and then immediately take a reference to it to look
up a key.

My first thought here was to define a key-reference type that can be compared
to `Host` but doesn't own a hostname. `HashMap` had other ideas. Take a look at
the [signature of `get`](https://doc.rust-lang.org/std/collections/hash_map/struct.HashMap.html#method.get);
it allows you to do a lookup with any key type `Q` that can be borrowed as if
it was a `K`.

```rust
pub fn get<Q>(&self, key: &Q) -> Option<&V>
where
    K: Borrow<Q> + Ord,
    Q: Hash + Eq + ?Sized;
```

If you try to do what I tried first, you end up being unable to write a useful
implementation of `Borrow`. There's no way to return a `&HostRef` here without
referencing a temporary value AND there is no way to express the appropriate
lifetime constraint without conflicting with the signature of the `Borrow`
trait.

```rust
struct HostRef<'a> {
    hostname: &'a str,
    port: u16,
}


impl std::borrow::Borrow<HostRef> for Host {
    fn borrow(&self) -> &HostRef {
        todo!("good luck")
    }
}
```

The fundamental problem with that approach is trying to express that `hostname`
can either be borrowed or owned, and it shouldn't make a difference. If only
[there was a way to express that](https://doc.rust-lang.org/std/borrow/enum.Cow.html).

---

Having a `Cow` *almost* works, man.

When inserting and get a key, things compile. We can use `Cow<'static, str>`
to express that we're only going to keep owned keys in the HashMap and keep
explicit lifetime annotations from becoming viral.

Howerever, there are some lifetime shenanigans necessary in the signature of
`get` - we seem to have have to tell the borrow checker that the borrowed
hostname will live at least as long as `&self` and the output value.
Intuitively that restriction doesn't make much sense to me - [get in touch] if it
makes sense to you.

```rust
use std::borrow::Cow;
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct Host<'a> {
    hostname: Cow<'a, str>,
    port: u16,
}

#[derive(Debug, PartialEq)]
struct Stats {
    sent: usize,
    errors: usize,
}

struct HostStats {
    stats: HashMap<Host<'static>, Stats>,
}

impl HostStats {
    fn get<'a, 'b: 'a>(&'a self, hostname: &'b str, port: u16) -> Option<&'a Stats> {
        let host = Host {
            hostname: Cow::from(hostname),
            port,
        };

        self.stats.get(&host)
    }

    fn record(&mut self, hostname: String, port: u16, sent: usize, errors: usize) {
        let host = Host {
            hostname: Cow::from(hostname),
            port,
        };

        self.stats.insert(host, Stats { sent, errors });
    }
}
```

When writing the code that inspired this post, I ended up needing something like
`try_record` - update stats if they were present, but do nothing if that host
was absent.

That extra level of complexity seems to confuse the borrow checker badly enough
that the code doesn't compile any more. I'm not sure exactly why, but trying to
define that method makes rustc so mad that it gives you `error[E0521]: borrowed data escapes outside of method`.

```rust
impl HostStats {
    fn try_record(&mut self, hostname: &str, port: u16, sent: usize, errors: usize) {
        let host = Host {
            hostname: Cow::from(hostname),
            port,
        };

        if let Some(stats) = self.stats.get_mut(&host) {
            stats.sent = sent;
            stats.errors = errors;
        }
    }
}
```

If you understand this one, **please** [get in touch]. I'm extremely curious! The
code is [on the playground](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&gist=61597cab54b5fbb373b44ba2cde6c6ee)
if you'd like to mess with it yourself.

[get in touch]: https://bsky.app/profile/blen.blinsay.com

---

I ended up working through this problem by working around it; the compound key
lookup didn't end up being important to my problem. If it had been, I would
have taken the excellent suggestion to use the [hashbrown](https://docs.rs/hashbrown/0.15.1/hashbrown/index.html)
crate directly.

`hashbrown` gives you two ways out of this - `get` is defined in terms of an
`Equivalent` trait instead of `Borrow` and, if you really need it, the
[raw entry API](https://docs.rs/hashbrown/0.15.1/hashbrown/struct.HashMap.html#method.raw_entry_mut)
is right there.
