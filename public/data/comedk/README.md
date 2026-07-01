# COMEDK UGET — Engineering Cut-off Ranks (Karnataka private colleges, 2023 & 2024)

Counterpart to the `kcet/`, `wbjee/`, `keam/`, `bitsat/`, `cuet/` cutoff datasets, for **COMEDK
UGET** — the entrance test run by the **Consortium of Medical, Engineering and Dental Colleges of
Karnataka (COMEDK)** for admission to its member private engineering colleges.

## Source — official COMEDK portal (`comedk.org`)
COMEDK publishes its UGET counselling cut-off **ranks** officially on its own portal. After each
counselling cycle it issues an **"Engineering cut-off after all rounds"** PDF — the **final** closing
rank on which a seat was allotted for every *college × branch × seat-category*. Those finals fold in
every round, so they are the single most complete official artifact and are what this dataset is
built from. The verbatim PDFs are kept in `source/`:

| Local file (`source/`) | Official URL | Notified |
|------|------|------|
| `COMEDK_2024_Engineering_Cutoff_AfterAllRounds.pdf` | [Engineering-2024-Cut-off-Ranks-after-all-rounds…](https://www.comedk.org/uploads/Engineering-2024-Cut-off-Ranks-after-all-rounds-Notified-on-17_07_2025.pdf) | 17.07.2025 |
| `COMEDK_2023_Engineering_Cutoff_AfterAllRounds.pdf` | [2023-Engineering-Cut-Off-Ranks-After-All-Rounds…](https://www.comedk.org/uploads/2023-Engineering-Cut-Off-Ranks-After-All-Rounds-Notified-on-27_05_2024-final.pdf) | 27.05.2024 |

> The 2025 "after all rounds" final was not yet published on the portal at build time (404), so this
> dataset covers 2023 and 2024. COMEDK also posts per-round PDFs (Mock / Round 1 / Round 2 / Round 3)
> under each year's `counselling-document-YYYY` archive; the finals above supersede them.

## Important: ranks, not scores
A COMEDK cut-off is the candidate's **COMEDK UGET rank** (like KCET / WBJEE / KEAM, **not** a score
like BITSAT). **Closing Rank** is the **last (highest-numbered) rank allotted** to that
college-branch-category. A combination with no allotment is simply **absent** from the source, so it
is absent here too — no blank-cell guesswork.

### Seat categories (COMEDK scheme)
- **GM** = General Merit (the open state-wide COMEDK pool).
- **KKR** = **Kalyana-Karnataka Region** seats — the Article 371(J) local-reservation quota
  (formerly Hyderabad-Karnataka). Reported as a separate closing rank per college-branch.

## Files
| File | Contents |
|------|----------|
| `COMEDK_Engineering_CutOffs_2023_2024.xlsx` | the dataset — see sheets below |
| `build_xlsx.py` | parses the `source/` PDFs and rebuilds the workbook |
| `source/*.pdf` | verbatim official "after all rounds" cut-off PDFs (2023, 2024) |

### Sheet `All Years` — 1,449 rows (tidy / long)
`Year, College Code, College Name, Seat Category, Branch Code, Branch Name, Closing Rank`. One row
per *year × college × branch × seat-category*. This is the sheet to load into the RAG store.

### Sheets `2023`, `2024` — one per year
Same columns minus `Year`.

| Year | Rows | Colleges | Branches | Categories | Rank range |
|------|------|----------|----------|------------|-----------|
| 2023 | 741  | 118 | 42 | GM, KKR | 403 – 77,173 |
| 2024 | 708  | 117 | 44 | GM, KKR | 434 – 101,925 |

(A long/tidy layout is used instead of one column per branch so each row records only a real
allotment — mirroring the source exactly.)

## Accuracy
The source PDFs lay the data out as a **wide matrix** (rows = college × category, one column per
branch). The matrix is too wide for one page, so branch columns are split into groups of ten and
every group repeats the full college list across ~13 pages. `build_xlsx.py` reads each page's table
with `pdfplumber`, melts it to long form, and keeps only numeric cells.

Values are read **directly** from the saved PDFs (not retyped), so `python3 build_xlsx.py`
reproduces them exactly. Spot-checked against the official source, e.g. 2023 B.N.M. Institute of
Technology (E015) AI&ML = **18768** (GM) / **37141** (KKR); 2024 AMC Engineering College (E007)
Aeronautical = **85705** (GM) and AI&ML = **96420** (GM). Requires `pdfplumber`, `openpyxl`.
