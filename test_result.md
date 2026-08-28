#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Develop ALSABBAT ONLY on the `staging` branch (repo anugerahdigitalsolutions/alsabbat).
  `main`/production must never be modified. Keep the app fully compatible with the current
  aaPanel + Nginx deployment (Node 20, React+CRACO, FastAPI, MongoDB, LOCAL media).
  Approved scope: configuration/environment hygiene + aaPanel compatibility only.
  Target staging config: DB `alsabbat_platform_staging`, media LOCAL,
  frontend https://staging.alsabbat.com, API https://api-staging.alsabbat.com.
  Constraints: no destructive changes, no DB rename/drop/migrate, no media deletion,
  no dependency upgrades, no architectural changes, TESTING AGENT FORBIDDEN.

backend:
  - task: "Media storage forced to LOCAL for aaPanel (remove duplicate env key)"
    implemented: true
    working: true
    file: "backend/.env, backend/.env.example"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: |
          Root cause: backend/.env declared MEDIA_STORAGE_PROVIDER twice (LOCAL then
          EMERGENT). python-dotenv keeps the LAST value, so the service resolved to
          EMERGENT (cloud object storage requiring EMERGENT_LLM_KEY) instead of the
          LOCAL disk used by the aaPanel deployment. Removed the duplicate.
          Verified in logs: "MediaService initialised with provider=LOCAL" (was EMERGENT).
          Upload round-trip verified: file written to disk, served via /api/media/files, 200.

  - task: "Staging isolated from production database name"
    implemented: true
    working: true
    file: "backend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: |
          MONGODB_DB_NAME was `alsabbat_platform` (the PRODUCTION name) and a stale
          `DB_NAME=test_database` was also present. Now `alsabbat_platform_staging`,
          matching the existing aaPanel staging DB. Stale DB_NAME removed.
          NON-DESTRUCTIVE: the old local DB was left fully intact (nothing dropped);
          its 6 dev docs were copied into the staging-named DB so the preview keeps
          working. The aaPanel database was never touched.
          Verified: /api/health -> database "connected", environment "staging".

  - task: "Accurate media persistence reporting for self-hosted LOCAL storage"
    implemented: true
    working: true
    file: "backend/app/core/config.py, backend/app/services/media_service.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: |
          media_service.status() hard-coded `persistent = provider != LOCAL` and told
          admins to switch to EMERGENT/S3 — wrong and misleading on aaPanel, where the
          LOCAL directory IS a persistent server disk. Added env flag
          MEDIA_LOCAL_PERSISTENT (default false, so nothing changes unless declared)
          plus a `local_dir` field and accurate notes. Never changes where files are
          written. Also added Settings.is_staging.
          Verified: status reports provider LOCAL, local_dir, persistent mirroring the flag.

frontend:
  - task: "Production build verified for aaPanel static hosting"
    implemented: true
    working: true
    file: "frontend/.env.example"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: |
          No frontend source code changed. `yarn build` (CI=false, GENERATE_SOURCEMAP=false)
          succeeds: 296.42 kB gzip main.js, lint warnings only, no errors.
          Audited src/ for hard-coded environment URLs: none — the API origin comes only
          from REACT_APP_BACKEND_URL (src/lib/api.js). Remaining absolute URLs are
          third-party (YouTube/Drive/WhatsApp) and are legitimate.
          Homepage renders and /admin/login -> dashboard works (auth 200).

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: |
      TESTING AGENT MUST NOT BE USED — explicitly forbidden by the user (see
      memory/test_credentials.md). Verification was done with a self-cleaning Python
      script, curl, a production build and screenshots.

      Verification: `python scripts/staging_config_verify.py [base_url]` -> 33/33 PASS.
      Covers env hygiene (no duplicate keys, LOCAL media, isolated DB), committed env
      templates contain no real secrets, health, admin login, media storage status,
      a full LOCAL upload/serve round-trip, and 7 existing public routes still 200.
      The script hard-deletes its own upload, so it is safe to run against
      https://api-staging.alsabbat.com and leaves no test data (verified: 0 media
      records, 0 files remaining).

      Scope respected: no data dropped/migrated, no media deleted, no dependency or
      architecture changes, all API routes preserved, work only on `staging`.
      NOT COMMITTED/PUSHED — the user should use "Save to Github" to publish to `staging`.
