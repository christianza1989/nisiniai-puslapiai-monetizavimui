import sys,json,pathlib
sys.path.insert(0,'C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-font-tools')
from fontTools.ttLib import TTFont
core=pathlib.Path('C:/Users/lenovo/Documents/dovanos-memorycasting')
folder=core/'public/fonts/laiptucentras'
rows=[]
for old,new in [('newsreader-0.woff2','newsreader-400.woff2'),('newsreader-1.woff2','newsreader-500.woff2')]:
    font=TTFont(folder/old)
    font.flavor='woff2'
    font.save(folder/new)
    rows.append({'source':old,'woff2':new,'before':(folder/old).stat().st_size,'after':(folder/new).stat().st_size,'lithuanianGlyphsPresent':all(ord(c) in font.getBestCmap() for c in 'ĄČĘĖĮŠŲŪŽąčęėįšųūž')})
pathlib.Path(__file__).with_name('qa').joinpath('fonts.json').write_text(json.dumps({'tool':'fontTools; lossless WOFF2 wrapping, OFL retained','fonts':rows},indent=2),encoding='utf8')
print(json.dumps(rows))
