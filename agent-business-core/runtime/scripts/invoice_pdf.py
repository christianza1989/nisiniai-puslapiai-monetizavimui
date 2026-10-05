"""Export through the same professional PDF renderer used in mail."""
import argparse
import json
from pathlib import Path

from pinet_core.invoice_pdf import render


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    value = json.loads(args.snapshot.read_text(encoding='utf-8'))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(render(value))
    print('Professional PDF exported through the common core renderer.')


if __name__ == '__main__':
    main()
