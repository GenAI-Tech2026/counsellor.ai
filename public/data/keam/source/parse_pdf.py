#!/usr/bin/env python3
"""Word-position parser for KEAM engineering Last Rank PDFs (CEE Kerala, dompdf).

Returns tidy rows: [branch, college_code, college, type, category, last_rank].

Layout facts (A4 landscape, constant across pages):
  - Branch header  = size 12 Helvetica-Bold, single full-width line.
  - Table header   = size 9  Helvetica-Bold ("Name of College Type SM EZ ...").
  - Data record    = size 8  Helvetica. The college CODE, the TYPE letter (G/S/N)
                     and all 13 category ranks share ONE "anchor" line; the college
                     NAME wraps over the line(s) just above/below it.

Ranks are short, right-aligned numbers -> bucketing them by x-centre is exact.
The (messy, multi-line) name is assembled from name-region words and attached to
the nearest anchor line.
"""
import re
import pdfplumber

CATS = ['SM','EZ','MU','LA','DV','VK','BH','BX','KN','KU','SC','ST','EW']

# header word centres (x), constant for every page of these dompdf PDFs
CENTERS = {'SM':258.5,'EZ':292.75,'MU':326.9,'LA':361.1,'DV':395.25,'VK':429.45,
           'BH':463.7,'BX':497.85,'KN':532.0,'KU':566.2,'SC':600.35,'ST':634.55,'EW':668.75}

NAME_X_MIN, NAME_X_MAX = 38.0, 205.0   # college-name band (names start ~x0=42)
CODE_X_MAX = 38.0                       # 2-4 letter college code starts at x0~21
TYPE_X0, TYPE_X1 = 205.0, 240.0         # the single G/S/N letter
OTHER_X_MIN = 690.0                     # "Other Categories" band (multiple tokens)
VALID_TYPES = {'G', 'S', 'N'}


def _cat_for_x(cx):
    """Nearest category column for an x-centre in the numeric band, else None."""
    best, bestd = None, 18.0
    for cat, c in CENTERS.items():
        d = abs(cx - c)
        if d < bestd:
            best, bestd = cat, d
    return best


def _group_lines(words, tol=2.5):
    words = sorted(words, key=lambda w: (round(w['top']), w['x0']))
    lines, cur, top = [], [], None
    for w in words:
        if top is None or abs(w['top'] - top) <= tol:
            cur.append(w)
            top = w['top'] if top is None else top
        else:
            lines.append((top, cur))
            cur, top = [w], w['top']
    if cur:
        lines.append((top, cur))
    return lines


def parse(path):
    rows = []
    pdf = pdfplumber.open(path)
    branch = None
    for page in pdf.pages:
        words = page.extract_words(extra_attrs=['fontname', 'size'])
        lines = _group_lines(words)

        anchors = []          # (top, record_dict)
        name_frags = []       # (top, text, x0)
        for top, lws in lines:
            texts = [w['text'] for w in lws]
            joined = ' '.join(texts)
            sizes = [round(w['size']) for w in lws]

            # branch header: bold 12pt
            if any(s >= 11 for s in sizes):
                branch = re.sub(r'\s+', ' ', joined).strip()
                continue
            # table header / footer: skip
            if 'Name of College' in joined or joined.startswith('Type ') or 'Categories' in joined:
                continue
            if 'COMMISSIONER' in joined or re.search(r'Page\s*\d', joined) or re.match(r'^\d{2}/\d{2}/\d{4}', joined):
                continue

            # is this an anchor line? must carry a Type letter and ranks
            type_letter = None
            for w in lws:
                cx = (w['x0'] + w['x1']) / 2
                if TYPE_X0 <= cx <= TYPE_X1 and w['text'] in VALID_TYPES:
                    type_letter = w['text']
                    break
            # The lone Type letter (G/S/N) in the Type column is a clean anchor signal:
            # names never reach x>205, so only data records put a letter there. Some
            # records have every main category '-' with only an "Other Categories" value
            # (e.g. "FW:66975"), so we must NOT also require a bare number on the line.
            if type_letter:
                rec = {'code': None, 'type': type_letter, 'ranks': {}, 'other': [], 'branch': branch}
                for w in lws:
                    cx = (w['x0'] + w['x1']) / 2
                    t = w['text']
                    if w['x0'] < CODE_X_MAX:
                        rec['code'] = t if rec['code'] is None else rec['code'] + t
                    elif cx >= OTHER_X_MIN:
                        rec['other'].append(t)
                    elif cx > TYPE_X1:
                        cat = _cat_for_x(cx)
                        if cat and re.fullmatch(r'\d+', t):
                            rec['ranks'][cat] = int(t)
                anchors.append((top, rec))
                # name fragments that share the anchor line (name band)
                for w in lws:
                    if NAME_X_MIN <= w['x0'] < NAME_X_MAX and w['x0'] >= CODE_X_MAX:
                        name_frags.append((top, w['text'], w['x0']))
            else:
                # pure name-fragment line (wrapped name above/below an anchor)
                for w in lws:
                    if NAME_X_MIN <= w['x0'] < NAME_X_MAX:
                        name_frags.append((top, w['text'], w['x0']))

        # attach each name fragment to the nearest anchor (by vertical distance)
        names = {i: [] for i in range(len(anchors))}
        atops = [t for t, _ in anchors]
        for ftop, txt, fx0 in name_frags:
            if not atops:
                continue
            i = min(range(len(atops)), key=lambda j: abs(atops[j] - ftop))
            names[i].append((ftop, fx0, txt))

        for i, (top, rec) in enumerate(anchors):
            frs = sorted(names[i], key=lambda z: (round(z[0]), z[1]))
            name = re.sub(r'\s+', ' ', ' '.join(z[2] for z in frs)).strip()
            b = rec['branch']
            for cat, rank in rec['ranks'].items():
                rows.append([b, rec['code'], name, rec['type'], cat, rank])
            for tok in ' '.join(rec['other']).replace(',', ' ').split():
                m = re.fullmatch(r'([A-Za-z]+):(\d+)', tok)
                if m:
                    rows.append([b, rec['code'], name, rec['type'], m.group(1), int(m.group(2))])
    return rows


if __name__ == '__main__':
    import sys
    from collections import Counter
    for f in sys.argv[1:]:
        rows = parse(f)
        types = Counter(r[3] for r in rows)
        cats = Counter(r[4] for r in rows)
        colleges = {(r[1], r[2]) for r in rows}
        branches = {r[0] for r in rows}
        bad_rank = [r for r in rows if not isinstance(r[5], int)]
        bad_code = [r for r in rows if not r[1] or not re.fullmatch(r'[A-Z]{2,4}', r[1])]
        print('=' * 60)
        print(f, '-> rows:', len(rows))
        print('  branches:', len(branches), ' colleges:', len(colleges))
        print('  types:', dict(types))
        print('  categories:', dict(cats))
        print('  bad ranks:', len(bad_rank), ' bad codes:', len(bad_code))
        if bad_code[:5]:
            print('   sample bad codes:', [(r[1], r[2][:20]) for r in bad_code[:5]])
