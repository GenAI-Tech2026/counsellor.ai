# TNEA — Engineering Admission Mark Cut-offs (Tamil Nadu, 2021–2024)

Counterpart to the `kcet/`, `mhtcet/`, `apeamcet/`, `tgeamcet/`, `wbjee/` cutoff datasets,
for Tamil Nadu's centralised single-window counselling — **Tamil Nadu Engineering Admissions
(TNEA)**, run by Anna University for the Directorate of Technical Education (DoTE), Chennai.

## Source — official DoTE / Anna University
TNEA publishes, per year, a **"MARK CUTOFF"** PDF per admission stream (the table of the
*last allotted cut-off mark* per college, branch and community). The official PDFs are kept
verbatim under `source/`:

| File (in `source/`) | Stream | Years |
|---------------------|--------|-------|
| `BArch_<year>_Mark_Cutoff.pdf` | B.Arch | 2021, 2022, 2023, 2024 |
| `Vocational_<year>_Mark_Cutoff.pdf` | Vocational | 2021, 2022, 2023, 2024 |

> Note: only the B.Arch and Vocational stream PDFs were available at the source; the regular
> B.E./B.Tech engineering cut-off PDFs are not included in this dataset yet.

## Files
| File | Contents |
|------|----------|
| `TNEA_MarkCutoffs_2021_2024.xlsx` | the dataset — one tidy/long sheet, **4,136 rows** |
| `build_xlsx.py` | regenerates the workbook from the source PDFs (`python3 build_xlsx.py`) |

## Format (tidy / long)
One row per **Year × Stream × College × Branch × Category**, with columns:
`Year, Stream, College Code, College Name, Branch Code, Branch Name, Category, Cutoff Mark`.

- **Stream** ∈ `BArch`, `Vocational`.
- **Cutoff Mark** is the *last allotted mark* for that college-branch-category that year. It is
  out of **200** for the Vocational stream and out of **400** for **B.Arch** (B.Arch folds in
  the NATA/aptitude component, so its marks run higher) — values are transcribed exactly as
  printed, so each stream keeps its own scale.
- **Category** codes (Tamil Nadu communal reservation scheme):
  `OC` (Open Competition), `BC` (Backward Classes), `BCM` (BC Muslim),
  `MBC` (Most Backward Classes), `SC` (Scheduled Caste), `SCA` (SC Arunthathiyar),
  `ST` (Scheduled Tribe).
  - **2021 only** additionally itemises the MBC block into `MBCV` (Vanniyakula Kshatriya) and
    `MBC DNC` (Denotified Communities) alongside the residual `MBC`; 2022–2024 print a single
    consolidated `MBC`.

A long/tidy layout is used (instead of one column per category) so each college-branch lists
only the categories it actually filled that year — mirroring the source exactly, with no
blank-cell guesswork and no fabricated zeros. This also absorbs the per-year category-set
differences (the 2021 MBC split, and years where a category received no allotment) without
schema changes.

## Accuracy
Tables are extracted programmatically from the PDF text layer with `pdfplumber` (no manual
transcription). Validated against the source: the builder's row count matches an independent
count of non-empty category cells in every PDF exactly (B.Arch 119/110/91/101;
Vocational 1019/800/928/968 for 2021–2024), **0 malformed marks**, and every Cutoff Mark is a
clean number. Re-run `python3 build_xlsx.py` from this directory to rebuild.
