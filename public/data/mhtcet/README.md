# MHT-CET 2024 — Engineering CAP Cut-Offs (Maharashtra)

Counterpart to the `tgeamcet/`, `apeamcet/`, `jeeadvanced/` cutoff datasets, for Maharashtra's
MHT-CET engineering admissions (DTE / State CET Cell Centralized Admission Process).

## Source — official State CET Cell
Downloaded directly from the official First-Year Engineering admissions portal:
`https://fe2025.mahacet.org/2024/2024ENGG_CAP{1,2,3}_CutOff.pdf`
("Cut Off List for Maharashtra & Minority Seats of CAP Round I/II/III, Admission to First Year of
Four Year Degree Courses in Engineering and Technology, 2024-25"). Original PDFs are included.

## Files
| File | Round | Rows | Colleges |
|------|-------|------|----------|
| `MHTCET_2024_ENGG_CAP1_CutOff.xlsx` | CAP Round I  | 31,406 | 349 |
| `MHTCET_2024_ENGG_CAP2_CutOff.xlsx` | CAP Round II | 23,003 | 352 |
| `MHTCET_2024_ENGG_CAP3_CutOff.xlsx` | CAP Round III| 13,823 | 354 |
| `MHTCET_2024_ENGG_AllRounds_CutOff.xlsx` | all rounds (one sheet/round) | 68,232 | — |
| `MHTCET 2024 ENGG CAP{1,2,3} CutOff (source).pdf` | original official PDFs | — | — |

(Row counts fall across rounds because fewer seats/category cells are filled in later rounds.)

## Format (tidy / long)
One row per **College × Branch × Seat Type × Stage × Category**, with columns:
`College Code, College Name, Branch Code, Branch Name, Status, Seat Type, Stage, Category,
Closing Rank (CET Merit No.), Percentile`.

- **Closing Rank** is the Maharashtra State General Merit No.; **Percentile** is the MHT-CET score
  percentile (the figure shown in brackets in the source).
- **Seat Type** = the allotment pool: `State Level`, `Home University Seats …`, `Other Than Home
  University Seats …`, `Minority`, etc.
- **Category** codes follow the official legend: starting letter **G**=General, **L**=Ladies;
  ending letter **H**=Home University, **O**=Other than Home University, **S**=State Level; plus
  PWD (Persons with Disability), DEF (Defence), TFWS, EWS, ORPHAN, MI (Minority).
- **Stage** (I/II/III…) is the allotment stage within the round.

A long/tidy layout is used (instead of one column per category) because each college-branch lists a
different subset of categories — exactly mirroring the source, with no blank-cell guesswork.

## Accuracy
Parsed by column position from the official PDFs and validated cell-for-cell against the source
(category ↔ rank ↔ percentile). Unparsed stage-rows: 14 / 19 / 26 across the three rounds
(<0.1%, isolated malformed blocks in the source).
