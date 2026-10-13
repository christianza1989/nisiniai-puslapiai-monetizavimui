from pathlib import Path
import sys,json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
kit=Path(sys.argv[1])
report=[]
for name in ["Roboto","LibreBaskerville"]:
    path=kit/"fonts"/(name+"-Variable.ttf")
    font=TTFont(path)
    cmap=font.getBestCmap()
    required="MemoryString 0123456789 ąčęėįšųūž ĄČĘĖĮŠŲŪŽ"
    absent=sorted(set(ch for ch in required if ord(ch) not in cmap))
    if absent: raise RuntimeError("Missing glyphs "+str(absent))
    report.append({"family":name,"glyphs":len(cmap),"requiredGlyphsPresent":True,"axes":[{"tag":a.axisTag,"min":a.minValue,"max":a.maxValue} for a in font["fvar"].axes]})
    font.flavor="woff2"
    font.save(kit/"fonts"/(name+"-Variable.woff2"))
font=instantiateVariableFont(TTFont(kit/"fonts"/"LibreBaskerville-Variable.ttf"),{"wght":400})
glyphs=font.getGlyphSet();cmap=font.getBestCmap();upem=font["head"].unitsPerEm
scale=42/upem;x=0;parts=[]
for char in "MemoryString":
    name=cmap[ord(char)];pen=SVGPathPen(glyphs);glyphs[name].draw(pen)
    parts.append('<path transform="translate('+str(x)+' 72) scale('+str(scale)+' '+str(-scale)+')" d="'+pen.getCommands()+'"/>')
    x+=font["hmtx"][name][0]*scale
svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+str(round(x+10))+'" height="100" viewBox="0 0 '+str(round(x+10))+' 100"><g fill="#183D35">'+"".join(parts)+'</g></svg>'
(kit/"brand"/"memorystring-wordmark.svg").write_text(svg,encoding="utf-8")
(kit/"fonts"/"font-verification.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({"fonts":2,"woff2":2,"glyphValidation":"PASS","wordmark":"outlined Libre Baskerville 400"}))
