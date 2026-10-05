"""Explicit customer language preference for the factual fallback, no business claims."""
import re


def explicit_language(evidence):
    chosen = None
    # Last explicit preference wins. Quoted assistant text never selects language.
    for event in evidence:
        if event.get('speaker') != 'client':
            continue
        text = event.get('text', '')
        matches = list(re.finditer(r'\bin\s+(English|Lithuanian)\b|angliškai|anglų\s+kalba|lietuviškai|lietuvių\s+kalba', text, re.I))
        if matches:
            chosen = 'en' if re.search(r'English|angl', matches[-1].group(), re.I) else 'lt'
    return chosen


def english_fallback(data, profile, clients, pages):
    # Preserve source titles verbatim; their language is not fabricated by a translator.
    sources = '\n'.join(f"- {p['title']}: {p['url']}" for p in pages)
    request = '\n'.join(f'- {text[:700]}' for text in clients[-4:])
    coverage = ('The conversation record may be incomplete. Please correct any important missing details.\n\n'
        if data.get('coverage') == 'incomplete' else '')
    body = (f'Hello,\n\nThank you for speaking with the virtual consultant at {profile.canonical_host}.\n\n'
        f'Your recorded questions and requirements:\n{request}\n\n{coverage}'
        f'Relevant guidance on our website (original page titles):\n{sources}\n\n'
        'If any detail is missing or incorrect, reply to this email to update your enquiry. '
        'This summary records your needs; price, supplier, availability and an order have not been confirmed.\n\n'
        'Best regards,\nMB Pinet\ninfo@pinet.lt\n')
    return f'Your enquiry at {profile.canonical_host}', body
