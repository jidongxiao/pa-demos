# IonCode correctness experiment: final results

*2026-10-21. The full technical report, `IONCODE_EXPERIMENT_REPORT.md`, accompanies this summary; its §14.1 summarises the methodological audit. Every number is generated from the result files and checked automatically.*

**What was done.**
- **Problems:** 285 distinct LeetCode problems: phase 2's 96 plus 189 new ones, a stratified random sample over 12 categories × difficulty with a fixed seed.
- **Platforms:** C, C++, Java and Python, natively and in IonCode (`pa` @ `feaac835`, headless Chromium 130).
- **Programs and tests:** each of the 996 programs with a published, unedited, natively chosen solution was submitted to IonCode, on LeetCodeDataset's tests checked against each problem's constraints.
  - 983 ran;
  - 12 hit a missing library feature;
  - 1 did not compile for another reason.

**Result.** A core discrepancy is a valid test that the native program passes and IonCode fails. The official numbers use the 282 problems whose constraints were all checked (the formal subset); there, 972 programs are judged.
- **Programs:** 6 of 972 programs = **0.62%** (95% CI [0.23%, 1.34%]).
- **Tests:** 181 of 77,223 = **0.234%** (95% CI [0.018%, 0.544%], resampling programs).
- **By kind:** 113 wrong output, 67 compile failure, 1 timeout, 0 runtime failure.

**Most important new finding: an IonCode defect in Java's `BigInteger` (F18).**
- **What fails.** 564 Find the Closest Palindrome is a published Java solution, accepted on LeetCode and correct on OpenJDK. In IonCode it gives 21 wrong answers, with no error.
- **Why.** In IonCode two equal `BigInteger`s (one parsed, one computed) can have different `hashCode()`s, so `HashSet.remove` misses the input.
  - **Minimal program:** 5 of 8 values affected in IonCode, 0 on OpenJDK.
  - **Patch:** with only `HashSet` → `TreeSet`, 80 / 80 tests pass.
- **Where.** It is located in TeaVM's `BigInteger` class (`TBigInteger`), which IonCode ships: `hashCode()` includes unused words of its internal array that `equals()` ignores. The shipped class, run on OpenJDK, reproduces 16 of 16 hash codes IonCode printed.
- **Not known.** The TeaVM release IonCode bundles is unknown; TeaVM's current source has the same code.
- **Different in kind from the five C++ cases below.** Those solutions are non-portable C++. Here the Java program is correct and IonCode breaks the Java specification.

**Coverage and result by language** (formal subset; a missing solution is neither a pass nor a failure)

| Language | Judged programs | Valid tests judged | Missing solution | Unsupported API | Core discrepancies (tests) | Test-level rate | Programs with a discrepancy / judged |
|---|---|---|---|---|---|---|---|
| C | 138 | 10,924 | 144 | 0 | 0 | 0.000% | 0 / 138 |
| C++ | 280 | 22,304 | 0 | 2 | 160 | 0.717% | 5 / 280 |
| Java | 273 | 21,699 | 0 | 9 | 21 | 0.097% | 1 / 273 |
| Python | 281 | 22,296 | 0 | 1 | 0 | 0.000% | 0 / 281 |
| **All** | **972** | **77,223** | **144** | **12** | **181** | **0.234%** | **6 / 972** |

**The six programs.** Each cause was verified by patching one construct, after which IonCode passes every valid test.

| Program | Failing tests | Verified cause |
|---|---|---|
| 233 Number of Digit One, C++ | 67 | `std::max(int64_t, 0l)` does not compile with wasm32's 32-bit `long` |
| 1509 Minimum Difference … in Three Moves, C++ | 79 | `1L << 60` with a 32-bit `long` gives 0 |
| 264 Ugly Number II, C++ | 12 | products overflow a 32-bit `long` |
| 397 Integer Replacement, C++ | 1 | `long` overflow, endless loop (timeout) |
| 1191 K-Concatenation Maximum Sum, C++ | 1 | sum overflows a 32-bit `long` |
| 564 Find the Closest Palindrome, Java | 21 | **IonCode defect** (F18, above) |

The five C++ programs assume a 64-bit `long`. LeetCode's Linux provides one, but C++ does not guarantee it, so IonCode's compiler is right.

**New compared with the 96-problem phase 2** (phase 2: 13 of 30,967 tests, 0.042%; 2 programs):
- **Replication.** The 96 problems reproduce exactly.
- **New in phase 3:**
  - the first IonCode defect (F18);
  - three more `long` cases, one of them a compile failure;
  - a compatibility gap: IonCode's Java compiler lacks the name `Map.Entry`.
- **Not directly comparable.** Phase 3 does not require C solutions and checks constraints completely (report §10.8).

**Stress testing** (separate experiment; never added to the rates). 54 valid inputs at the constraint limits gave 10 IonCode-only failures:
- **Call depth.** Accepted recursive solutions crash at 3,215–7,963 calls in C/C++ and at 6,374 in Java. The benchmark's small inputs never reach this runtime limit.
- **`labs()` truncation**, the same `long` class.
- **Output cap.** It cuts C, C++ and Java output, but not Python's.

**Audit.** An independent audit found:
- the samples re-draw identically from their seeds;
- nothing was changed after IonCode results were seen;
- every pass is a real IonCode output;
- every failing test reproduces.

It corrected a constraint-checker defect (590 more judged tests, no new discrepancy) and intervals that ignored the clustering of tests within programs.

**Limitations.**
- **Configuration:** one browser, `-O1`, one IonCode commit.
- **Tests:** small, LLM-generated inputs; expected outputs not independently verified.
- **Solutions:** one per problem and language, mostly from one repository.
- **C coverage:** only the 141 older problems that have a C solution.
- **Precision:** six discrepant programs, so the intervals are wide.

Compatibility gaps (12 programs, e.g. Java `Integer.sum`) are reported separately (report §13).

