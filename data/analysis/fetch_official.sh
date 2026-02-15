#!/bin/bash
# Fetch all sessions for Feb 18 from the official site
for PAGE in 1 2 3 4 5 6 7 8; do
  echo "=== PAGE $PAGE ==="
  curl -s 'https://impact.indiaai.gov.in/sessions?date=2026-02-18' \
    -H 'next-action: 7fd748a90df2d2c23451daab274abf764ea226805b' \
    -H 'Referer: https://impact.indiaai.gov.in/sessions?date=2026-02-18' \
    -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)' \
    -H 'Accept: text/x-component' \
    -H 'Content-Type: text/plain;charset=UTF-8' \
    --data-raw "[{\"date\":\"2026-02-18\"},{\"page\":$PAGE,\"pageSize\":25},\"\"]"
  echo ""
  echo ""
done
