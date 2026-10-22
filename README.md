# MHT CET College Predictor

A full-stack, responsive, explainable web application for Maharashtra State Engineering (MHT CET) candidates. The platform predicts college and branch admission chances using verified historical Centralized Admission Process (CAP) round cutoff data, provides side-by-side college comparisons, trend charts, shortlist management with PDF/CSV export, and a secure Administrative MLOps portal for dataset updates, model evaluation, activation safeguards, and rollbacks.

---

## 1. System Architecture

```
College-Predictor/
├── backend/                        # Python / FastAPI Backend
│   ├── app/
│   │   ├── api/                    # Documented FastAPI routers
│   │   │   ├── deps.py             # Auth & dependency injection (JWT, BCrypt)
│   │   │   ├── routes_auth.py      # Admin login and profile
│   │   │   ├── routes_predict.py   # Prediction engine endpoints
│   │   │   ├── routes_colleges.py  # Colleges & branches directory
│   │   │   ├── routes_compare.py   # Side-by-side comparison of 2-4 colleges
│   │   │   ├── routes_shortlist.py # Shortlist management & PDF/CSV export
│   │   │   └── routes_admin.py     # Admin dataset upload, validation, MLOps
│   │   ├── db/                     # SQLAlchemy models & PostgreSQL session
│   │   │   ├── models.py           # Relational schema (Colleges, Cutoffs, Fees, etc.)
│   │   │   └── session.py          # Session factory with SQLite fallback
│   │   ├── engine/                 # Domain logic & machine learning
│   │   │   ├── predictor.py        # Explainable heuristic CAP prediction engine
│   │   │   ├── ml_trainer.py       # Candidate model training, registry & rollback
│   │   │   └── data_ingestion.py   # CSV/Excel parsing, validation & publishing
│   │   ├── config.py               # Application settings & environment variables
│   │   └── main.py                 # FastAPI entrypoint & lifespan initialization
│   ├── tests/                      # Automated Pytest and Playwright suite
│   │   ├── conftest.py             # Fixtures & automated database seeding
│   │   ├── test_predictor.py       # Prediction math & likelihood classification
│   │   ├── test_data_ingestion.py  # File validation, duplicates & ranges
│   │   ├── test_admin_model.py     # Activation safeguards, rollback & registry
│   │   ├── test_api.py             # HTTP endpoint integration tests
│   │   └── test_e2e_playwright.py  # End-to-end browser workflow tests
│   └── seed_data.py                # Verified historical CAP round cutoffs seed
├── frontend/                       # Next.js 14 / TypeScript / Tailwind CSS
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── page.tsx            # Main candidate predictor page
│   │   │   ├── colleges/page.tsx   # College directory & branch browser
│   │   │   ├── admin/page.tsx      # Secure Admin Dashboard & MLOps portal
│   │   │   ├── layout.tsx          # Root layout & metadata
│   │   │   └── globals.css         # Tailwind styles & theme variables
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navbar.tsx          # Responsive navigation header
│   │   │   ├── CandidateForm.tsx   # Student input form with category/budget filters
│   │   │   ├── PredictionCard.tsx  # Outcome card with likelihood & probability bar
│   │   │   ├── TrendModal.tsx      # Recharts historical cutoff line chart
│   │   │   ├── CompareModal.tsx    # Side-by-side 2-4 college comparison table
│   │   │   └── ShortlistDrawer.tsx # Saved shortlist drawer with PDF/CSV export
│   │   └── lib/
│   │       └── api.ts              # Typed API client functions
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── Data/                           # Historical cutoff datasets & source docs
├── notebooks/                      # Data understanding & preprocessing notebooks
└── README.md
```

---

## 2. Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic v2, ReportLab (PDF generation).
- **Database**: PostgreSQL 16 (running via Docker) with SQLAlchemy 2.0 ORM and automatic SQLite fallback.
- **Data & ML**: NumPy, Pandas, Scikit-learn (Ridge Regression, Empirical Bayes, Heuristics).
- **Testing**: Pytest (unit & integration), Playwright (E2E browser testing).

---

## 3. Installation & Startup Commands

### Prerequisites
- Python 3.12+
- Node.js 18+ (Node 24 LTS verified)
- Docker Desktop (or local PostgreSQL)

### Step 1: Database Setup (PostgreSQL)
Run PostgreSQL 16 via Docker:
```powershell
docker run -d --name mhtcet-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mhtcet_db -p 5432:5432 postgres:16-alpine
```

### Step 2: Backend Setup
```powershell
# Create & activate virtual environment
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install -r backend/requirements.txt  # or install fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings pyjwt bcrypt python-multipart reportlab openpyxl numpy pandas scikit-learn pytest pytest-playwright httpx

# Start the FastAPI backend server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*The database automatically creates all tables and seeds verified CAP round cutoffs on first launch.*

Backend Documentation:
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Step 3: Frontend Setup
```powershell
cd frontend
npm install
npm run build
npm start -- -p 3005  # Runs on port 3005 (or default 3000)
```
Open [http://localhost:3005](http://localhost:3005) in your web browser.

---

## 4. Administrative Credentials

- **Admin Portal URL**: `http://localhost:3005/admin`
- **Username**: `admin`
- **Password**: `Admin@MHTCET2026`

---

## 5. Automated Testing Suite

The application includes 43 automated tests with a 100% pass rate:

```powershell
& "backend\venv\Scripts\python.exe" -m pytest backend/tests -v
```

### Test Coverage Highlights:
- **Branch Regression Verification** (`test_regression_branches.py`):
  - Strict regression verification that Pune Institute of Computer Technology (PICT, 6271) does **NOT** offer Civil, Mechanical, or Electrical Engineering.
  - Verifies SPIT and VIT do NOT offer Civil Engineering.
  - Verifies that institutions offering Civil Engineering (COEP, VJTI, Walchand, PCCOE) are properly mapped.
  - Confirms the prediction engine never returns Civil Engineering for PICT.
  - Asserts courses in college profiles are strictly returned in **descending order of cutoff percentile**.
- **Authentication & Login Checks** (`test_auth_login.py`):
  - Valid administrator credentials return JWT token.
  - Incorrect password rejected with 401 Unauthorized.
  - Non-existent username rejected with 401 Unauthorized.
  - Expired / malformed tokens rejected with 401 Unauthorized.
  - Unauthorized access to protected endpoints blocked.
- **Model Check & Bounds** (`test_model_check.py`):
  - Verifies active model has valid statistical metrics (MAE >= 0, RMSE >= 0, R² > 0.8).
  - Tests boundary percentile predictions (99.85% vs 65.0%).
  - Tests likelihood score monotonicity.
- **CAP Option Form & Choice Codes** (`test_cap_option_form.py`):
  - Validates 9-digit Maharashtra DTE choice codes for all predictions.
  - Validates CAP Option Form CSV export.
  - Validates official CAP Option Form PDF generation.
- **Data Ingestion** (`test_data_ingestion.py`):
  - Header alias mapping, percentile range validation (0-100%), and duplicate record detection.
- **Admin Model Registry & Rollback** (`test_admin_model.py`):
  - Unvalidated models cannot be activated.
  - Candidate model evaluation, safe activation, and 1-click instant rollback.
- **Browser End-to-End Tests** (`test_e2e_playwright.py`):
  - Student prediction workflow, Admin portal authentication & MLOps dashboard, and CAP Choice List generator.

---

## 6. Student User Flow & CAP Choice List Generator

1. **Candidate Profile Input**:
   - MHT CET percentile (0.0000% to 100.0000%)
   - State Merit Rank (optional, refines rank predictions)
   - Category & Seat Quota (GOPENS, LOPENS, GOBCS, GSCS, GSTS, TFWS, EWS, DEFENCE, PWD)
   - Gender, Domicile, and CAP Round (Round I, II, or III)
   - Preferred branches (COMP, CSE, IT, AI&DS, ENTC, etc.) and Target Cities
   - Budget ceiling slider
2. **Explainable Prediction Engine**:
   - Groups results into **Likely** (≥ 75%), **Borderline** (45%–74%), and **Reach** (15%–44%).
   - Courses are presented in **descending order of closing cutoff percentile**.
   - Calculates distance margin relative to historical cutoffs with multi-year trend charts.
3. **Official CAP Choice List (Option Form) Generator**:
   - Generates an official preference sequence ready to be submitted into the Maharashtra State CET Cell portal (`cetcell.mahacet.org`).
   - Displays official **9-digit DTE Choice Codes** (e.g. `627124510` for PICT Computer Engineering) with 1-click copy.
   - **Auto-Arrange Strategy**: Orders choices using official counseling strategy: Reach (Dream) at top → Borderline (Target) in middle → Likely (Safe backup) at bottom, all sorted descending by cutoff.
   - Reorder options (Move Up, Move Down, Remove).
   - Export choice list as **Official CAP Option Form PDF** or **CSV**.
4. **Side-by-Side Comparison**:
   - Compare 2 to 4 colleges/branches across cutoffs, fees, intake, and NAAC/NBA accreditation.
   - Download branded **PDF Report** or **CSV Export** for reference.

---

## 7. Administrative CAP Data Ingestion & Model Versioning

### Uploading CAP Cutoff Data
1. Navigate to `/admin` and log in.
2. Select the **"Upload & Validate Cutoff Data"** tab.
3. Upload official CAP cutoff CSV/Excel files.
4. Click **"Validate Dataset Records"**. The engine validates:
   - Header aliases (`CollegeCode`, `BranchCode`, `Percentile`, `Rank`, `Category`, `Round`)
   - Values within the 0.0–100.0% range
   - Identifies and flags logical duplicates
5. Review the sample preview table and error report.
6. Click **"Approve & Publish Live Dataset"** to atomically register the data source and publish the version. The live predictor remains operational even if an import fails.

### Machine Learning Model Lifecycle
1. Under **"Model Operations & Rollback"**, view the active production model and its metrics (MAE, R², Accuracy proxy).
2. Choose an algorithm (Multivariate Ridge Regressor or Empirical Bayes) and click **"Launch Training Job"**.
3. The job trains on historical data and saves the artifact as a **candidate model** (`status="candidate"`).
4. Review metrics. If safety criteria pass, click **"Approve & Activate"**.
5. The previously active model is archived automatically.
6. If any anomaly is observed, click **"Roll Back to Previous Model"** to instantly revert to the working model. All actions are logged to the immutable **Audit Trail**.

---

## 8. Production Deployment Guidance

- **Frontend**: Deploy on Vercel or AWS Amplify by connecting the repository and setting `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`.
- **Backend**: Containerize with Docker, run behind Gunicorn / Uvicorn with Nginx reverse proxy, and connect to a managed AWS RDS PostgreSQL / Supabase instance.
- **Security**: Store `SECRET_KEY`, `ADMIN_PASSWORD`, and `DATABASE_URL` in environment secrets.
