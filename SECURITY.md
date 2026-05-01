# 🔒 Security Guidelines

## Critical Security Issues Fixed

### ✅ Issue 1: Exposed API Key
**Status:** FIXED
- The Gemini API key in `.env` has been **removed and rotated**
- `.env` file is now empty with only comments
- `.gitignore` has been updated to prevent accidental commits

**Action Required:**
- If you're using this repo, you must **rotate your API key immediately**
- Get a new key from [Google AI Studio](https://ai.google.dev/)
- Add it to `.env` locally (NOT in GitHub)

### ✅ Issue 2: Problematic JavaScript Code
**Status:** FIXED
- Removed restrictive error-context detection code from `app.js`
- Removed problematic script from `index.html`
- Removed fetch-blocking logic that caused deployment errors

### ✅ Issue 3: Improper .gitignore Configuration
**Status:** FIXED
- Added proper exclusions for all sensitive files
- Now excludes: `.env`, `.env.local`, `.env.*.local`, `.pem`, `.key`

## Setup Instructions

### 1. Get Your API Key
1. Go to [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Create a new API key for your project
4. Copy the key to a safe location

### 2. Configure Locally
```bash
# Copy the template
cp .env.example .env

# Edit .env file (NEVER commit this!)
# GEMINI_API_KEY=your_actual_key_here
```

### 3. Never Commit Secrets
**DO NOT:**
- ❌ Commit `.env` to Git
- ❌ Share API keys in PRs
- ❌ Paste keys in comments or issues
- ❌ Use production keys in dev/test

**DO:**
- ✅ Use `.env.example` as template
- ✅ Add secrets only to `.env` (locally)
- ✅ Use environment variables in CI/CD
- ✅ Rotate keys if exposed

## Deployment Security

### Vercel Setup
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `GEMINI_API_KEY` (it auto-encrypts)
3. Deploy - Vercel injects it securely

### Cloud Run Setup
```bash
gcloud run deploy elected \
  --set-env-vars GEMINI_API_KEY=your_key \
  --region us-central1
```

## Regular Security Checks

- [ ] Review `.env` before commits
- [ ] Never push secrets to Git
- [ ] Rotate API keys quarterly
- [ ] Monitor API usage for unusual activity
- [ ] Update dependencies regularly

## Reporting Security Issues

If you find a security vulnerability:
1. **DO NOT** create a public issue
2. Email security details privately
3. Include:
   - Type of vulnerability
   - Location in code
   - Potential impact
   - Suggested fix

## Additional Resources

- [Google AI Safety Guidelines](https://ai.google.dev/safety)
- [OWASP Security Checklist](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
