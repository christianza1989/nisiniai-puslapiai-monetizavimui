"""Conservative counts: preserve ambiguous customer input and its provenance."""
import re


def canonical_value(field, value):
    if field not in {'pages', 'quantity'}:
        return value
    units = (r'puslap(?:iai|ių|ius|is|io)|pages?' if field == 'pages' else
        r'vnt\.?|vienet(?:ai|ų|us|as)|pcs?\.?|pieces?|padang(?:os|ų|as|a)|tyres?|tires?')
    match = re.fullmatch(r'\s*(\d{1,6})\s*(?:' + units + r')?\s*', value, re.IGNORECASE)
    return str(int(match[1])) if match else value
