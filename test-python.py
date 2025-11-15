#!/usr/bin/env python3
import sys
sys.path.insert(0, '/tmp/nsv-python')
from nsv import loads, dumps

# Test cases - using actual newlines
tests = [
    ('\n\n\n\n', 'four newlines'),
    ('\n\nfirst\n', 'double newline then first'),
    ('first\n\n\n\nsecond\n', 'first, triple newline, second'),
    ('a\nb\n\nc\nd\n', 'simple table'),
    ('\\\n', 'empty cell token'),
    ('text\\\n', 'text with dangling backslash'),
    ('test\\x41\n', 'unknown escape sequence'),
    ('Tab\\tseparated\\tvalues\\n(would be left as-is normally)\n', 'tab escapes from spec'),
]

for test, desc in tests:
    result = loads(test)
    print(f'{desc}:')
    print(f'  Input: {repr(test)}')
    print(f'  Output: {result}')
    print()
