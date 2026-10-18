"""Create a new immutable execution directory; never modify an existing one."""
import argparse,shutil
from pathlib import Path
from capture_structure import save,now,sha


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    a.output.mkdir(parents=True,exist_ok=False)
    files=[]
    for name in ['run_chairs.py','capture_structure.py','immutable_payloads.py','structure_policy.py','queue_policy.py','legacy_capture.py','SOURCE-PINS.json','verify_structure_wire.py']:
        target=a.output/name;shutil.copyfile(Path(__file__).with_name(name),target)
        files.append({'path':str(target.resolve()),'sha256':sha(target.read_bytes())})
    save(a.output/'BUILD.json',{'at':now(),'files':files,'createsSessions':False,'finishSetters':False,'mutableDuringExecution':False})
    print(str(a.output/'BUILD.json'))
