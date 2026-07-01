#!/usr/bin/env python3
"""Re-download the official KEAM 2025 Engineering "Last Rank" PDFs from CEE Kerala.

Source index page: https://cee.kerala.gov.in/keam2025/last_rank
These are the "source" artifacts (in place of a hand-saved PDF). Run from this
directory:  python3 fetch_lastrank.py
"""
import urllib.request

BASE = "https://cee.kerala.gov.in/keam2025/list/lastrank/"
FILES = {
    # First Phase Allotment — Engineering — Last Rank Table (21/07/2025)
    "KEAM_2025_ENGG_Phase1_LastRank.pdf": "p1_last_rank_final.pdf",
    # Second Phase Allotment — Engineering — Last Rank Table
    "KEAM_2025_ENGG_Phase2_LastRank.pdf": "last_rank_engg_p2_final.pdf",
}

for out, remote in FILES.items():
    url = BASE + remote
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=60).read()
    with open(out, "wb") as f:
        f.write(data)
    print(f"{out}  <-  {url}  ({len(data):,} bytes)")
