# Admin Guide

## Admin Account Setup

### Create Initial Admin User

1. **Via Database Admin**

```sql
-- Create admin user
INSERT INTO "User" (id, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@textwash.app',
  '$2a$12$...bcrypt_hash...',
  'ADMIN',
  NOW(),
  NOW()
);
```

Generate bcrypt hash:
```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('yourpassword', 12))"
```

2. **Via Prisma Studio**

```bash
npm run prisma:studio
```

- Create User record
- Set role to ADMIN
- Insert hashed password

### First Login

1. Navigate to http://localhost:3001
2. Click "Sign In"
3. Enter admin email and password
4. You'll be redirected to admin panel

## Admin Panel Features

### Stripe Configuration

**Access:** Admin Panel → Stripe Config

**Setup:**
1. Get Stripe keys from Stripe Dashboard
2. Paste Publishable Key, Secret Key, Webhook Secret
3. Click "Save Configuration"

**Why Important:**
- Enables Stripe payment processing
- Configures webhook handling
- Controls subscription features

**Keys to Add:**
```
Publishable Key: pk_test_xxxxx
Secret Key: sk_test_xxxxx
Webhook Secret: whsec_xxxxx
```

### User Management

**Access:** Admin Panel → Users

**Features:**
- View all registered users
- See subscription plan for each user
- Grant Pro access manually
- Revoke Pro access

**Use Cases:**
- Troubleshoot subscription issues
- Manually grant trial extensions
- Test feature gating
- Debug user access

**Actions:**
- **Grant Pro:** Upgrades user to Pro immediately
- **Revoke:** Downgrades user to Free

### Monitoring

**Check Subscription Status:**
```javascript
// Backend logs show:
// "Subscription updated: user123 → PRO (ACTIVE)"
// "Webhook received: customer.subscription.created"
```

**Verify Customers in Stripe:**
1. Go to Stripe Dashboard → Customers
2. Search by email address
3. View subscription history
4. Check billing attempts

### Support Tasks

**User Can't Access Pro Features**
1. Go to Users tab
2. Find user by email
3. Check subscription plan
4. Grant Pro if needed
5. Verify in Stripe dashboard

**Webhook Not Updating Subscriptions**
1. Check Stripe Config has correct webhook secret
2. Verify endpoint URL in Stripe dashboard
3. Check backend logs for webhook errors
4. Re-trigger webhook in Stripe (Logs → Resend)

**Trial Not Showing**
1. Check subscription in database:
   ```sql
   SELECT * FROM "Subscription" 
   WHERE id = 'sub123';
   ```
2. Verify `trialEndsAt` is set
3. Check `status` is `TRIALING`

## Database Management

### Connect to Database

```bash
# Using psql
psql $DATABASE_URL

# Using Prisma Studio
npm run prisma:studio
```

### Common Queries

**Find user by email:**
```sql
SELECT * FROM "User" WHERE email = 'user@example.com';
```

**Find all Pro users:**
```sql
SELECT u.email, s.plan, s.status
FROM "User" u
JOIN "Subscription" s ON u.id = s."userId"
WHERE s.plan = 'PRO';
```

**Find trialing users:**
```sql
SELECT u.email, s.plan, s."trialEndsAt"
FROM "User" u
JOIN "Subscription" s ON u.id = s."userId"
WHERE s.status = 'TRIALING';
```

**See subscription revenue:**
```sql
SELECT COUNT(*) as pro_users
FROM "Subscription"
WHERE plan = 'PRO' AND status IN ('ACTIVE', 'TRIALING');
```

### Data Cleanup

**Delete test account:**
```sql
DELETE FROM "User" WHERE email = 'test@example.com';
-- Cascading delete removes Subscription too
```

**Reset user to Free:**
```sql
UPDATE "Subscription"
SET plan = 'FREE', status = 'ACTIVE'
WHERE "userId" = 'user-id-here';
```

## Security Best Practices

### Protect Admin Credentials

- ✅ Use strong password (16+ characters)
- ✅ Never share admin email/password
- ✅ Access admin only from secure network
- ✅ Change password quarterly
- ✅ Use unique admin email

### API Keys Security

- ✅ Store in environment variables (.env)
- ✅ Never commit .env to git
- ✅ Rotate keys quarterly
- ✅ Use separate test/production keys
- ✅ Monitor Stripe dashboard for suspicious activity

### Database Access

- ✅ Use strong database password
- ✅ Enable database backups
- ✅ Restrict database access to backend only
- ✅ Monitor for unauthorized access
- ✅ Use read-only credentials for reporting

## Monitoring & Alerting

### Check System Health

```bash
# Test API endpoint
curl http://localhost:3000/api/health

# View backend logs
npm run logs

# Check database connection
npm run prisma:studio
```

### Monitor Stripe Events

1. Stripe Dashboard → Developers → Webhooks
2. Click your endpoint
3. View recent events
4. Check for errors or failures

### Common Issues

**High 5xx Errors**
- Check database connection
- Review backend logs
- Restart backend service

**Subscription Updates Failing**
- Verify webhook secret
- Check endpoint URL accessible
- Review Stripe webhook logs

**Payment Processing Down**
- Check Stripe status page
- Verify API keys valid
- Check network connectivity

## Disaster Recovery

### Backup Database

```bash
# Postgres backup
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

### Recovery Procedures

**Lost Admin Access:**
1. Use database admin tool
2. Reset admin password with new hash
3. Re-login

**Corrupted Subscriptions:**
1. Query affected users
2. Compare with Stripe records
3. Update database to match Stripe
4. Verify webhooks working

**Data Loss:**
1. Restore from backup
2. Replay webhook events from Stripe
3. Verify data integrity
4. Update frontend caches

## Scaling Considerations

### When to Scale

- **2000+ users:** Consider database read replicas
- **10,000+ users:** Implement caching layer
- **100,000+ users:** Consider microservices

### Performance Tuning

```sql
-- Add indexes for faster queries
CREATE INDEX idx_subscription_plan ON "Subscription"(plan);
CREATE INDEX idx_subscription_status ON "Subscription"(status);
CREATE INDEX idx_user_stripe ON "User"("stripeId");
```

## Regular Maintenance

### Daily
- Check error logs
- Verify backups completed

### Weekly
- Review new user signups
- Check subscription count
- Monitor Stripe events

### Monthly
- Analyze usage patterns
- Review billing accuracy
- Update documentation

### Quarterly
- Security audit
- Dependency updates
- Performance analysis
- Rotate API keys

## Support Contacts

**Stripe Support**: support.stripe.com
**PostgreSQL Docs**: postgresql.org/docs
**Node.js Docs**: nodejs.org/docs

## Emergency Contacts

In production, save these:
- Stripe Support: https://support.stripe.com
- Database Provider Support
- Hosting Provider Support
- Your DevOps contact

## Admin Runbook

### Issue: User Can't Login

1. Verify user exists: `SELECT * FROM "User" WHERE email = 'X'`
2. Check password hash format
3. Verify JWT_SECRET set correctly
4. Check token not expired in localStorage
5. Clear browser cache and try again

### Issue: Subscription Not Active

1. Check Stripe webhook endpoint configured
2. Verify webhook secret matches
3. Check subscription status in Stripe
4. Manually grant Pro in admin panel if urgentily
5. Review backend logs for errors

### Issue: Checkout Fails

1. Verify Stripe keys in .env
2. Check Stripe products exist
3. Verify customer email valid
4. Check frontend has correct publishable key
5. Test with different browser/incognito

### Issue: Payment Not Processing

1. Check Stripe Dashboard for failed charges
2. Verify card not declined
3. Check trial period not expired
4. Verify subscription not canceled
5. Contact Stripe support if still failing

## Documentation Links

- [Stripe Docs](https://stripe.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Node.js Docs](https://nodejs.org/en/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Docs](https://expressjs.com)
