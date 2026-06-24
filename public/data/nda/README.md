# NDA & NA Examination — Cut-off Marks (2020–2024)

Counterpart to the `jeeadvanced/`, `mhtcet/`, `kcet/` etc. cutoff datasets, for the UPSC
**National Defence Academy & Naval Academy (NDA & NA) Examination**. Covers the last five
years — both sessions per year (NDA & NA I and II), 2020 through 2024.

## Source — official UPSC
Downloaded directly from the UPSC cut-off marks page
(`https://upsc.gov.in/examinations/cutoff-marks--`). Each exam's official
"Recommendation Details and Cut-off Marks" PDF is included under `source/`.

| File (in `source/`) | Exam |
|---------------------|------|
| `NDA_NA_I_2020_CutOff.pdf` … `NDA_NA_II_2024_CutOff.pdf` | the 10 official cut-off PDFs (NDA & NA I / II, 2020–2024) |

## Files
| File | Contents |
|------|----------|
| `NDA_NA_CutOffs_2020_2024.xlsx` | the dataset — two sheets (below) |
| `build_xlsx.py` | regenerates the workbook from the transcribed source values |

### Sheet `Cut-offs` — one row per examination (10 rows)
`Year, Session, Examination, Written Cut-off (out of 900), Min % per Subject (written),
Final Cut-off (out of 1800), Total Vacancies, Candidates Recommended`.

- **Written Cut-off** is the minimum qualifying aggregate at the written stage (out of 900).
- **Min % per Subject** is the additional written-stage rule (a candidate must score at least
  this % in *each* subject) — 25% in most years, 20% in 2022-II, 2023-II and 2024-I.
- **Final Cut-off** is the marks of the *last recommended candidate* in the merit order after
  the SSB interview (final stage, out of 1800).
- The written and final cut-offs are **exam-wide single values** (not per-wing). Vacancies and
  recommended counts are exam totals; the 2020-II PDF uses an older format that omits them.

### Sheet `Vacancies by Wing` — tidy / long (50 rows)
`Year, Session, Wing, Sub-Wing, Vacancies, Female Vacancies, Notes`.

- **Wing** ∈ `Army, Navy, Air Force, Naval Academy`.
- **Sub-Wing** — the source subdivides the **Air Force** into `Flying` (92),
  `Ground Duties (Tech)` (18) and `Ground Duties (Non-Tech)` (10), so each is its own row
  (sub-wings sum to the Air Force total of 120). It is blank for wings the source does not split.
  In 2020-I and 2021-I the Air Force is given only as a single total of 120 (Notes records the
  "incl. 28 ground duties" qualifier), so it stays one row for those two exams.
- **Female Vacancies** = seats reserved for female candidates; the source first splits these out
  in 2021-II, so 2020-I and 2021-I are left blank. `0` means the wing was open to male candidates
  only that year.
- **Notes** carries source qualifiers (e.g. `male candidates only`, `10+2 Cadet Entry Scheme`).
- Per exam, the vacancies across all rows reconcile exactly with `Total Vacancies` on the
  `Cut-offs` sheet. The 2020-II PDF gives no wing breakdown (older format), so it has no rows here.

## Accuracy
Values transcribed by column position from the official UPSC PDFs and validated against them.
Run `python3 build_xlsx.py` to rebuild the workbook.
