import re

def check_jsx(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Simple check for curly braces
    open_braces = content.count('{')
    close_braces = content.count('}')
    print(f"Braces: {{: {open_braces}, }}: {close_braces}")

    # Simple check for parens
    open_parens = content.count('(')
    close_parens = content.count(')')
    print(f"Parens: (: {open_parens}, ): {close_parens}")

    # Check for div tags
    open_divs = len(re.findall(r'<div(?!\s*/>)', content))
    close_divs = content.count('</div>')
    self_closing_divs = content.count('<div />') + len(re.findall(r'<div\s+[^>]*/>', content))
    print(f"Divs: open: {open_divs}, close: {close_divs}, self-closing: {self_closing_divs}")
    
    # Check for span tags
    open_spans = len(re.findall(r'<span(?!\s*/>)', content))
    close_spans = content.count('</span>')
    print(f"Spans: open: {open_spans}, close: {close_spans}")

    # Check for button tags
    open_buttons = len(re.findall(r'<button(?!\s*/>)', content))
    close_buttons = content.count('</button>')
    print(f"Buttons: open: {open_buttons}, close: {close_buttons}")

import sys
import os

if __name__ == "__main__":
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    default_path = os.path.join(root_dir, "frontend/src/components/schedule/TaskCard.tsx")
    target = sys.argv[1] if len(sys.argv) > 1 else default_path
    if os.path.exists(target):
        check_jsx(target)
    else:
        print(f"File not found: {target}")
