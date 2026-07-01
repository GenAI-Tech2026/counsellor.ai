# KEAM 2025 — Engineering Last Rank (Cut-Off) Data (Kerala)

Counterpart to the `kcet/`, `mhtcet/`, `apeamcet/`, `tgeamcet/`, `wbjee/`, `jeeadvanced/`
cutoff datasets, for Kerala's centralised engineering allotment run by the
**Commissioner for Entrance Examinations (CEE), Government of Kerala** through the KEAM
(Kerala Engineering Architecture Medical) process.

## Source — official CEE Kerala "Last Rank" PDFs
CEE Kerala publishes the official cut-offs as **"Last Rank Table"** PDFs, one per allotment
phase, listed on:

`https://cee.kerala.gov.in/keam2025/last_rank`

For 2025 Engineering, two phases were published. The exact PDFs are preserved verbatim under
`source/` (these are the "source" artifacts):

| Saved as | Official URL |
|----------|--------------|
| `source/KEAM_2025_ENGG_Phase1_LastRank.pdf` | `…/keam2025/list/lastrank/p1_last_rank_final.pdf` |
| `source/KEAM_2025_ENGG_Phase2_LastRank.pdf` | `…/keam2025/list/lastrank/last_rank_engg_p2_final.pdf` |

`source/fetch_lastrank.py` re-downloads them from the official endpoint.

## Files
| File | Phase | Rows | Branches | Colleges |
|------|-------|------|----------|----------|
| `KEAM_2025_ENGG_Phase1_LastRank.xlsx` | First Phase | 5,133 | 51 | 139 |
| `KEAM_2025_ENGG_Phase2_LastRank.xlsx` | Second Phase | 4,490 | 51 | 139 |
| `KEAM_2025_ENGG_AllPhases_LastRank.xlsx` | both phases (one sheet/phase) | 9,623 | — | — |

A "row" is one College × Branch × Category last rank. Row counts fall in Phase 2 because
fewer college-branch-category seats remain unfilled/allotted.

## Format (tidy / long)
One row per **Branch × College × Category**, with columns:
`Branch, College Code, College, College Type, Category, Last Rank`.

- **Last Rank** is the official KEAM rank of the last candidate allotted that college-branch
  in that category, in that phase. A category appears for a college only if it actually had
  an allotment there (the source prints `-` otherwise — those are omitted, never guessed).
- **College Code** is CEE's 3-letter institution code (e.g. `TVE`, `KKE`, `RET`).
- **College Type** (from the source "Type" column):
  - `Government` (`G`) — the Government Engineering Colleges and the Government Dairy/Fisheries
    university colleges.
  - `Self Financing` (`S`) — private self-financing colleges.
  - `Government Controlled` (`N`) — the society-run "College of Engineering, …" institutions
    (CAPE / IHRD / Co-operative Academy of Professional Education).
- **Category** codes — KEAM's reservation scheme. The 13 main columns of the source table:
  `SM` (State Merit), `EZ` (Ezhava), `MU` (Muslim), `LA` (Latin Catholic & Anglo-Indian),
  `DV` (Dheevara), `VK` (Viswakarma), `BH` (Other Backward Hindu), `BX` (Other Backward
  Christian), `KN` (Kudumbi), `KU` (Kusavan), `SC` (Scheduled Caste), `ST` (Scheduled Tribe),
  `EW` (EWS). The source's free-form **"Other Categories"** column is split into one row per
  code, preserving CEE's special-reservation codes verbatim (e.g. `FW`, `PT`, `CC`, `SD`,
  `XS`, `MG`, `PD`, `PI`, `RP`, and the `Y*`/`CB`/`DK` codes).

A long/tidy layout is used (instead of one column per category) so each college-branch lists
only the categories it actually filled — mirroring the source exactly, with no blank-cell
guesswork.

## Accuracy
The PDFs are clean dompdf (HTML→PDF) output with a true text layer. Extraction is done by
word x-position (`source/parse_pdf.py`): each record's college code, type and all ranks sit on
one "anchor" line, and category ranks — short, right-aligned numbers — are bucketed by column
centre, which is exact.

The result was **cross-validated against a fully independent method** (`pdfplumber`'s
table-line detection): across **8,063** main-category cells extracted by both methods there
were **0 mismatches**. Every Last Rank is a clean positive integer (**0 malformed ranks**),
the College Type is one of G/S/N for every row, and all 51 branch sections are recovered.

The builders are kept here for reproducibility: `source/fetch_lastrank.py` (re-download) then
`python3 build_xlsx.py` (re-run from this directory).
