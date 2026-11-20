import os
import sys

# Ensure the root project directory is on the Python path
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Ensure child reloader processes inherit PYTHONPATH on Windows
current_pythonpath = os.environ.get("PYTHONPATH", "")
os.environ["PYTHONPATH"] = PROJECT_ROOT if not current_pythonpath else f"{PROJECT_ROOT}{os.pathsep}{current_pythonpath}"

import uvicorn

if __name__ == "__main__":
    print("=================================================================")
    print("   LAUNCHING SECUREWHEELS FASTAPI SERVER (PORT 8000)")
    print("   Project Root:", PROJECT_ROOT)
    print("=================================================================\n")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
