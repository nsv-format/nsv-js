#!/usr/bin/env python3
"""Cross-test helper for PyPI-installed NSV package."""
import sys
import json
import nsv

# Read from file or stdin
if len(sys.argv) > 1:
    with open(sys.argv[1], 'r') as f:
        data = nsv.load(f)
else:
    data = nsv.loads(sys.stdin.read())

print(json.dumps(data))
