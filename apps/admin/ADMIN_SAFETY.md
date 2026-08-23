# 🛡️ ADMIN SAFETY GUIDELINES - MANDATORY

## 🚨 **CRITICAL RULE: PROTECT MAIN APP FUNCTIONALITY**

> **Every admin change MUST be verified to not break the main InstaSh‎op application**

## 🔐 **BACKEND API SAFETY RULES**

### **1. API NAMESPACE ISOLATION**
- ✅ **Admin endpoints**: `/api/v1/admin/*` (safe to modify)
- ⚠️ **Shared endpoints**: `/api/v1/*` (requires main app testing)
- ❌ **Core endpoints**: User auth, payments, orders (modification forbidden)

### **2. ENDPOINT MODIFICATION MATRIX**

| Operation Type | Admin-Only Endpoints | Shared Endpoints | Core Business Logic |
|----------------|---------------------|------------------|-------------------|
| **READ** | ✅ Safe | ✅ Safe (with admin fields) | ✅ Safe |
| **UPDATE** | ✅ With audit log | ⚠️ Requires approval | ❌ Forbidden |
| **DELETE** | ⚠️ Super-admin only | ⚠️ Dual approval | ❌ Forbidden |
| **BULK OPS** | ⚠️ Rate limited | ⚠️ Batch restrictions | ❌ Forbidden |

### **3. MAIN APP PROTECTION CHECKLIST**

**Before ANY backend change:**
- [ ] Change is admin-namespaced (`/admin/*`) OR extensively tested
- [ ] Main app workflows (signup, login, purchase, payment) still work
- [ ] Mobile app APIs remain compatible
- [ ] Payment processing unaffected
- [ ] User notifications still trigger properly
- [ ] Database integrity maintained

## 🧪 **TESTING REQUIREMENTS**

### **Mandatory Tests Before Deployment:**

#### **Frontend-Only Changes** (Low Risk)
- [ ] Admin portal functions correctly
- [ ] No console errors or warnings
- [ ] Mobile responsive design maintained

#### **Backend Changes** (Medium Risk)
- [ ] All existing admin endpoints still work
- [ ] Shared endpoints tested with main app scenarios
- [ ] Database migrations don't break existing data
- [ ] API response formats unchanged for main app

#### **Shared Endpoint Changes** (High Risk)
- [ ] Complete main app regression testing
- [ ] Mobile app compatibility verified
- [ ] Payment flows tested end-to-end
- [ ] User authentication flows verified
- [ ] Third-party integrations (Paystack) unaffected

## 🌿 **BRANCH SAFETY STRATEGY**

### **Safe Branches** (No main app impact)
- `admin-extension/*` - Admin portal features
- `admin-ui/*` - Admin interface improvements
- `admin-docs/*` - Documentation updates

### **Caution Branches** (Requires testing)
- `admin-api/*` - New admin endpoints
- `admin-shared/*` - Modifications to shared endpoints
- `admin-db/*` - Database schema changes

### **High-Risk Branches** (Extensive testing required)
- `shared-enhancement/*` - Changes affecting both apps
- `api-modification/*` - Core API changes
- `auth-update/*` - Authentication system changes

## ⚡ **EMERGENCY PROTOCOLS**

### **If Main App Breaks Due to Admin Change:**
1. **IMMEDIATE**: Rollback admin deployment
2. **URGENT**: Revert database changes if applicable
3. **CRITICAL**: Notify main app team and users if needed
4. **ANALYSIS**: Root cause analysis and prevention measures

### **Rollback Strategy:**
- Admin portal can be rolled back independently
- Backend admin endpoints use feature flags for quick disable
- Database changes require tested rollback scripts
- CDN assets can be reverted to previous version

## 📊 **MONITORING AND ALERTS**

### **Main App Health Monitoring:**
- [ ] User registration success rate > 95%
- [ ] Payment success rate > 98%
- [ ] API response times < 2s
- [ ] Mobile app error rate < 1%
- [ ] Database query performance maintained

### **Admin-Specific Monitoring:**
- [ ] Admin authentication success rate
- [ ] Admin operation response times
- [ ] Admin audit log completeness
- [ ] Admin user session security

## 🔧 **DEVELOPMENT BEST PRACTICES**

### **When Creating New Admin Features:**
1. **Design Phase**: Ensure feature doesn't require core business logic changes
2. **Development**: Use admin-namespaced endpoints wherever possible
3. **Testing**: Test in isolation first, then integration testing
4. **Deployment**: Deploy admin features independently when possible

### **When Modifying Shared Resources:**
1. **Analysis**: Document all main app touchpoints
2. **Approval**: Get explicit approval from main app team
3. **Testing**: Comprehensive regression testing required
4. **Coordination**: Coordinate deployment with main app release cycle

## 🎯 **QUICK REFERENCE CHECKLIST**

**Before Every Admin Development Session:**
- [ ] I understand which endpoints I'm modifying
- [ ] I know the impact on main app functionality
- [ ] I have a testing plan that includes main app verification
- [ ] I have rollback procedures documented
- [ ] I will verify no main app functionality is broken

**Remember: When in doubt, choose the safer approach that protects main app users.**

---

**Last Updated:** September 2025  
**Next Review:** Monthly or after significant changes  
**Owner:** Admin Development Team  
**Approved By:** Technical Lead & Main App Team