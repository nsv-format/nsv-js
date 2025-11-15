#!/usr/bin/env python3
import sys
import json
sys.path.insert(0, '/tmp/nsv-python')
from nsv import load

with open(sys.argv[1], 'r') as f:
    result = load(f)
print(json.dumps(result))
