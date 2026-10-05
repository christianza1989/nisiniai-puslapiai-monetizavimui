import pytest

from pinet_core.followup_projection import bind, verified_result


def project(subject, body):
    data = {'knowledge': {'deployment_id': 'approved', 'knowledge_revision': 1,
        'canonical_host': 'greitossvetaines.lt', 'pages': []},
        'evidence': [{'id': 'client'}], 'test': True}
    value = bind(data, subject, body, {'approved': True, 'unsupported_claims': []}, 'codex_cli_text_lab')
    return verified_result(data, {'validated_followup': value})


def test_customer_requested_form_test_is_legitimate_preparation_content():
    body = 'Sveiki. Užklausų forma: patikrinkite, kur siunčiamos užklausos ir ar atliekamas testinis išsiuntimas. MB Pinet'
    assert project('Jūsų svetainės pasiruošimo sąrašas', body)['body'] == body


@pytest.mark.parametrize('subject,body', [
    ('[TESTAS] Jūsų pasiūlymas', 'Sveiki. Tai pasiūlymas pagal pokalbį. MB Pinet'),
    ('Jūsų pasiūlymas', 'MB Pinet · TESTINIS LAIŠKAS SINTETINIAM BANDYMUI. Sveiki.'),
    ('Jūsų pasiūlymas', 'Sveiki. SINTETINIS BANDYMAS: ši žinutė yra laboratorinė. MB Pinet'),
])
def test_internal_experiment_labels_stay_out_of_customer_projection(subject, body):
    assert project(subject, body) is None
