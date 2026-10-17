"""Offline analysis of synthetic experiment artifacts. No network or product writes."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
def read(name):
    return json.loads((ROOT / name).read_text())

dataset = read('dataset.json')
protocol = read('protocol.json')
conversations = {c['id']: c for c in dataset['conversations']}
baseline = read('baseline-development.json') + read('baseline-holdout.json')
gates = read('gate-results.json')['results']
verification = read('verification-results.json')
primary = protocol['models']['primary']
fields = set(dataset['policy']['allowed_fields'])

def normalize(value):
    if isinstance(value, bool):
        return value
    return ' '.join(value.lower().strip().rstrip('.').split())

def validate(row):
    errors = []
    try:
        obj = json.loads(row.get('content') or '')
    except (ValueError, TypeError):
        return [], ['not_json']
    if not isinstance(obj, dict) or set(obj) != {'facts'} or not isinstance(obj.get('facts'), list):
        return [], ['invalid_root_contract']
    c = conversations[row['contact_id']]
    source_ids = {m['id'] for m in c['messages']}
    for i, fact in enumerate(obj['facts']):
        if not isinstance(fact, dict) or set(fact) != {'contact_id', 'field', 'value', 'status', 'source_ids'}:
            errors.append(f'fact_{i}:invalid_keys')
            continue
        if fact['contact_id'] != c['id'] or fact['field'] not in fields:
            errors.append(f'fact_{i}:contact_or_field')
        if not isinstance(fact['value'], (str, bool)) or fact['status'] not in ('confirmed', 'pending'):
            errors.append(f'fact_{i}:type_or_status')
        refs = fact['source_ids']
        if not isinstance(refs, list) or not refs or any(x not in source_ids for x in refs) or len(set(refs)) != len(refs):
            errors.append(f'fact_{i}:sources')
    # A malformed object is never silently salvaged for the operational score.
    return ([], errors) if errors else (obj['facts'], [])

def matches(fact, gold, semantic=False):
    value = normalize(fact['value'])
    expected = normalize(gold['value'])
    if semantic:
        # Independent, transparent adjudication; never used for model selection.
        aliases = {
            'g10': ['02-06 ou 02-07'],
            'g12': ['me separei. não sou mais casada'],
        }
        value_ok = value == expected or value in aliases.get(gold['id'], [])
    else:
        value_ok = value == expected
    allowed = protocol['allowed_source_sets'].get(gold['id'], [gold['source_ids']])
    return (fact['field'] == gold['field'] and value_ok and fact['status'] == gold['status']
            and any(set(fact['source_ids']) == set(s) for s in allowed))

def score(rows, semantic=False):
    totals = {'tp': 0, 'fp': 0, 'fn': 0, 'invalid_responses': 0}
    details = []
    for row in rows:
        c = conversations[row['contact_id']]
        facts, errors = validate(row)
        unused = list(c['gold'])
        tp = 0
        false_positives = []
        for f in facts:
            found = next((g for g in unused if matches(f, g, semantic)), None)
            if found:
                tp += 1
                unused.remove(found)
            else:
                false_positives.append(f)
        result = {'contact_id': c['id'], 'split': c['split'], 'tp': tp, 'fp': len(false_positives),
                  'fn': len(unused), 'schema_errors': errors, 'unmatched_predictions': false_positives,
                  'missing_gold_ids': [g['id'] for g in unused]}
        for key in ('tp', 'fp', 'fn'):
            totals[key] += result[key]
        totals['invalid_responses'] += bool(errors)
        details.append(result)
    return {'totals': totals, 'conversations': details}

def cost(row):
    usage = row.get('usage') or (row.get('result') or {}).get('usage')
    if not usage:
        return None
    if 'neurons' in usage:
        return usage['neurons'] * 0.011 / 1000
    rates = {'clef': 0.24, 'clef-flash': 0.038}
    return usage.get('input_tokens', 0) * rates[row['model']] / 1_000_000

summary = {'scoring': 'strict canonical + separately adjudicated semantic; whole-contract rejection',
           'baselines': {}, 'pipelines': {}, 'gates': {}, 'stress': {}, 'costs': {}}
for model in protocol['models'].values():
    if not isinstance(model, str) or not model.startswith('@cf/'):
        continue
    rows = [r for r in baseline if r['model'] == model]
    if not rows:
        continue
    summary['baselines'][model] = {}
    for split in ('development', 'holdout'):
        selected = [r for r in rows if conversations[r['contact_id']]['split'] == split]
        summary['baselines'][model][split] = {'strict': score(selected), 'semantic_adjudicated': score(selected, True),
                                            'gross_usd_equivalent': sum(cost(r) or 0 for r in selected)}

base_rows = [r for r in baseline if r['model'] == primary]
base_cost = sum(cost(r) or 0 for r in base_rows)
for model in ('clef-flash', 'clef'):
    gate_rows = [r for r in gates if r['model'] == model]
    rejected = [r['contact_id'] for r in gate_rows
                if r.get('success') and r['result']['answers']['has_useful_update']['noul'] < 0.5]
    gated_rows = [{**r, 'content': '{"facts":[]}'} if r['contact_id'] in rejected else r for r in base_rows]
    summary['gates'][model] = {
        'rejected_contacts': rejected,
        'gold_facts_in_rejected_conversations': sum(len(conversations[c]['gold']) for c in rejected),
        'lost_gold_ids': [g['id'] for c in rejected for g in conversations[c]['gold']],
        'strict': score(gated_rows),
        'gross_pipeline_usd_reconstructed': sum(cost(r) or 0 for r in gate_rows)
            + sum(cost(r) or 0 for r in base_rows if r['contact_id'] not in rejected),
        'note': 'Replayed baseline, not fresh end-to-end execution; rejected gold also counted independently.'}
    verifier_rows = [r for r in verification['results'] if r['model'] == model]
    decisions = {r['contact_id']: r['result']['answers'] for r in verifier_rows if r['success']}
    transformed = []
    changes = []
    for r in base_rows:
        facts, errors = validate(r)
        if errors or r['contact_id'] not in decisions:
            transformed.append(r)
            continue
        output = []
        for i, fact in enumerate(facts):
            a = decisions[r['contact_id']]
            support, clear = a[f'f{i}_supported']['noul'], a[f'f{i}_can_confirm']['noul']
            result = copy.deepcopy(fact)
            if support < 0.3:
                changes.append({'contact_id': r['contact_id'], 'field': fact['field'], 'action': 'removed',
                                'supported': support, 'can_confirm': clear})
                continue
            if support < 0.7 or clear < 0.7:
                result['status'] = 'pending'
            if result['status'] != fact['status']:
                changes.append({'contact_id': r['contact_id'], 'field': fact['field'], 'action': 'downgraded_to_pending',
                                'supported': support, 'can_confirm': clear})
            output.append(result)
        transformed.append({**r, 'content': json.dumps({'facts': output})})
    summary['pipelines'][model] = {'strict': score(transformed), 'semantic_adjudicated': score(transformed, True),
        'changes': changes, 'gross_pipeline_usd_reconstructed': base_cost + sum(cost(r) or 0 for r in verifier_rows),
        'note': 'Verifier decisions applied to frozen baseline candidates; cannot recover omitted facts or repair contract.'}

extra = read('screening-probes.json') + read('schema-results.json')['results']
extra += [read('schema-compatibility-probe.json')['result']]
extra += read('schema-targeted-results.json')['results'] + read('mutation-stress.json')['results'] + read('repeat-results.json')
all_rows = baseline + gates + verification['results'] + extra
assert len(all_rows) == 60, len(all_rows)
summary['costs'] = {'api_attempts': len(all_rows), 'responses_with_usage': sum(cost(r) is not None for r in all_rows),
    'gross_usd_equivalent_known_usage': sum(cost(r) or 0 for r in all_rows),
    'unknown_usage_attempts': sum(cost(r) is None for r in all_rows),
    'baseline_primary_eight_conversations_usd': base_cost,
    'billing_note': 'Table equivalent before free allocation; failed API calls have no usage returned, invoice not inspected.'}
for model in ('clef-flash', 'clef'):
    vr = [r for r in verification['results'] if r['model'] == model and conversations[r['contact_id']]['split'] == 'holdout']
    summary['pipelines'][model]['holdout_extra_input_tokens'] = sum(r['result']['usage']['input_tokens'] for r in vr)
    summary['pipelines'][model]['holdout_extra_usd'] = sum(cost(r) or 0 for r in vr)

summary['schema_targeted'] = {r['contact_id']: {'errors': validate(r)[1], 'strict': score([r]),
    'semantic_adjudicated': score([r], True)} for r in read('schema-targeted-results.json')['results']}
summary['repeats'] = [{'contact_id': r['contact_id'], 'same_content_as_baseline': r['content'] == next(
    x['content'] for x in base_rows if x['contact_id'] == r['contact_id']), 'schema_errors': validate(r)[1]}
    for r in read('repeat-results.json')]

# Replay only demonstrates deterministic merge of this frozen synthetic result set.
valid_facts = [(r['contact_id'], f) for r in base_rows for f in validate(r)[0]]
def replay(index, facts):
    for cid, f in facts:
        index[(cid, f['field'], json.dumps(f['value'], ensure_ascii=False), f['status'])] = f
    return index
first = replay({}, valid_facts)
second = replay(dict(first), valid_facts)
summary['offline_replay'] = {'first_count': len(first), 'second_count': len(second), 'identical': first == second,
    'limit': 'No D1, transactions, concurrency, source expiry or network recovery tested.'}
(ROOT / 'analysis.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'baselines_holdout': {m: {'strict': v['holdout']['strict']['totals'],
    'semantic_adjudicated': v['holdout']['semantic_adjudicated']['totals']} for m, v in summary['baselines'].items()},
    'gates': {m: {'lost_gold_ids': v['lost_gold_ids'], 'pipeline_usd': v['gross_pipeline_usd_reconstructed']} for m, v in summary['gates'].items()},
    'verification': {m: {'changes': v['changes'], 'pipeline_usd': v['gross_pipeline_usd_reconstructed']} for m, v in summary['pipelines'].items()},
    'costs': summary['costs'], 'replay': summary['offline_replay']}, ensure_ascii=False, indent=2))
