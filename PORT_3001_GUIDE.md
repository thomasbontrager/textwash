# How to Run TextWash on Port 3001 (Troubleshooting Guide)

This guide helps you understand and run the TextWash frontend server on port 3001.

## TL;DR - Quick Start

TextWash has **two separate servers**:
- **Frontend** (this guide) → Port 3001
- **Backend API** → Port 3000

To run the frontend on port 3001:

```bash
# From the root directory
npm install
npm run dev
```

Then visit: **http://localhost:3001**

---

## Understanding the Port Configuration

### Step 1: What runs on port 3001?

Open the root `package.json` and look at the scripts section:

```json
{
  "scripts": {
    "dev": "http-server -p 3001 -c-1 --cors",
    "start": "http-server -p 3001"
  }
}
```

**This tells you:**
- The frontend uses `http-server` to serve static files
- It's explicitly configured to run on port 3001
- Both `dev` and `start` scripts use port 3001

### Step 2: Project Structure

TextWash follows a **frontend + backend split** architecture:

```
/textwash                 → Frontend (HTML/CSS/JS)
  ├── package.json       → Scripts for port 3001
  ├── index.html
  ├── app.js
  └── style.css

/textwash/backend         → Backend API (Node.js/Express)
  ├── package.json       → Scripts for port 3000
  └── src/server.ts
```

---

## Running the Servers

### Frontend Only (Port 3001)

If you just want to see the UI without backend functionality:

```bash
# Install dependencies (first time only)
npm install

# Start frontend dev server
npm run dev

# Open browser to:
# http://localhost:3001
```

### Full Stack (Frontend + Backend)

For full functionality including AI features and user accounts:

```bash
# Terminal 1 - Start backend (port 3000)
cd backend
npm install              # First time only
./setup.sh              # First time only - sets up database
npm run dev

# Terminal 2 - Start frontend (port 3001)
cd ..
npm install              # First time only
npm run dev
```

**URLs:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

---

## Common Issues & Solutions

### Problem: "Port 3001 is already in use"

**Solution:** Something else is using port 3001. Find and stop it:

```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill <PID>

# Then try again
npm run dev
```

### Problem: "npm run dev not found"

**Solution:** You're in the wrong directory. Make sure you're in the **root** directory, not the `backend` folder:

```bash
# Check current directory
pwd
# Should show: /path/to/textwash

# If you're in backend:
cd ..
npm run dev
```

### Problem: "http-server: command not found"

**Solution:** Dependencies not installed:

```bash
npm install
npm run dev
```

### Problem: Frontend loads but API calls fail

**Symptom:** You see the UI but text cleaning doesn't work, or you get CORS errors.

**Solution:** The backend isn't running. Start it:

```bash
cd backend
npm run dev
```

The frontend (3001) needs the backend (3000) for full functionality.

---

## Changing the Port (If Needed)

### Option 1: Temporary Change

```bash
# Run on a different port temporarily
npx http-server -p 3002
```

### Option 2: Permanent Change

Edit `package.json` in the **root** directory:

```json
{
  "scripts": {
    "dev": "http-server -p 3002 -c-1 --cors",
    "start": "http-server -p 3002"
  }
}
```

**Important:** If you change the frontend port, you also need to update the backend CORS configuration:

1. Edit `backend/src/server.ts`
2. Find the `allowedOrigins` array
3. Add your new port: `'http://localhost:3002'`

---

## Verifying Everything Works

### Check Frontend (Port 3001)

Open browser to **http://localhost:3001**

You should see:
- TextWash landing page
- Dark theme UI
- Text input area

### Check Backend (Port 3000)

Test the API health endpoint:

```bash
curl http://localhost:3000/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### Check Frontend → Backend Connection

1. Open http://localhost:3001
2. Type some text with extra spaces: `Hello    world`
3. Click "Clean"
4. If it works: Backend is connected ✅
5. If it fails: Check backend is running on port 3000

---

## Key Takeaways

✅ **Port 3001** = Frontend (static HTML/CSS/JS served by http-server)

✅ **Port 3000** = Backend API (Node.js/Express with database)

✅ **Run frontend only:** `npm run dev` (from root)

✅ **Run both:** Start backend first, then frontend in separate terminals

🚫 **Google Cloud CLI** = Not needed for local development

🚫 **Docker** = Not required (though it can be used)

---

## Still Having Issues?

1. Make sure Node.js is installed: `node --version` (should be v18+)
2. Make sure npm is installed: `npm --version`
3. Check you're in the correct directory: `pwd`
4. Try cleaning and reinstalling:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

For more detailed setup instructions, see:
- [README.md](./README.md) - Main documentation
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Full stack setup
- [backend/README.md](./backend/README.md) - Backend-specific setup
