#!/usr/bin/env python3
"""Parse KEA KCET-2024 engineering cutoff PDFs into tidy Excel sheets.

The source PDFs (cetonline.karnataka.gov.in) use a fixed-width grid: per-college
header (serial, code Exxx, name, place), a category-code header row, then one row
per branch with a closing rank centered under each of 24 category columns.

Numbers in adjacent columns collide in the text layer (e.g. "106707106094"), so
ranks are recovered positionally: every character is binned to its nearest
category-column centre (columns are 36pt apart, ranks centre-aligned).
"""
import sys, re
from collections import defaultdict
import pdfplumber

CODE_RE = re.compile(r'E\d{3}')
BRANCH_RE = re.compile(r'[A-Z][A-Z0-9]?[A-Z0-9]?$')

def cluster_lines(items, tol=4):
    """Group word/char dicts into lines by their 'top' coordinate."""
    lines = defaultdict(list)
    for it in items:
        key = None
        for k in lines:
            if abs(k - it['top']) <= tol:
                key = k; break
        lines[key if key is not None else it['top']].append(it)
    return [sorted(v, key=lambda w: w['x0']) for _, v in sorted(lines.items())]

def parse_pdf(path):
    rows = []                       # output records
    meta = {}
    with pdfplumber.open(path) as pdf:
        # title (round + region) from page 1
        t = pdf.pages[0].extract_text().splitlines()[0]
        meta['title'] = re.sub(r'\s+', ' ', t).strip()
        centers = labels = None
        col = {'code': None, 'name': None, 'place': None}
        cur_branch = None           # (code, name_parts)

        def flush_branch(b, vals):
            if b is None:
                return
            bcode, bname = b[0], ' '.join(b[1]).strip()
            for lab, v in zip(labels, vals):
                if v:
                    rows.append([col['code'], col['name'], col['place'],
                                 bcode, bname, lab, v])

        for pg in pdf.pages:
            chars = [c for c in pg.chars if c['text'].strip()]
            for line in cluster_lines(chars):
                # reconstruct word tokens within the line
                toks, cur = [], []
                for c in line:
                    if cur and c['x0'] - cur[-1]['x1'] > 2.5:
                        toks.append(cur); cur = []
                    cur.append(c)
                if cur: toks.append(cur)
                tw = [(''.join(c['text'] for c in t), t[0]['x0'], t[-1]['x1']) for t in toks]
                texts = [x[0] for x in tw]

                # --- category header row -> set column centres ---
                if 'GM' in texts or 'GMH' in texts:
                    if any(re.fullmatch(r'1[HGKR]+', x) for x in texts):
                        labels = texts
                        centers = [(a + b) / 2 for _, a, b in tw]
                        continue

                # --- college header row ---
                if len(texts) >= 2 and texts[0].isdigit() and CODE_RE.fullmatch(texts[1]):
                    flush_branch(cur_branch, cur_vals if cur_branch else [])
                    cur_branch = None
                    rest = tw[2:]
                    # split name | place at the single large gap (~12pt)
                    split = len(rest)
                    best = 10.0
                    for i in range(1, len(rest)):
                        gap = rest[i][1] - rest[i-1][2]
                        if gap > best:
                            best = gap; split = i
                    col['code'] = texts[1]
                    col['name'] = ' '.join(x[0] for x in rest[:split]).strip()
                    col['place'] = ' '.join(x[0] for x in rest[split:]).strip()
                    continue

                if centers is None:
                    continue

                first_left = centers[0] - 18
                # --- branch row: short uppercase code at far left ---
                is_branch = (tw and tw[0][1] < 96 and BRANCH_RE.fullmatch(tw[0][0])
                             and tw[0][0] not in ('GM',))
                has_vals = any(c['x0'] >= first_left for c in line)

                if is_branch:
                    flush_branch(cur_branch, cur_vals if cur_branch else [])
                    bcode = tw[0][0]
                    name_parts = [x[0] for x in tw[1:] if x[2] < first_left]
                    cur_branch = (bcode, name_parts)
                    # bin value chars into columns
                    buckets = defaultdict(list)
                    for c in line:
                        xc = (c['x0'] + c['x1']) / 2
                        if xc < first_left:
                            continue
                        i = min(range(len(centers)), key=lambda k: abs(centers[k] - xc))
                        if abs(centers[i] - xc) <= 18:
                            buckets[i].append(c)
                    cur_vals = []
                    for i in range(len(centers)):
                        s = ''.join(c['text'] for c in sorted(buckets[i], key=lambda c: c['x0']))
                        s = s.strip()
                        if not s or set(s) <= {'-'}:
                            cur_vals.append('')
                        else:
                            cur_vals.append(s)
                elif cur_branch is not None and not has_vals:
                    # continuation of the branch name (wrapped line)
                    cont = [x[0] for x in tw if x[2] < first_left]
                    if cont:
                        cur_branch[1].extend(cont)
        flush_branch(cur_branch, cur_vals if cur_branch else [])
    return meta, rows

if __name__ == '__main__':
    meta, rows = parse_pdf(sys.argv[1])
    print(meta['title'])
    print('records:', len(rows))
    colleges = {r[0] for r in rows}
    branches = {r[3] for r in rows}
    cats = {r[5] for r in rows}
    print('colleges:', len(colleges), 'branch codes:', len(branches), 'categories:', len(cats))
    print('cats:', sorted(cats))
    # validate every rank is a clean integer
    bad = [r for r in rows if not r[6].isdigit()]
    print('non-integer ranks:', len(bad), bad[:5])
    print('--- sample ---')
    for r in rows[:6]:
        print(r)
