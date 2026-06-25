#!/usr/bin/env python3
"""
Fetch the official WBJEE 2025 Opening/Closing-Rank (OR-CR) data.

WBJEEB does NOT publish a cutoff PDF. The only official source of college-wise
opening/closing ranks is the NIC e-Counselling "ORCR" tool:
    https://admissions.nic.in/admiss/admissions/orcrjacd/134112521   (UI)

That Angular UI calls one backend web service which returns the WHOLE dataset
(all rounds, all institutes) in a single response:
    GET https://admissions.nic.in/aisheapi/apisaishe/api/cmsservice.asmx/getConfiguredORCRInfo
        ?boardId=134112521
    headers: authtoken: 1111   clientid: 2222   (static, baked into the site JS)

The response is an .asmx XML envelope whose <string> body is the JSON payload
with keys: CounsellingDetail, ColumnDetails, CounsellingData.

Re-run:  python3 fetch_orcr.py   ->  writes WBJEE_2025_ORCR_official.json
"""
import json, re, sys, urllib.request, urllib.parse

BOARD_ID = "134112521"  # "WBJEE Counselling 2025"
API = "https://admissions.nic.in/aisheapi/apisaishe/api/cmsservice.asmx/getConfiguredORCRInfo"
OUT = "WBJEE_2025_ORCR_official.json"


def fetch():
    url = API + "?" + urllib.parse.urlencode({"boardId": BOARD_ID})
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
        "Referer": f"https://admissions.nic.in/admiss/admissions/orcrjacd/{BOARD_ID}",
        "authtoken": "1111",
        "clientid": "2222",
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        xml = r.read().decode("utf-8")
    body = re.search(r"<string[^>]*>(.*)</string>", xml, re.S).group(1)
    data = json.loads(body)
    if not data.get("CounsellingData"):
        sys.exit(f"No data returned (auth/boardId issue?): {data.get('Error')}")
    json.dump(data, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {OUT}: {len(data['CounsellingData'])} rows "
          f"({data['CounsellingDetail'][0]['boardName']})")


if __name__ == "__main__":
    fetch()
