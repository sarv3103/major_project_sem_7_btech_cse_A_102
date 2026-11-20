# SecureWheels: Auditable Multimodal Motor Insurance Claim Adjudication & Fraud Detection Platform

**Academic Repository:** `major_project_sem_7_btech_cse_A_102`  
**Degree:** Bachelor of Technology in Computer Science & Engineering (Semester 7)  
**Department:** Department of Computer Science & Engineering  
**Institution:** MGM's College of Engineering, Nanded (Dr. Babasaheb Ambedkar Technological University, Lonere)  
**Academic Year:** 2026–2027  

**Authors / Project Team:**
- **Sarvesh Sudhir Kulkarni** (Lead Developer & System Architect)
- **Chaitanya Rajesh Kopalwar** (Computer Vision & Forensics)
- **Pranav Prashant Kulkarni** (Backend & Machine Learning)
- **Chandrashekhar Pradip Kalyan** (Frontend & Integration)

**Project Guide:** **Ms. Linta B. Isal**, Assistant Professor, Dept. of CSE

---

## 🌐 Live Production Deployment

The complete platform is live and publicly accessible:

* 🚀 **Live Production Web Application (Vercel):** [**https://securewheels-insurance.vercel.app/**](https://securewheels-insurance.vercel.app/)
* 🗄️ **Cloud Database (Supabase Enterprise):** Managed PostgreSQL 15 with Row-Level Security (RLS) policies.
* ⚡ **Application Server (Render Cloud):** Asynchronous Python 3.11 FastAPI containerized backend.
* 📜 **Government of India Copyright Application:** Registered under Class *Computer Software* (Diary No: **`SW-54364/2026-CO`**, Receipt No: **`285193`**).

---

## 📁 Repository Structure

```
major_project_sem_7_btech_cse_A_102/
├── backend/                       # FastAPI backend, routers, ML engine, services
├── frontend/                      # React 18, TypeScript, Tailwind CSS, Vite web application
├── ml/                            # Machine learning models, training scripts, serialized weights
├── database/                      # Supabase PostgreSQL schemas & migration scripts
├── tests/                         # Comprehensive unit, integration, and security test suites
├── REPORT_AND_DOCUMENTS/          # Official B.Tech academic deliverables & receipts (PDF & MD)
│   ├── MAJOR PROJECT REPORT.pdf   # Complete 59-page Major Project Report
│   ├── reseaech paper.pdf         # IEEE Conference Research Paper
│   ├── certificate_major.pdf      # College Guide & Department Approval Certificates
│   ├── CHAITANYA _CERTIFICATE.pdf # Co-Author Certificate
│   ├── KALYAN_CERTIFICATE.pdf     # Co-Author Certificate
│   ├── pranav certificate .pdf    # Co-Author Certificate
│   ├── diary.pdf                  # Official B.Tech Project Logbook / Diary
│   ├── GOVERNMENT_COPYRIGHT_OFFICE_OFFICIAL_FEE_RECEIPT_285193.pdf # Official Copyright Fee Receipt
│   ├── GOVERNMENT_COPYRIGHT_STATUS_RECEIPT_SW-54364-2026-CO.pdf    # Copyright Application Status
│   ├── HDFC_BANK_PAYMENT_E_ACKNOWLEDGEMENT_RECEIPT.pdf             # Payment E-Acknowledgement
│   ├── 01_PRIMARY_WORK_SOURCE_CODE_DEPOSIT.pdf                     # Source Code Deposit Document
│   ├── 02_NOC_AND_JOINT_AUTHORSHIP_DECLARATION.pdf                 # Signed Joint Authorship NOC
│   ├── SECUREWHEELS_ACADEMIC_EXHIBITION_POSTER.pdf                 # Project Exhibition Poster
│   └── COLLEGE_VIVA_AND_POSTER_PRESENTATION_SCRIPT.md              # 2-min & 5-min viva script
├── requirements.txt               # Backend Python dependencies
├── .env.example                   # Environment configuration template
├── run.py                         # Local platform launcher
└── README.md                      # Master project documentation
```

---

## 💡 Key Technological Highlights

1. **Asymmetric Cost-Sensitive Machine Learning Ensemble:**
   - Combines Extreme Gradient Boosting (XGBoost), Random Forest, and Isolation Forest.
   - Embeds an asymmetric cost matrix ($C_{FN}:C_{FP} = 6:1$) into optimization, driving optimal threshold $	heta^* = 0.40$.
   - Delivers **89.1% fraud recall**, **82.6% precision**, and a **34.2% reduction in net carrier financial loss**.
2. **Multimodal Computer Vision Forensics:**
   - Enforces 5-angle photographic evidence collection.
   - Dual-layer blur detection using OpenCV discrete Laplacian variance ($\sigma_L^2 < 42.0$).
   - Senior Forensic Claim Interrogator blocks clean showroom-condition vehicles from filing collision claims.
   - Cross-Perspective Contradiction Engine catches mismatched vehicle models and paint colors.
   - Error Level Analysis (ELA) localizes JPEG compression tampering and Photoshop splicing.
3. **Local & Cloud Operational Flexibility:**
   - Operates with complete local machine learning inference using bundled Scikit-Learn / XGBoost models, with zero mandatory external API dependencies required for local demonstration.
4. **IRDAI-Compliant Auditable Dossier:**
   - Transparent, human-in-the-loop explainability for insurance adjusters with real-time pipeline re-evaluation.

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Start the Backend
```bash
python -m venv venv
# Windows: venv\Scripts\activate | Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 📜 Official Government Copyright Information
* **Work Title:** Insurance Claim Fraud Detection using Ensemble Learning
* **Class of Work:** Computer Software Work
* **Registration Diary No:** `SW-54364/2026-CO`
* **Receipt No:** `285193`
* **Applicant:** Sarvesh Sudhir Kulkarni (Jointly with co-authors)
* **Office:** Copyright Office, Department for Promotion of Industry and Internal Trade (DPIIT), New Delhi.

---
*Department of Computer Science & Engineering • MGM's College of Engineering, Nanded*
