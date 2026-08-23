# 🔄 CLAUDE WORKFLOW SYSTEM REMINDER
## Essential Guidelines for Every Task

### 🚨 MANDATORY BEFORE ANY WORK

#### **1. FULL-STACK SYSTEMATIC DIAGNOSIS (ALWAYS FIRST)**
```markdown
□ I have FULL ACCESS to both frontend AND backend - use this advantage!
□ For API issues: Check backend contract → Check frontend implementation → Compare
□ For UI issues: Check frontend components → Verify backend data format → Trace flow
□ For integration issues: Examine BOTH sides simultaneously
□ Check /components/common/ for reusable components (26+ available)
□ NO assumptions - verify actual implementation on BOTH sides
□ Use Task tool for complex multi-step investigations
```

#### **2. SAFETY-FIRST DEVELOPMENT HIERARCHY**
```markdown
1. ✅ FIRST: Enhance existing components (add props, extend)
2. ⚠️ SECOND: Modify existing components (preserve API)
3. ❌ LAST RESORT: Create new components (only when absolutely necessary)
```

#### **3. NIGERIAN MARKET REQUIREMENTS**
```markdown
□ 36px minimum touch targets (85% mobile users)
□ 3G network optimization (minimal data usage)
□ Encouraging messaging for new stores
□ Trust-building professional design
□ Social commerce emphasis (Instagram/TikTok)
```

### 📝 TODO LIST MANAGEMENT

**ALWAYS USE TodoWrite WHEN:**
- Task has 3+ steps
- Complex multi-component changes
- User provides multiple tasks
- After receiving new instructions
- Mark completed IMMEDIATELY after each task

**DO NOT USE TodoWrite WHEN:**
- Single trivial task
- Information-only requests
- Tasks < 3 simple steps

### 🔍 FULL-STACK PROBLEM SOLVING WORKFLOW

#### **Phase 1: Full-Stack Analysis (REQUIRED)**
```markdown
1. Identify issue type (API/UI/Integration/Data)
2. Check BOTH codebases based on issue type:
   - API Issues: Backend controller/routes → Frontend API calls → Compare contracts
   - UI Issues: Frontend components/state → Backend response format → Data flow
   - Data Issues: Backend models/DB → API responses → Frontend handling
   - Integration: Trace complete flow across both systems
3. Verify existing components can be reused (frontend)
4. Verify existing endpoints/services (backend)
5. Document findings from BOTH sides before coding
```

#### **Phase 2: Implementation (Choose Correct Side)**
```markdown
FRONTEND:
1. Follow TypeScript patterns (no any without justification)
2. Use existing design patterns
3. Mobile-first responsive design
4. Include proper error handling

BACKEND:
1. Follow Go patterns and clean architecture
2. Use existing repository/service patterns
3. Maintain API contract consistency
4. Include proper error responses

DECISION: Fix on the side where the issue ACTUALLY exists, not where symptoms appear
```

#### **Phase 3: Verification**
```markdown
1. Run npm run lint (if provided)
2. Check TypeScript compilation
3. Test on mobile viewport
4. Verify API integration
```

### ⚡ CRITICAL FULL-STACK RULES

**NEVER:**
- Create files unless absolutely necessary
- Create documentation (*.md) unless explicitly requested
- Assume API format - always verify BOTH backend definition AND frontend usage
- Assume frontend is always the problem - backend could be wrong too
- Use git commands with -i flag (no interactive mode)
- Update git config
- Push to remote unless explicitly asked
- Add comments unless requested
- Use emojis unless requested

**ALWAYS:**
- Prefer editing existing files on EITHER frontend OR backend
- Check BOTH codebases to understand the complete picture
- Trace data flow: Database → Backend API → Frontend → UI
- Fix issues where they ACTUALLY exist (could be backend!)
- Use real API responses from backend logs
- Test end-to-end flow after changes
- Test with mobile-first approach
- Mark todos completed immediately
- Follow naming conventions: PascalCase (React), snake_case (Go)

### 🛠️ TECHNICAL STANDARDS

**TypeScript:**
- No `any` types without justification
- Proper interface definitions
- Strict null checking
- 95%+ type coverage goal

**Performance:**
- Page Load: < 3 seconds on 3G
- Mobile Lighthouse: > 90
- Bundle size optimization
- Image optimization with Next.js Image

**Component Patterns:**
- Check /components/common/ FIRST
- Follow existing patterns
- Maintain backward compatibility
- Mobile-first with 36px touch targets

### 📊 CONTEXT AWARENESS

**When context is low:**
- Prioritize critical issues (syntax, build failures)
- Complete related tasks together
- Document progress for handover
- Use fresh context for complex features

### 🚀 FULL-STACK WORKFLOW COMMAND FORMAT

```bash
# When user reports ANY issue:
1. Identify issue type and affected systems
2. Investigate BOTH frontend AND backend systematically:
   - Backend: Check models → repositories → controllers → routes
   - Frontend: Check components → state → API calls → UI rendering
3. Compare and identify mismatches between systems
4. Determine which side needs fixing (frontend, backend, or both)
5. Check existing code for reuse opportunities on BOTH sides
6. Create todo list if 3+ steps
7. Implement fix on the CORRECT side(s)
8. Test complete flow: Backend API → Frontend → UI
9. Mark todos complete immediately
```

### 🔧 ENVIRONMENT DETAILS

**Frontend:** http://localhost:3000 (Next.js 14)
**Backend:** http://localhost:8088 (Go/Gin)
**Test User:** adefila761@gmail.com / test123
**Business ID:** b1605e40-150d-425a-9ed0-031ee3673fc1

### 📋 COMMON GOTCHAS

1. **API paths**: Backend adds /api/v1 prefix automatically
2. **Categories**: Store uses hardcoded, Products use backend UUIDs
3. **Authentication**: JWT with refresh token rotation
4. **Mobile**: 85% users on mobile - ALWAYS test mobile view
5. **TypeScript**: Strict mode - no implicit any
6. **Full-Stack**: Issues might be on EITHER side - check both!

### 🎯 REAL EXAMPLE - Today's Category Fix

```markdown
ISSUE: "Category not found" error when publishing products

FULL-STACK INVESTIGATION:
1. ✅ Checked backend migration.go → Found UUID format required
2. ✅ Checked backend productController.go → Confirmed UUID validation  
3. ✅ Checked frontend ProgressiveProductSetup.tsx → Found numeric IDs
4. ✅ Identified mismatch: Frontend "1" vs Backend "9aebee99-0435-4ca1-bf82-7657bd35691a"
5. ✅ Fixed on FRONTEND (correct side) to match backend contract
```

---
**REMEMBER: Full-stack access → Check BOTH sides → Fix where issue EXISTS → Test end-to-end**