# CUET (UG) Cut-offs — University of Delhi CSAS 2025

Counterpart to the `jeeadvanced/`, `tnea/`, `nda/`, `wbjee/` etc. datasets, holding the
**CUET (UG) cut-offs** for the largest CUET university, the **University of Delhi**.

## Why University of Delhi?
The NTA does **not** publish any CUET cut-offs — CUET only produces a score; cut-offs are set
by each participating university. Delhi University (admitting the most students through CUET)
publishes the most comprehensive official cut-offs through its **Common Seat Allocation System
(CSAS)**: round-wise **"Minimum Allocation Score"** lists — the lowest CUET (UG) score on which
a seat was allocated for every *college × programme × category*. These are the CUET cut-offs in
practice. (Other universities — BHU, JNU, Jamia … — can be added as further sheets later.)

## Source — official DU CSAS (admission.uod.ac.in, UG Admissions 2025-26)
| File (in `source/`) | Round | Layout |
|---------------------|-------|--------|
| `DU_CSAS_UG_2025_Round1_CutOff.pdf` | First round of allocation | wide (all six categories) |
| `DU_CSAS_UG_2025_Round3_CutOff.pdf` | Third round of allocation | wide (blank where no allocation in that round) |
| `DU_CSAS_UG_2025_SpotRound_CutOff.pdf` | Spot round | tidy (one category per row) |

Scores are out of **1000** (CUET-UG normalized total). Categories: **UR, OBC, SC, ST, EWS, PwBD**.

## Files
| File | Contents |
|------|----------|
| `DU_CSAS_UG_2025_CUET_CutOffs.xlsx` | the dataset — three sheets (below) |
| `build_xlsx.py` | parses the source PDFs by word position and rebuilds the workbook |

### Sheet `Round 1` — 1,528 rows (wide)
`College, Programme, UR cut-off, OBC cut-off, SC cut-off, ST cut-off, EWS cut-off, PwBD cut-off`.
One row per college × programme; the six columns are the minimum allocation score per category.
A blank cell means no seat was allocated in that category in this round. (1,528 combinations
matches the official DU release.)

### Sheet `Round 3` — 1,528 rows (wide)
Same shape and same college × programme universe as Round 1. Far more blanks, because by the
third round most categories are already filled — a value appears only where a fresh allocation
was made at that score.

### Sheet `Spot Round` — 2,543 rows (tidy / long)
`College, Programme, Category, Cut-off Score`. The spot round PDF is published one category per
row, so this sheet keeps that tidy form.

## Accuracy
Values are read **directly** from the official PDFs by word x-position (not retyped), so running
`python3 build_xlsx.py` reproduces them exactly. Spot-checked against the source, e.g. Hindu
College B.A. (Hons.) Political Science Round 1 UR = 950.5822579 (the highest 2025 cut-off).
Requires `pdfplumber` and `openpyxl`.
