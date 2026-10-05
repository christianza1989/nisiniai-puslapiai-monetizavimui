import pytest

from pinet_core import email_agent


class Writer:
    def __init__(self, body, approved=True):
        self.body, self.approved = body, approved

    async def ask(self, schema, instruction, data):
        if schema is email_agent.Letter:
            return email_agent.Letter(body=self.body)
        return email_agent.Review(approved=self.approved,
            unsupported_claims=[] if self.approved else ['unsupported_delivery_promise'])


async def test_natural_letter_keeps_technical_facts_and_separate_quote_projection():
    body = 'Suprantu jūsų poreikį dėl 420/85 R28.\n\n{{quote}}\n\nAr turite traktoriaus modelį?'
    result, reviewed = await email_agent.draft(Writer(body), 'Natural style', 'Reikia 420/85 R28',
        'Tinkamumą reikia tikslinti.', {'pages': []}, [], quote_allowed=True)
    assert result == body and reviewed['approved']


@pytest.mark.parametrize('body', ['Siūlome padangas tik už 100 EUR. Užsakymas jau patvirtintas.',
    'Informaciją apie padangas rasite https://supplier.example.org/produkto-puslapis',
    'Šiam traktoriui garantuojame tiksliai 7 dienų pristatymą.'])
async def test_unprojected_prices_links_and_unknown_numbers_are_blocked(body):
    with pytest.raises(email_agent.DraftRejected):
        await email_agent.draft(Writer(body), 'Natural style', 'Ieškau padangų', 'Kaina nepatvirtinta.', None, [])


async def test_reviewer_blocks_plausible_but_unproven_claim_and_preserves_diagnostic():
    with pytest.raises(email_agent.DraftRejected) as rejected:
        await email_agent.draft(Writer('Padangas jau išsiuntėme, netrukus jas gausite.', approved=False),
            'Natural style', 'Ar tinka?', 'Siuntimas neaktyvuotas.', None, [])
    assert rejected.value.diagnostic['review']['unsupported_claims'] == ['unsupported_delivery_promise']
