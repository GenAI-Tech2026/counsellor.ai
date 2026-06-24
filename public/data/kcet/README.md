# KCET 2024 — Engineering Cut-Off Ranks (Karnataka)

Counterpart to the `mhtcet/`, `apeamcet/`, `tgeamcet/`, `jeeadvanced/` cutoff datasets, for
Karnataka's KCET (CET) engineering admissions run by the **Karnataka Examinations Authority (KEA)**.

## Source — official KEA portal
Downloaded directly from the official KEA UGCET-2024 cutoff portal:
`https://cetonline.karnataka.gov.in/keawebentry456/ugcet2024/`

| Local file (`source/`) | Official file | Round | Region |
|------|------|------|------|
| `ENGG_CUTOFF_2024_GEN_MOCK.pdf` | `ENGG_CUTOFF_2024_GENkannada.pdf`   | Mock allotment | General (state-wide) |
| `ENGG_CUTOFF_2024_GEN_R1.pdf`   | `ENGG_CUTOFF_2024_GEN_R1kannada.pdf`| Round 1        | General (state-wide) |
| `ENGG_CUTOFF_2024_GEN_R2.pdf`   | `ENGG_CUTOFF_2024_GEN_R2_FIN.pdf`   | Round 2 (final)| General (state-wide) |
| `ENGG_CUTOFF_2024_HK_MOCK.pdf`  | `ENGG_CUTOFF_2024_HKkannada.pdf`    | Mock allotment | Hyderabad-Karnataka (371J) |
| `ENGG_CUTOFF_2024_HK_R1.pdf`    | `ENGG_CUTOFF_2024_HK_R1kannada.pdf` | Round 1        | Hyderabad-Karnataka (371J) |
| `ENGG_CUTOFF_2024_HK_R2.pdf`    | `ENGG_CUTOFF_2024_HK_R2_FIN.pdf`    | Round 2 (final)| Hyderabad-Karnataka (371J) |

The original official PDFs are kept in `source/`. **Hyderabad-Karnataka** (now Kalyana-Karnataka)
is the separate Article 371(J) local-reservation cutoff list; **General** is the state-wide list.

## Files
| File | Round / Region | Rows | Colleges |
|------|----------------|------|----------|
| `KCET_2024_ENGG_GEN_Mock_CutOff.xlsx`   | Mock · General | 18,524 | 247 |
| `KCET_2024_ENGG_GEN_Round1_CutOff.xlsx` | Round 1 · General | 18,583 | 248 |
| `KCET_2024_ENGG_GEN_Round2_CutOff.xlsx` | Round 2 · General | 16,590 | 244 |
| `KCET_2024_ENGG_HK_Mock_CutOff.xlsx`    | Mock · Hyd-Kar | 5,069 | 231 |
| `KCET_2024_ENGG_HK_Round1_CutOff.xlsx`  | Round 1 · Hyd-Kar | 5,104 | 232 |
| `KCET_2024_ENGG_HK_Round2_CutOff.xlsx`  | Round 2 · Hyd-Kar | 4,214 | 226 |
| `KCET_2024_ENGG_AllRounds_CutOff.xlsx`  | all of the above (one sheet each) | 68,084 | — |

(Row counts fall across rounds because fewer category cells stay filled as seats settle.)

## Format (tidy / long)
One row per **College × Branch × Category**, with columns:
`College Code, College Name, Place, Branch Code, Branch Name, Category, Closing Rank`.

- **Closing Rank** is the last (cut-off) KCET rank allotted to that college-branch-category in
  that round. A category with no allotment (`--` in the source) is simply omitted — no blank-cell
  guesswork.
- A long/tidy layout is used (instead of one column per category) so that each college-branch
  lists only the categories it actually filled — mirroring the source exactly.

### Category codes (Karnataka scheme)
Each base category is split by two horizontal-reservation suffixes: **K** = Kannada-medium,
**R** = Rural; the plain (`G`) form is the general pool.

- **GM** = General Merit, **SC**, **ST**, **1** = Category-1, and the OBC blocks **2A 2B 3A 3B**.
- So `GM / GMK / GMR`, `1G / 1K / 1R`, `2AG / 2AK / 2AR`, … `STG / STK / STR` — 24 columns.
- In the Hyderabad-Karnataka files every code carries a trailing **H** (`GMH, 1H, 2AH, GMKH …`),
  denoting the 371(J) local-area seats. The Category column keeps the codes verbatim from each
  source PDF.

## Accuracy
Parsed positionally from the official PDFs with `pdfplumber`: ranks in the source collide in the
text layer (e.g. `106707106094`), so every digit is binned to its category column by x-coordinate
(columns are 36 pt apart, ranks centre-aligned). Validated cell-for-cell against the source,
including the worst six-number merges; **0 malformed ranks** across all 68,084 rows.

The parser/builder used are kept here for reproducibility: `parse_kcet.py`, `build_xlsx.py`
(re-run `python3 build_xlsx.py` from this directory).
