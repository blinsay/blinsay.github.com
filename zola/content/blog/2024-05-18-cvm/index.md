+++
title = "Implementing CVM For Fun and Fun"
date = 2024-05-28
description = "An educational sketch"
+++

There's been [a new Knuth paper][cvm_note] about a distinct-values sketch floating around my corner of the internet. Despite having not interacted with a sketch professionally in quite a long time, sketches are still [near and dear to my heart][pwl_hll] and this felt like a fun opportunity to implement something new.

For the unfamiliar, probabilistic sketching is cheating at data structures by using statistics. In return for accepting some amount of error, usually a bounded amount, you get to break what feel like fundamental laws of computer science. [Bloom filters][bloom_filter] are probably the most familiar sketch to software engineers, but [HyperLogLog][hll_paper] and CountMinSketch have been showing up more regularly over the last decade.

The sketch in Knuth's note is a sketch that, like HyperLogLog, gives an estimator for the distinct element problem, aka the "how big is my set" problem. This new algorithm is interesting in that it doesn't solve the problem with tighter bounds or while using less space or offer any improvement over HLLs and other state-of-the-art sketches. Instead, it's intended as a teaching tool - it's an algorithm that students can implement and can write coherent proofs about without the [graduate level math skills][mellin] that are required to prove meaningful bounds on other sketches.

[bloom_filter]: https://en.wikipedia.org/wiki/Bloom_filter
[pwl_hll]: https://www.youtube.com/watch?v=y3fTaxA8PkU
[hll_paper]: https://dmtcs.episciences.org/3545/pdf
[mellin]: https://mathworld.wolfram.com/MellinTransform.html

[cvm_note]: https://www-cs-faculty.stanford.edu/~knuth/papers/cvm-note.pdf

---

At an extremely high level, CVM works by keeping a fixed-size set of elements seen. Each (non-distinct) element in the stream is paired with a randomly sampled per-element value that Knuth dubs a volatility as it arrives, and is sampled if it has a lower volatility than any other element sampled so far. To keep the size of the sampled set bounded, CVM evicts the previous element with the highest volatility. Whether or not a new element is sampled, CVM updates a parameter `p`, and at any point in time the size of the sampled set divided by `p` is an unbiased estimator of the number of unique elements in the stream.

This high-level explanation glosses over important details in the algorithm that handle edge cases and correct for sampling bias. An actual implementation is as readable and concise as any pseudocode for the algorithm would be.

```rust
struct Cvm {
    size: usize,
    p: f32,
    buf: Treap,
}

impl Cvm {
    pub fn new(size: usize) -> Self {
        // D1 - p=1, buf is empty
        Self {
            size,
            p: 1.0,
            buf: Treap::new(),
        }
    }

    pub fn insert(&mut self, key: u32) {
        let u: f32 = rand::thread_rng().gen();

        // D4 - if B contains the pair (a, u) delete it
        self.buf.remove(&key);

        // D5 - if u >= p, bail. if there's room in the
        // buffer, either because the buffer is still growing
        // to its max or the same key just got removed,
        // insert the new node.
        if self.p <= u {
            return;
        }

        if self.buf.len() < self.size {
            self.buf.insert(key, u);
            return;
        }

        // D6 - based on the value of u, either swap the new
        // node into the buffer or update the value of p.
        let (key_max, u_max) = self.buf.last().unwrap();
        if u_max < u {
            self.p = u
        } else {
            self.buf.remove(&key_max);
            self.buf.insert(key, u);
        }
    }

    pub fn estimate(&self) -> f32 {
        // at any point, D2 is a valid estimate
        self.buf.len() as f32 / self.p
    }
}
```

The only step in Knuth's algorithm D that it doesn't make sense to represent explicitly in code is Step D3 - sampling the next element from a stream. In practice, you'll be doing that by processing an incoming stream of data from some external source.

---

Knuth's implementation of the algorithm is [available as a literate program][cvm_cweb] alongside his note. If you're [feeling adventurous][texlive], you can turn it into a stripped C file or a [rendered PDF][cvm_rendered].

Knuth's implementation freely mixes the CVM implementation with the guts of a hash-table implementation and with all of the code for building and searching [a treap][treap_wiki]. None of those details really matter for the correctness of the CVM algorithm itself. Almost all of the complexity in Knuth's implementation seems to come from the hash table and treap code, and it obscures how simple CVM is at its core.

I spent a while staring at the treap implementation before deciding to ignore it entirely in my implementation. While the treap is extremely important to the implementation of the algorithm if you'd like it to be fast (and a very cool data structure) it has nothing to do with whether or not the implementation is correct.

Plus, it turns out that it's fairly easy to fake a treap with a sorted array:

```rust
#[derive(Debug)]
struct Treap {
    data: Vec<Node>,
}

#[derive(Debug, Clone, Copy)]
struct Node {
    key: u32,
    vol: f32,
}

impl Treap {
    fn new() -> Self {
        Self { data: Vec::new() }
    }

    fn len(&self) -> usize {
        self.data.len()
    }

   fn insert(&mut self, k: u32, v: f32) {
        self.remove(&k);

        let idx = self.data.partition_point(|e| e.vol < v);
        self.data.insert(idx, Node { key: k, vol: v });
    }

    fn remove(&mut self, k: &u32) {
        let mut i = 0;
        while i < self.data.len() {
            if &self.data[i].key == k {
                self.data.remove(i);
            } else {
                i += 1;
            }
        }
    }

    fn last(&self) -> Option<(u32, f32)> {
        self.data.last().map(|n| (n.key, n.vol))
    }
}
```

It's certainly not the prettiest or fastest thing in the world, but it lets us go test out CVM on some real data.

[texlive]: https://tug.org/texlive/
[cvm_cweb]: https://cs.stanford.edu/~knuth/programs/cvm-estimates.w
[cvm_rendered]: cvm-estimates.pdf
[treap_wiki]: https://en.wikipedia.org/wiki/Treap

---

To test, I ran my implementation against a stream of random numbers generated by the [`rand` crate][rand]'s default RNG and compared against a `HashSet` of the actual values. These tests generated elements until the HashSet hit 1,000,000 unique elements. The full implementation and test harness are available [on GitHub][blinsay/cvm].

After 10 trials at each buffer size, my toy implementation appears to the naked eyeball to be close enough to Knuth's results for `Stream A1` - random data - that I'm happy to call this a working implementation.

![cvm-results](cvm-results.svg)

Eyeballing this is as far as I went with analysis because the bounds that Knuth and the original authors prove are hard to comprehend, let alone to do napkin math about. I wouldn't believe most practicing software engineers if they told me they could intuit how a change in CVM buffer size (Knuth's `s`) changes the error. Compare that to an algorithm like HyperLogLog and its error bound of `1.04/sqrt(m)`.

It really is quite astonishing that this is a good estimator. Given how simple the code is, and Knuth's ringing endorsement, I wouldn't be the least bit surprised if it makes it into more than a few CS textbooks.

[rand]: https://crates.io/crates/rand

[blinsay/cvm]: https://github.com/blinsay/cvm

---

What Knuth calls CVM is an algorithm proposed by [Sourav Chakraborty, N. V. Vinodchandran, and Kuldeep S. Meel][cvm_arxiv] in a paper that explicitly targets teaching probability theory. The original paper doesn't focus on implementation and data structures; it's entirely focused on the math, with no ink spilled on how a practitioner might implement these algorithms - the algorithm that becomes Knuth's CVM/Algorithm D depends on an infinitely growing string of bits.

The original paper makes no concession to the practicing programmer, preferring to focus entirely on building up to the final algorithm in a series of proofs. Knuth's note turns that structure on its head and starts with the final algorithm, some empirical results, and only then introduces simpler versions of the algorithm to make the proofs approachable.

In both papers, the math is still quite dense and only ends up proving fairly loose error bounds on the final algorithm. CVM seems to perform quite well in practice, and Knuth believes tighter bounds are possible. Ironically, the math has so far proven too difficult, even for Knuth. Watch out, undergraduates.

> To conclude this study, I had hoped to use Theorem D to sharpen the results of Corollary T, because the actual performance of Algorithm D in practice is noticeably better than the comparatively weak theoretical guarantees that are derivable from the coarser Algorithm D. Algorithm D is quite simple, so I believed that I’d be able to analyze its behavior without great difficulty. Alas, after several weeks of trying, I must confess that I’ve failed to get much further. Indeed, I think Algorithm D may well be the simplest algorithm that lies beyond my current ability to carry out a sharp analysis!

[cvm_arxiv]: https://arxiv.org/abs/2301.10191
