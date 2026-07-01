# BITSAT Cut-off Scores — BITS Pilani (2017-18 … 2025-26)

Counterpart to the `jeeadvanced/`, `cuet/`, `keam/`, `wbjee/` etc. datasets, holding the
**BITSAT cut-off scores** for the Birla Institute of Technology and Science (BITS).

## Why this source? (BITSAT *does* have official cut-offs)
Unlike CUET — where the NTA publishes nothing and the cut-offs are DU CSAS proxies (see
`../cuet/`) — **BITS Pilani publishes its BITSAT cut-offs officially itself.** A BITSAT cut-off
is the **lowest BITSAT score on which a seat was allocated** for a given *campus × programme* in
that year's final allocation. They are **scores out of 390** (450 until 2021), **not ranks**.

The richest official artifact is the admissions-portal archive page, which embeds the **final**
cut-off scores for **all nine academic years 2017-18 … 2025-26** across the Pilani, K. K. Birla
Goa and Hyderabad campuses (Dubai is not part of the BITSAT cut-off lists):

`https://admissions.bits-pilani.ac.in/FD/BITSAT_cutOffs.html`

Every year lives in a hidden `<div id="YYYY-YYYY">` toggled by a `?yr=` query param, so a single
saved copy of the page contains everything. The verbatim page is preserved at
`source/BITSAT_cutOffs_archive.html` (this is the "source" artifact).

> Note: the WordPress filter tool at `bits-pilani.ac.in/cut-off-bitsat-scores`
> (`admin-ajax.php?action=fetch_scores`) only exposes 2017-2020 + 2022, so the archive page above
> is the more complete official source and is what this dataset is built from.

## Important: scores, not ranks; and the max changed
- BITSAT cut-offs are **scores**, so this dataset is structurally unlike the rank-based JEE / KEAM
  / WBJEE sets — the RAG layer must treat a BITSAT cut-off as "score needed", not "rank".
- **Max marks: 450 up to AY 2021-22, then 390 from AY 2022-23 onward** (BITSAT was shortened). The
  `Max Marks` column records this per row, so cross-year score comparisons must normalise for it.

## Files
| File | Contents |
|------|----------|
| `BITSAT_CutOffs_2017_2025.xlsx` | the dataset — see sheets below |
| `build_xlsx.py` | parses `source/BITSAT_cutOffs_archive.html` and rebuilds the workbook |
| `source/BITSAT_cutOffs_archive.html` | verbatim official admissions-portal page (all 9 years) |

### Sheet `All Years` — 352 rows (tidy / long)
`Academic Year, Campus, Programme, Cut-off Score, Max Marks`. One row per
*year × campus × programme*. This is the sheet to load into the RAG store.

### Sheets `2017-18` … `2025-26` — one per academic year
Same columns minus `Academic Year` (≈37-48 rows each: the 3 campuses' programmes for that year).

## Coverage & accuracy
352 rows across 9 years × 3 campuses (Pilani, Goa, Hyderabad). The page mixes three table layouts
across the years and `build_xlsx.py` normalises all three:
- **2017-18 … 2019-20** — one table *per campus* (campus in the column header), max 450.
- **2020-21 … 2023-24** — a single table with an explicit `Campus` column.
- **2024-25 … 2025-26** — three tables (Pilani / Goa / Hyderabad), each with a `Campus` column.

Values are read **directly** from the saved HTML (not retyped), so `python3 build_xlsx.py`
reproduces them exactly. Spot-checked against the official source, e.g. Pilani B.E. Computer
Science = **304** (2025-26) and **320** (2022-23); Pilani B.E. Chemical = **306/450** (2017-18).
Requires `beautifulsoup4`, `lxml`, `openpyxl`.
