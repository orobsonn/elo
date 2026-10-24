"""Prepare the reviewed Elo plugin overlay. Never uploads or refreshes the live client."""
import json
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path('/tmp/elo-plugin-1.0.5-update.zip')
manifest = json.loads((root / 'plugin/plugin.json').read_text())
openai = manifest['extensions']['com.openai']
legacy = {k: v for k, v in manifest.items() if k not in ('$schema', 'extensions')}
legacy.update(openai)
legacy['skills'] = './skills/'
files = {
    'plugin.json': json.dumps(manifest, ensure_ascii=False, indent=2).encode(),
    '.codex-plugin/plugin.json': json.dumps(legacy, ensure_ascii=False, indent=2).encode(),
}
for skill in ('approve', 'configurar-elo'):
    for path in (root / 'skills' / skill).rglob('*'):
        if path.is_file():
            files[path.relative_to(root).as_posix()] = path.read_bytes()
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, content in files.items():
        archive.writestr(name, content)
with zipfile.ZipFile(output) as archive:
    assert set(archive.namelist()) == set(files)
    for name, expected in files.items():
        assert archive.read(name) == expected
print(json.dumps({'archive': str(output), 'version': manifest['version'], 'paths': sorted(files), 'published': False}))
