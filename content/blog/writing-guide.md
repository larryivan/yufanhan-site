---
title: "Writing guide"
description: "Every Markdown feature this site supports, on one page. A draft: npm run dev shows it, production builds leave it out."
date: 2026-09-25
draft: false
---

This page is a draft, so it only exists in `npm run dev`, at `/blog/writing-guide`. Copy from it when writing a note.

## Formulas

Inline math goes between single dollars: the effective population size $\Ne$, or $\log_{10} \Ne$ over time. Display math goes between double dollars on their own lines:

$$
\hat{\theta}_W = \frac{S}{a_n}, \qquad a_n = \sum_{i=1}^{n-1} \frac{1}{i}
$$

Environments such as `aligned` work, and `\tag{}` numbers an equation:

$$
\begin{aligned}
\E[T_{\mathrm{MRCA}}] &= \sum_{k=2}^{n} \frac{4\Ne}{k(k-1)} \\
&= 4\Ne\left(1 - \frac{1}{n}\right)
\end{aligned}
\tag{1}
$$

Roots and wide accents are drawn too: $\sqrt{\Var(X)}$, $\widehat{\Ne}(t)$, $\overrightarrow{AB}$. A dollar sign that is not math needs a backslash: \$5 per sample.

Shorthands defined for every page: `\Ne` → $\Ne$, `\E` → $\E$, `\Var` → $\Var$, `\Cov` → $\Cov$, `\argmin` → $\argmin$, `\argmax` → $\argmax$.

## Code

A language after the fence colours the block. A file name goes in brackets, and lines to highlight in braces:

```python [simulate.py] {4-5}
import msprime

ts = msprime.sim_ancestry(
    samples=10,
    population_size=10_000,
    sequence_length=1e6,
    recombination_rate=1e-8,
    random_seed=1,
)
print(ts.num_trees)
```

```rust [src/lib.rs]
/// Expected time to the most recent common ancestor, in generations.
pub fn expected_tmrca(n: u32, ne: f64) -> f64 {
    4.0 * ne * (1.0 - 1.0 / n as f64)
}
```

```bash
cargo build --release
./target/release/psmc-rs --help
```

Supported: Python, Rust, R, C/C++, JavaScript/TypeScript, JSON, TOML, YAML, SQL, shell, Nextflow, Groovy, Dockerfile, Makefile, diff, LaTeX, HTML, CSS and Vue. Inline code uses single backticks: `sim_ancestry`.

## Callouts

The same syntax as GitHub and Obsidian:

> [!NOTE]
> Useful context a skimming reader should still see.

> [!TIP]
> A shortcut or a better way to do something.

> [!IMPORTANT]
> Something the reader must know to get it right.

> [!WARNING]
> A pitfall that needs attention now.

> [!CAUTION] Custom title
> Text after the marker replaces the default title.

## Figures

An image with a title in quotes becomes a figure, and the title its caption:

![Agarose gel with three sample lanes beside a DNA ladder labelled 100 to 2000 bp](/images/hap3.webp "PCR products on an agarose gel; the rightmost lane is the ladder."){width="1150" height="1320"}

For a caption with formatting or math, use the figure block:

::figure{src="/images/post-inline.svg" alt="Sample card that reads Inline image in Markdown" width="900" height="480"}
A caption with **emphasis**, a [link](/blog), and math: $\Ne$ over the last $10^5$ generations.
::

An image without a title stays a plain image.

## Footnotes

A claim that needs a source gets a footnote.[^msprime] Footnotes are numbered in order and collected at the end of the note.[^long]

[^msprime]: Baumdicker et al. (2022), *Efficient ancestry and mutation simulation with msprime 1.0*, Genetics 220(3).
[^long]: A footnote can hold more than a line: `code`, links and $\Ne$ all work here.

## Tables

| Sample | Reads | Mapped | Depth ($\times$) |
| :--- | ---: | ---: | ---: |
| S01 | 1,204,331 | 97.2% | 12.4 |
| S02 | 986,120 | 95.8% | 9.1 |
| S03 | 2,310,044 | 98.1% | 21.7 |

The numbers above are placeholders. Colons in the divider row set the alignment.

Numbers line up by digit, and a wide table scrolls sideways on a phone.

## Lists and details

- [x] Simulate the training set
- [x] Train the estimator
- [ ] Write it up

<details>
<summary>A collapsible section</summary>

Long derivations, raw output or anything most readers can skip.

</details>

Keyboard keys: <kbd>Ctrl</kbd> + <kbd>K</kbd> opens search.
