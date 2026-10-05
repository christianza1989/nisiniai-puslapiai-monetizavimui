import importlib.util
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('supplier_lab', ROOT/'scripts/network_supplier_lab.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def draft(assessment):
    return module.DeliverySupplierDraft.model_validate({'supplier_id':'source', 'language':'lt',
        'subject':'Pristatymo sąlygų užklausa', 'body':'Prašome patvirtinti pristatymo kainą.',
        'findings':[], 'unknowns':['Transporto kaina'], 'can_quote_customer':False,
        'can_commit_order':False, 'explanation':'Pristatymo sąlygos nepatvirtintos.',
        'delivery_assessment': {'longest_side_cm':None, 'girth_plus_length_cm':None,
            'standard_dimensions_eligibility':'unknown','all_carrier_services_rejected':False,
            'route_confirmed':False, 'delivery_cost_eur':None,'landed_cost_ready':False,
            'next_need':'Reikalingi patvirtinti pakuotės ir pristatymo duomenys.',**assessment}})


def test_rubric_rejects_zero_cost_and_product_dimensions_as_package_measurements():
    cases = json.loads((ROOT/'evals/network/supplier-delivery-scenarios.json').read_text(encoding='utf-8'))['cases']
    assert all(module.delivery_checks(cases[0], draft({})).values())
    assert not module.delivery_checks(cases[0], draft({'delivery_cost_eur':0}))['delivery_delivery_cost_eur']
    guessed = draft({'longest_side_cm':142.5,'girth_plus_length_cm':511.5,
        'standard_dimensions_eligibility':'fail'})
    assert not all(module.delivery_checks(cases[1], guessed).values())


def test_dimensions_pass_does_not_hide_unconfirmed_route_or_final_price():
    case = json.loads((ROOT/'evals/network/supplier-delivery-scenarios.json').read_text(encoding='utf-8'))['cases'][3]
    physical = {'longest_side_cm':60,'girth_plus_length_cm':200,'standard_dimensions_eligibility':'pass'}
    assert all(module.delivery_checks(case, draft(physical)).values())
    assert not all(module.delivery_checks(case, draft({**physical,'route_confirmed':True,
        'landed_cost_ready':True})).values())
    with pytest.raises(ValidationError):
        draft({'delivery_cost_eur':-1})


def test_signature_requires_both_confirmed_operator_fields():
    identity = {'display_name':'MB Pinet','contact_email':'info@pinet.lt'}
    item = draft({})
    assert not module.signature_present(item, identity)
    assert not module.signature_present(item.model_copy(update={'body':'MB Pinet'}), identity)
    assert module.signature_present(item.model_copy(update={'body':'Pagarbiai, MB Pinet\ninfo@pinet.lt'}), identity)


def test_operator_identity_does_not_accept_another_sites_projection(monkeypatch):
    original = module.Knowledge.model_validate_json
    def mismatched(value):
        return original(value).model_copy(update={'site_id':'greitossvetaines'})
    monkeypatch.setattr(module.Knowledge, 'model_validate_json', mismatched)
    with pytest.raises(ValueError, match='operator_identity_site_mismatch'):
        module.operator_identity('traktoriupadangos')
