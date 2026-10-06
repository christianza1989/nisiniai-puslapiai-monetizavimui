from pathlib import Path
from fontTools.ttLib import TTFont
import hashlib, json

root = Path(__file__).resolve().parent
source = root / 'public/fonts/dmsans-DMSans[opsz,wght].ttf'
target = root / 'public/fonts/dmsans-app.woff2'
font = TTFont(source)
font.flavor = 'woff2'
font.save(target)
manifest = {'source': str(source), 'output': str(target), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'outputSha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'sourceBytes': source.stat().st_size, 'outputBytes': target.stat().st_size, 'method': 'FontTools lossless WOFF2 conversion, no glyph subset; original font/license retained.'}
(root / '../IMPLEMENTATION_FONT_MANIFEST.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(manifest))
