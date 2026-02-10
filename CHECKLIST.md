# Quick Start Checklist

## Phase 1: Local Development Setup

- [ ] Backend dependencies installed: `cd backend && npm install`
- [ ] Prisma generated: `npm run prisma:generate`
- [ ] PostgreSQL database created locally
- [ ] Backend `.env` configured with DATABASE_URL
- [ ] Backend starts: `npm run dev` → http://localhost:3000/api/health
- [ ] Frontend `.env` configured with API_URL
- [ ] Frontend server running → http://localhost:3001

## Phase 2: Database Setup

- [ ] Database migrations run: `npm run prisma:migrate`
- [ ] Prisma Studio accessible: `npm run prisma:studio`
- [ ] User table created
- [ ] Subscription table created  
- [ ] AdminProfile table created
- [ ] Test user can be created manually

## Phase 3: Authentication Testing

- [ ] User signup works
  - [ ] New user can register
  - [ ] Email validation working
  - [ ] Password hashing working
  - [ ] Subscription created with FREE plan
  - [ ] JWT token returned
  
- [ ] User login works
  - [ ] Existing user can login
  - [ ] Token persisted to localStorage
  - [ ] Dashboard shows after login
  
- [ ] User profile works
  - [ ] GET /api/auth/me returns user data
  - [ ] Subscription info shown

## Phase 4: Stripe Setup

- [ ] Stripe account created
- [ ] Test mode API keys obtained:
  - [ ] Publishable key (pk_test_...)
  - [ ] Secret key (sk_test_...)
  
- [ ] Products created in Stripe:
  - [ ] CleanText Starter ($29/year, 14-day trial)
  - [ ] CleanText Pro ($99/year, 14-day trial)
  
- [ ] Backend `.env` updated:
  - [ ] STRIPE_SECRET_KEY set
  - [ ] STRIPE_PUBLISHABLE_KEY set
  
- [ ] Frontend `.env` updated:
  - [ ] STRIPE_PUBLISHABLE_KEY set
  
- [ ] Webhook endpoint setup (for testing, use ngrok):
  - [ ] ngrok running: `ngrok http 3000`
  - [ ] Webhook endpoint created in Stripe: `http://ngrok-url/api/webhooks/webhook`
  - [ ] STRIPE_WEBHOOK_SECRET obtained
  - [ ] Backend `.env` updated with webhook secret

## Phase 5: Pricing Page Testing

- [ ] Pricing page accessible at `/pricing`
- [ ] All 3 plans displayed
- [ ] Feature comparison table shown
- [ ] Trial copy visible
- [ ] Buttons clickable

## Phase 6: Stripe Checkout Testing

- [ ] Unauthenticated user → redirects to auth
- [ ] Authenticated user clicks "Start Free Trial"
- [ ] Stripe Checkout opens
- [ ] Test card works: 4242 4242 4242 4242
- [ ] Payment succeeds
- [ ] Redirected back to dashboard
- [ ] Webhook received (check Stripe dashboard)
- [ ] Subscription updated in database
- [ ] User plan changed to STARTER/PRO

## Phase 7: Feature Gating Testing

- [ ] Free user:
  - [ ] Basic clean text button works
  - [ ] AI buttons hidden or disabled
  - [ ] Upgrade prompt shown
  
- [ ] Pro user:
  - [ ] Basic clean text button works
  - [ ] AI buttons visible and clickable
  - [ ] Upgrade prompt hidden

## Phase 8: Admin Setup

- [ ] Admin user created:
  - [ ] role = 'ADMIN'
  - [ ] Email & password set
  
- [ ] Admin login works
- [ ] Admin panel accessible
- [ ] Admin can configure Stripe keys:
  - [ ] Publishable key added
  - [ ] Secret key added
  - [ ] Webhook secret added
  - [ ] Configuration saves

## Phase 9: Admin Functions Testing

- [ ] View users list works
- [ ] Grant Pro access works:
  - [ ] User plan changed to PRO
  - [ ] Status updated in database
  
- [ ] Revoke access works:
  - [ ] User plan reverted to FREE
  - [ ] Status updated to ACTIVE

## Phase 10: Account Management

- [ ] Account page accessible
- [ ] Subscription info displayed
- [ ] Cancel subscription works:
  - [ ] Stripe subscription canceled
  - [ ] Plan stays PRO (until period end)
  - [ ] Status changed to CANCELED
  
- [ ] Logout works:
  - [ ] Token removed
  - [ ] Redirected to home
  - [ ] Dashboard not accessible

## Phase 11: Subscription Lifecycle

- [ ] Trial starting works
- [ ] Trial display shows correct end date
- [ ] Trial conversion (payment) works
- [ ] Subscription renewal works (if testing with time travel)
- [ ] Payment failure handling works
- [ ] Subscription cancellation works
- [ ] Downgrade workflow works

## Phase 12: Deployment Preparation

- [ ] All tests passing locally
- [ ] No console errors
- [ ] No TODO or placeholder code
- [ ] Environment variables documented
- [ ] Database backups tested
- [ ] Error handling tested
- [ ] Edge cases handled

## Phase 13: Backend Deployment

- [ ] Backend deployment target selected (Vercel/Custom)
- [ ] Environment variables added to deployment:
  - [ ] DATABASE_URL (production DB)
  - [ ] JWT_SECRET
  - [ ] STRIPE_SECRET_KEY (live)
  - [ ] STRIPE_PUBLISHABLE_KEY (live)
  - [ ] STRIPE_WEBHOOK_SECRET
  - [ ] FRONTEND_URL
  
- [ ] Build succeeds
- [ ] Migrations run on production
- [ ] API endpoints accessible
- [ ] Health check passes

## Phase 14: Frontend Deployment

- [ ] Frontend deployment target selected (Vercel/Netlify)
- [ ] Environment variables added:
  - [ ] API_URL (production backend)
  - [ ] STRIPE_PUBLISHABLE_KEY (live)
  
- [ ] Build succeeds
- [ ] Assets loaded correctly
- [ ] API calls use production endpoint

## Phase 15: Domain & DNS

- [ ] Domain registered
- [ ] DNS records configured:
  - [ ] CNAME for backend
  - [ ] CNAME for frontend
  - [ ] OR A records if using specific IPs
  
- [ ] SSL/HTTPS working
- [ ] CORS configured for production domain

## Phase 16: Stripe Live Mode

- [ ] Stripe account verified
- [ ] Live mode keys obtained:
  - [ ] pk_live_... (publishable)
  - [ ] sk_live_... (secret)
  
- [ ] Products recreated for live mode (or copy test products)
- [ ] Backend environment variables updated
- [ ] Frontend environment variables updated
- [ ] Webhook endpoint updated in Stripe
- [ ] New webhook secret obtained and saved

## Phase 17: Production Testing

- [ ] User signup works on production
- [ ] Email validation works
- [ ] Login persists across sessions
- [ ] Stripe checkout works with live keys
- [ ] Real payment processing (use small amount)
- [ ] Webhook updates subscription
- [ ] Subscription status reflects immediately
- [ ] All pages load and work

## Phase 18: Monitoring & Alerts

- [ ] Backend logs accessible
- [ ] Database accessible for queries
- [ ] Stripe Dashboard monitored:
  - [ ] Webhooks - check for failures
  - [ ] Customers - verify accounts created
  - [ ] Subscriptions - monitor active subscriptions
  - [ ] Revenue - check payment amounts
  
- [ ] Error tracking setup (Sentry optional)
- [ ] Uptime monitoring setup (optional)

## Phase 19: Admin Access

- [ ] Production admin account created
- [ ] Admin can login
- [ ] Stripe config updated with live keys
- [ ] User management accessible
- [ ] Backups verified

## Phase 20: Launch

- [ ] All phases complete ✅
- [ ] Documentation reviewed
- [ ] Team trained on admin panel
- [ ] Support process documented
- [ ] Marketing/announcement ready
- [ ] 🚀 LAUNCH 🚀

---

## Troubleshooting Quick Links

**Auth Issues:**
- Check JWT_SECRET matches frontend/backend
- Verify password hashing working
- Check token not expired

**Stripe Issues:**
- Verify API keys in both frontend and backend
- Check webhook endpoint accessible
- Verify webhook secret matches
- Monitor Stripe dashboard for webhook failures

**Database Issues:**
- Check DATABASE_URL connection string
- Verify migrations ran
- Check Prisma Studio accessible

**Deployment Issues:**
- Check all environment variables set
- Verify CORS configured
- Check API endpoints returning correct data
- Monitor logs for errors

---

**Status:** _______________
**Last Updated:** _______________
**Next Milestone:** _______________
