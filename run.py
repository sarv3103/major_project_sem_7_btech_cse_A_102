import os
import sys
import time
import subprocess
import webbrowser
import urllib.request
import signal

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

def print_banner():
    print("=" * 65)
    print("   SECUREWHEELS AUTONOMOUS MOTOR INSURANCE & FRAUD SHIELD")
    print("   Single Command Launcher (Backend + Frontend + Browser)")
    print("=" * 65)
    print(f"[*] Project Root: {PROJECT_ROOT}\n")

def is_backend_ready():
    try:
        url = "http://127.0.0.1:8000/api/health"
        with urllib.request.urlopen(url, timeout=1) as resp:
            return resp.status == 200
    except Exception:
        return False

def main():
    print_banner()

    # 1. Start FastAPI Backend
    print("[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = PROJECT_ROOT + (os.pathsep + backend_env.get("PYTHONPATH", "") if backend_env.get("PYTHONPATH") else "")
    
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=PROJECT_ROOT,
        env=backend_env,
        stdout=None,
        stderr=None
    )

    # 2. Start Vite React Frontend
    print("[2/3] Starting Vite React Frontend on http://localhost:3000 ...")
    frontend_cmd = "npm run dev"
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        shell=True,
        stdout=None,
        stderr=None
    )

    # 3. Wait for services and open browser
    print("[3/3] Initializing services and waiting for readiness...")
    for _ in range(15):
        if is_backend_ready():
            print("   -> Backend is LIVE & HEALTHY at http://127.0.0.1:8000")
            break
        time.sleep(1)

    print("\n" + "=" * 65)
    print("   ALL SERVICES RUNNING SUCCESSFULLY!")
    print("   - Frontend Portal:  http://localhost:3000")
    print("   - Backend Swagger:  http://127.0.0.1:8000/docs")
    print("   - Health Endpoint:  http://127.0.0.1:8000/api/health")
    print("=" * 65)
    print("\n[*] Opening http://localhost:3000 in your browser...\n")
    print("[*] Press CTRL + C in this terminal to safely stop all services.\n")

    try:
        webbrowser.open("http://localhost:3000")
    except Exception:
        pass

    try:
        # Keep runner alive while child processes run
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("\n[!] Backend process exited unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("\n[!] Frontend process exited unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n[*] Shutting down SecureWheels platform gracefully...")
    finally:
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            # On Windows shell=True spawns a cmd process, taskkill terminates child tree
            if sys.platform == "win32":
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                frontend_proc.terminate()
        except Exception:
            pass
        print("[*] All services stopped. Goodbye!")

if __name__ == "__main__":
    main()
