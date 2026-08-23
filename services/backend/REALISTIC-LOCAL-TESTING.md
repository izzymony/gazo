# InstaShop - Realistic Local Testing Setup

This guide helps you set up InstaShop for realistic local testing without hardcoded data or mock services.

## 🎯 What You Get

- **Real Database**: PostgreSQL with minimal seed data (only categories + admin user)
- **No Mock Data**: No hardcoded vendors, products, or fake data
- **Real API Flow**: Actual registration, authentication, and business creation
- **Proper Validation**: SMS/Email verification, payment processing (test mode)
- **Clean State**: Users must register and create their own businesses/products

## 🚀 Quick Start

### Prerequisites
- Docker installed and running
- Go 1.19+ installed
- PostgreSQL accessible (via Docker)

### 1. Start Realistic Local Environment

```bash
# Make sure you're in the backend directory
cd /Users/macbookpro/Documents/INSTASHOP/App/Repo/instashop-backend

# Run the realistic startup script
./scripts/start-realistic-local.sh
```

This script will:
- Start PostgreSQL in Docker if not running
- Build the application
- Run database migrations  
- Seed only essential data (categories + admin user)
- Start the API server on port 8088

### 2. Test the Setup

Visit: http://localhost:8088/health

You should see:
```json
{
  "status": "healthy",
  "env": "local",
  "port": "8088"
}
```

## 🧪 Testing Flow

### For Realistic Testing Experience:

1. **User Registration**: 
   - Register new users through your frontend
   - SMS/Email verification will be required
   - No pre-existing users (except admin)

2. **Business Creation**:
   - Users must create their own businesses
   - No hardcoded businesses exist
   - Real validation and flow

3. **Product Management**:
   - No pre-existing products
   - Products must be created through the app
   - Real image upload (if configured)

4. **Buyer Experience**:
   - No hardcoded vendors will appear
   - Only businesses created by real users
   - Clean, empty state initially

## 🔧 Configuration Details

### Environment Variables (Updated)
```bash
ENV=local
ENABLE_MOCK_SERVICES=false      # Disabled for realistic testing
SKIP_SMS_VERIFICATION=false     # Real verification required
SKIP_EMAIL_VERIFICATION=false   # Real verification required
USE_LOCAL_FILE_STORAGE=false    # Use real services
```

### What's Seeded (Minimal)
- **Categories**: 5 basic product categories
- **Admin User**: 
  - Email: admin@instashop.local
  - Password: admin123
- **No other data**: Users, businesses, products must be created

### External Services
Configure these for full functionality:

1. **Paystack** (Payments):
   ```bash
   PAYSTACK_SECRET_KEY=sk_test_your_actual_test_key
   PAYSTACK_PUBLIC_KEY=pk_test_your_actual_test_key  
   ```

2. **SMS Service** (Choose one):
   - Twilio, Termii, SendChamp, or SMS providers

3. **Email Service**:
   - SMTP configuration for verification emails

4. **Cloudinary** (File uploads):
   - Real Cloudinary credentials for image uploads

## 🛠️ Troubleshooting

### If you see hardcoded data:
- Check that `ENABLE_MOCK_SERVICES=false` in .env.local
- Ensure complete-test-server.go is not running on port 8088
- Clear database and re-run: `./scripts/start-realistic-local.sh`

### Database Issues:
```bash
# Reset database completely
docker stop instashop-postgres
docker rm instashop-postgres
./scripts/start-realistic-local.sh
```

### Port Conflicts:
```bash
# Kill processes on port 8088
lsof -ti:8088 | xargs kill -9
```

## 📊 Verification Checklist

✅ **API Health**: http://localhost:8088/health returns "healthy"  
✅ **No Mock Data**: Vendor/product lists are empty initially  
✅ **Real Registration**: User signup requires verification  
✅ **Database**: PostgreSQL running with minimal seed data  
✅ **CORS**: Frontend can connect from localhost:3000/3001  

## 🎪 Frontend Integration

Update your frontend API base URL to:
```javascript
const API_BASE_URL = 'http://localhost:8088/api/v1';
```

Ensure your frontend handles:
- Empty states (no vendors/products initially)
- Real authentication flow
- Proper error handling
- Loading states for real API calls

---

**🎯 Result**: You now have a realistic local testing environment that behaves like a production system, without any hardcoded or mock data interfering with your testing experience.