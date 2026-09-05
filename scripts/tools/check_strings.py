def check_quotes(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        single_quotes = line.count("'")
        double_quotes = line.count('"')
        backticks = line.count('`')
        if single_quotes % 2 != 0:
            print(f"Line {i+1} has odd number of single quotes: {line.strip()}")
        if double_quotes % 2 != 0:
            print(f"Line {i+1} has odd number of double quotes: {line.strip()}")
        # backticks might span multiple lines, so this is just a hint
        if backticks % 2 != 0:
            print(f"Line {i+1} has odd number of backticks: {line.strip()}")

import sys
import os

if __name__ == "__main__":
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    default_path = os.path.join(root_dir, "frontend/src/components/schedule/TaskCard.tsx")
    target = sys.argv[1] if len(sys.argv) > 1 else default_path
    if os.path.exists(target):
        check_quotes(target)
    else:
        print(f"File not found: {target}")
