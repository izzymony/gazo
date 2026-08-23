# 🌿 InstaShop Admin - Git Branching Strategy

## 📋 Branch Hierarchy & Purpose

### **Production Environment**
- **`main`** 🏠 - Production branch
  - Contains stable, production-ready code
  - Deployments to production environment
  - Protected branch - requires PR reviews
  - Only accepts merges from `dev` after thorough testing

### **Development Environment**
- **`dev`** 🚀 - Default development branch (STAGING)
  - Main development branch and GitHub default
  - Integration branch for all features
  - Staging environment deployments
  - Where all feature branches merge for integration testing
  - Protected branch - requires PR reviews

### **Foundational Branches** 
- **`UIUX-mockup`** 🎨 - UI/UX Foundation (PROTECTED)
  - Complete polished UI/UX implementation
  - Professional design system and components
  - **Never modify directly** - preservation branch
  - Reference for UI standards and components

- **`functional-implementation`** 🧪 - Implementation Experiments
  - Testing ground for new implementations
  - API integration experiments
  - Proof-of-concept features
  - Can be reset/rebased as needed for experimentation

### **Feature Development**
- **`feature/*`** - Individual feature branches
  - Created from `dev` branch
  - Merged back to `dev` via Pull Request
  - Naming: `feature/user-authentication`, `feature/dashboard-api-integration`

## 🔄 Development Workflow

### **Standard Feature Development**
```bash
# 1. Start new feature from dev
git checkout dev
git pull origin dev
git checkout -b feature/new-feature-name

# 2. Develop and commit
git add .
git commit -m "feat: implement new feature"

# 3. Push and create PR to dev
git push -u origin feature/new-feature-name
# Create PR: feature/new-feature-name → dev
```

### **Release Process**
```bash
# 1. Integration testing on dev branch
# All features merged and tested

# 2. Create release PR
# Create PR: dev → main

# 3. Production deployment
git checkout main
git pull origin main
# Deploy to production
```

### **Hotfix Process**
```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/urgent-fix

# 2. Implement fix
git add .
git commit -m "fix: urgent production issue"

# 3. Merge to both main and dev
git checkout main
git merge hotfix/urgent-fix
git push origin main

git checkout dev  
git merge hotfix/urgent-fix
git push origin dev
```

## 🛡️ Branch Protection Rules

### **`main` (Production)**
- ✅ Require pull request reviews (2+ reviewers)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Restrict pushes to admins only
- ✅ Require linear history

### **`dev` (Staging/Default)**
- ✅ Require pull request reviews (1+ reviewer)
- ✅ Require status checks to pass
- ✅ Allow force pushes for maintainers
- ✅ Set as default branch

### **`UIUX-mockup` (Protected Foundation)**
- ✅ Restrict all direct pushes
- ✅ Admin only access
- ✅ Preserve UI/UX foundation permanently

## 📊 Environment Mapping

| Branch | Environment | Purpose | Auto-Deploy |
|--------|-------------|---------|-------------|
| `main` | **Production** | Live user-facing app | ✅ |
| `dev` | **Staging** | Integration testing | ✅ |
| `functional-implementation` | **Experimental** | R&D, proof-of-concepts | ❌ |
| `UIUX-mockup` | **Reference** | Design system preservation | ❌ |

## 🔧 GitHub Repository Settings

### **Default Branch**: `dev`
- All PRs and issues default to dev branch
- Main development happens here
- New clones start on dev branch

### **Branch Naming Convention**
```
feature/description-of-feature
bugfix/description-of-bug  
hotfix/urgent-production-fix
experiment/research-topic
refactor/component-name
docs/documentation-update
```

## 🎯 Current Status

| Branch | Status | Last Updated | Purpose |
|--------|--------|--------------|---------|
| `main` | ✅ Stable | Latest commit | Production ready |
| `dev` | 🚀 Active | Latest commit | Default development |
| `functional-implementation` | 🧪 Experimental | Latest commit | Implementation testing |
| `UIUX-mockup` | 🎨 Protected | Initial commit | UI/UX foundation |

## 📝 Commit Message Convention

```
feat: add user authentication system
fix: resolve dashboard loading issue  
docs: update API documentation
style: improve button component styling
refactor: restructure user service
test: add unit tests for auth flow
chore: update dependencies
```

---

**🚀 This strategy ensures:**
- ✅ **Stable production** deployments
- ✅ **Safe experimentation** without breaking development
- ✅ **Preserved UI/UX foundation** for reference
- ✅ **Clear development workflow** for the team
- ✅ **Professional Git practices** for enterprise development