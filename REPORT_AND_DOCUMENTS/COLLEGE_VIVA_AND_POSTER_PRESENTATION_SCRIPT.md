# SecureWheels: College Exhibition & Viva Presentation Verbal Script

Use this structured script to present your project poster to college examiners, external evaluators, and HOD.

---

## 🎤 Part 1: The 2-Minute Elevator Pitch (Quick Summary)

> *"Good morning, respected examiners and faculty members.  
> Our major project is titled **SecureWheels: An Auditable Multimodal Motor Insurance Claim Adjudication and Forensic Fraud Detection Platform**.*  
>  
> *In India, motor insurance fraud causes over **₹15,000 Crores in annual financial losses**, and traditional claim settlements take **14 to 21 days** due to manual surveyor dispatch. Today, fraudsters exploit mobile apps by uploading clean showroom cars, downloaded accident photos, or blurry images to claim fake payouts.*  
>  
> *SecureWheels solves this with a **Dual-Stream Multimodal Architecture**:*  
> 1. *First, an **Asymmetric Cost-Sensitive ML Ensemble** combining XGBoost, Random Forest, and Isolation Forest. We mathematically proved that missing a fraud costs 6 times more than investigating an honest claim ($C_{FN}:C_{FP} = 6:1$). By setting our optimal threshold at $\theta^* = 0.40$, we reduce total carrier underwriting losses by **34.2%** and achieve **89.1% fraud recall**.*  
> 2. *Second, a **Multimodal Computer Vision Forensics Engine**. It enforces 5 mandatory photo perspectives, uses **OpenCV Laplacian variance ($\sigma^2 < 42.0$)** to block blurry photos, detects clean undamaged cars claiming crash damage, catches cross-vehicle model contradictions, and generates **Error Level Analysis (ELA)** heatmaps to expose Photoshop splicing.*  
> 3. *Third, a **6-Layer Cascading Neural Cluster** spanning dual OpenRouter gateways and a 4-key Groq LPU cluster, achieving **99.9% uptime** and an end-to-end adjudication latency of just **8.4 seconds**.*  
> 4. *Our entire system is live in production today on **Vercel** with a **Supabase PostgreSQL** cloud backend.*  
>  
> *Thank you, and we welcome your questions."*

---

## 🔍 Part 2: The 5-Minute Technical Deep-Dive (If Evaluators Ask for Details)

### 1. "How does your Cost-Sensitive Ensemble work mathematically?"
- **Answer:** Standard classifiers optimize symmetric accuracy at a 0.50 threshold, assuming False Positives and False Negatives cost the same. In insurance, a False Negative (paying a fraudulent total loss claim) costs ₹3,000 to ₹1,50,000, while a False Positive (a quick 10-minute tele-survey) costs only ₹500.
- Using Elkan's Cost-Sensitive Risk Minimization:
  $$\theta^* = \frac{C_{FP}}{C_{FP} + C_{FN}} = \frac{500}{500 + 3000} \approx 0.143 \xrightarrow{\text{calibrated}} \mathbf{0.40}$$
- Our ensemble combines: $P_{\text{ens}} = 0.45 P_{\text{XGB}} + 0.35 P_{\text{RF}} + 0.20 S_{\text{IF}}$.
- On our holdout test set of 2,313 claims, this reduced financial underwriting loss from ₹1,74,300 to ₹1,00,300 (saving 34.2% of carrier funds).

### 2. "How do you stop people from cheating with fake photos?"
- **Answer:** We deploy 4 forensic filters:
  1. **Laplacian Blur Gating:** Uses the 2D Laplacian operator $\Delta I = \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2}$. If variance $\sigma_L^2 < 42.0$, the image is blurry and rejected at the upload boundary.
  2. **Clean-Car Zero Damage Suppressor:** The Senior Forensic Interrogator inspects physical damage severity. If a car is in clean showroom condition, collision claims are blocked immediately.
  3. **Cross-Perspective Contradiction Engine:** Compares car grille, headlamps, and paint histograms across all 5 angles. If the front photo is a sedan and the rear is a hatchback, or colors contradict the policy schedule, it triggers an override to Risk 1.0.
  4. **Error Level Analysis (ELA):** Recompresses the image at 90% JPEG quality to compute difference residuals $E_{\text{amp}}(x,y) = \min(255, |I_{\text{orig}} - I_{\text{resaved}}| \times 10)$. Photoshop splicing lights up brightly on the forensic heatmap.

### 3. "Where is the project deployed and how can we test it?"
- **Frontend Portal:** [https://securewheels-insurance.vercel.app/](https://securewheels-insurance.vercel.app/)
- **Backend:** FastAPI running in a Render cloud container with stateless memory management (< 340 MB RAM).
- **Database:** Supabase Cloud PostgreSQL with Row-Level Security (RLS).
- **Admin Panel:** Real-time risk distribution, date-based sorting, ELA heatmaps, and a live 'Re-evaluate Pipeline' button.

---

## 👥 Authors & Guide Details
- **Sarvesh Sudhir Kulkarni** (Lead Developer & System Architect)
- **Chaitanya Rajesh Kopalwar** (Computer Vision & Forensics)
- **Pranav Prashant Kulkarni** (Backend & API Engine)
- **Chandrashekhar Pradip Kalyan** (Frontend & Integration)
- **Project Guide:** Ms. Linta B. Isal, Assistant Professor, Department of Computer Science & Engineering, MGM's College of Engineering, Nanded.
