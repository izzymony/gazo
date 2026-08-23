# 🚀 myInstaShop Admin Portal - Deployment Strategy

## 📋 Branch Management Strategy

### **Branch Overview:**

| Branch | Purpose | Environment | Deployment Target |
|--------|---------|------------|-------------------|
| `main` | **Production-ready code** | Production | Live admin portal |
| `dev` | **Development & staging** | Local/Staging | Testing & development |

---

## 🌟 **MAIN Branch (Production)**

### **Purpose:**
- Production-ready, stable code
- No debugging logs or hardcoded data
- Optimized for performance and security

### **Environment Configuration:**
```bash
# Production APIs
NEXT_PUBLIC_API_URL=https://production-instashop-backend.onrender.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_DEBUG_MODE=false

# Security enabled
ADMIN_MFA_REQUIRED=true
ADMIN_IP_WHITELIST_ENABLED=true
ADMIN_GEO_RESTRICTION_ENABLED=true
```

### **Key Features:**
- ✅ Real API authentication with production backend
- ✅ Enhanced error handling and user feedback
- ✅ Clean code without debug console logs
- ✅ Production security configurations
- ✅ Proper environment variable management

### **Deployment:**
```bash
# Deploy to production
git checkout main
npm install
npm run build
npm start
```

---

## 🛠️ **DEV Branch (Development/Staging)**

### **Purpose:**
- Active development and testing
- Debugging tools and console logs enabled
- Demo credentials and mock data for development

### **Environment Configuration:**
```bash
# Development/Staging APIs
NEXT_PUBLIC_API_URL=http://localhost:8088  # or staging URL
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG_MODE=true

# Security relaxed for development
ADMIN_MFA_REQUIRED=false
ADMIN_IP_WHITELIST_ENABLED=false
```

### **Key Features:**
- 🔧 Debug console logs enabled
- 🔧 Demo credentials and quick-fill options
- 🔧 Development-friendly security settings
- 🔧 Local API endpoints for testing

### **Deployment:**
```bash
# Deploy to staging
git checkout dev
npm install
npm run build
npm start
```

---

## 🔄 **Workflow Process**

### **1. Development Workflow:**
```bash
# Work on dev branch
git checkout dev
# Make changes...
git add .
git commit -m "Feature: description"
git push origin dev
```

### **2. Production Release:**
```bash
# Merge dev to main when ready for production
git checkout main
git merge dev --no-ff
# Remove any debug code/logs if needed
git add .
git commit -m "Production release: version X.X.X"
git push origin main
```

### **3. Hotfixes:**
```bash
# Critical fixes can go directly to main
git checkout main
# Make urgent fix...
git add .
git commit -m "Hotfix: critical issue description"
git push origin main

# Sync back to dev
git checkout dev
git merge main
git push origin dev
```

---

## 🏗️ **Environment Setup**

### **Production Setup:**
1. Copy `.env.example` to `.env.local`
2. Configure production API URLs
3. Set proper security keys and secrets
4. Enable all security features
5. Disable debugging

### **Development Setup:**
1. Use dev branch configuration
2. Point to local backend (localhost:8088)
3. Enable debug mode
4. Use development credentials
5. Disable strict security for easier testing

---

## 🔐 **Security Considerations**

### **Production (main branch):**
- ✅ MFA required for admin login
- ✅ IP whitelisting enabled
- ✅ Geographic restrictions (Nigeria only)
- ✅ Secure session management
- ✅ No debug information exposed

### **Development (dev branch):**
- 🔧 MFA disabled for easier testing
- 🔧 No IP restrictions
- 🔧 Debug logs available
- 🔧 Demo credentials available

---

## 📦 **Deployment Commands**

### **Production Deployment:**
```bash
# On main branch
npm ci                    # Clean install
npm run build            # Production build
npm run start            # Start production server
```

### **Development Deployment:**
```bash
# On dev branch
npm install              # Install dependencies
npm run dev              # Development server with hot reload
```

---

## 🚨 **Important Notes**

1. **Never merge main back to dev** unless it's a hotfix
2. **Always test on dev** before merging to main
3. **Remove debug logs** before production deployment
4. **Update environment variables** for each environment
5. **Verify API endpoints** match the intended environment

---

## 📝 **Admin Credentials**

### **Production:**
- Email: `admin@myinstashop.com`
- Password: `admin123456` (should be changed after first login)

### **Development:**
- Various demo credentials available in dev branch
- Quick-fill buttons for testing different roles

---

**Last Updated:** $(date)
**Responsible Team:** myInstaShop Development Team