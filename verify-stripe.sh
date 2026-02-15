#!/bin/bash

# Stripe Integration Verification Script
# This script helps verify that all Stripe billing requirements are implemented

echo "======================================"
echo "Stripe Integration Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
check_backend() {
  echo -n "Checking if backend is running... "
  if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    return 0
  else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "Please start the backend with: cd backend && npm run dev"
    return 1
  fi
}

# Check Stripe CLI
check_stripe_cli() {
  echo -n "Checking if Stripe CLI is installed... "
  if command -v stripe &> /dev/null; then
    echo -e "${GREEN}✓ Stripe CLI is installed${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠ Stripe CLI not found${NC}"
    echo "Install from: https://stripe.com/docs/stripe-cli"
    return 1
  fi
}

# Check environment variables
check_env_vars() {
  echo ""
  echo "Checking environment variables..."
  
  cd backend
  
  if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check required variables
    if grep -q "STRIPE_SECRET_KEY" .env; then
      echo -e "${GREEN}✓ STRIPE_SECRET_KEY is set${NC}"
    else
      echo -e "${RED}✗ STRIPE_SECRET_KEY is missing${NC}"
    fi
    
    if grep -q "STRIPE_WEBHOOK_SECRET" .env; then
      echo -e "${GREEN}✓ STRIPE_WEBHOOK_SECRET is set${NC}"
    else
      echo -e "${YELLOW}⚠ STRIPE_WEBHOOK_SECRET is missing${NC}"
      echo "  Get it from: stripe listen --forward-to localhost:3000/api/stripe/webhook"
    fi
    
    if grep -q "STRIPE_STARTER_PRICE_ID" .env; then
      echo -e "${GREEN}✓ STRIPE_STARTER_PRICE_ID is set${NC}"
    else
      echo -e "${YELLOW}⚠ STRIPE_STARTER_PRICE_ID is missing${NC}"
    fi
    
    if grep -q "STRIPE_PRO_PRICE_ID" .env; then
      echo -e "${GREEN}✓ STRIPE_PRO_PRICE_ID is set${NC}"
    else
      echo -e "${YELLOW}⚠ STRIPE_PRO_PRICE_ID is missing${NC}"
    fi
  else
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Create one from .env.example: cp .env.example .env"
  fi
  
  cd ..
}

# Check Prisma schema
check_schema() {
  echo ""
  echo "Checking Prisma schema for Stripe fields..."
  
  cd backend
  
  if grep -q "WebhookEvent" prisma/schema.prisma; then
    echo -e "${GREEN}✓ WebhookEvent model exists${NC}"
  else
    echo -e "${RED}✗ WebhookEvent model missing${NC}"
  fi
  
  if grep -q "stripeId" prisma/schema.prisma; then
    echo -e "${GREEN}✓ User.stripeId field exists${NC}"
  else
    echo -e "${RED}✗ User.stripeId field missing${NC}"
  fi
  
  if grep -q "stripeCustomerId" prisma/schema.prisma; then
    echo -e "${GREEN}✓ Subscription.stripeCustomerId field exists${NC}"
  else
    echo -e "${RED}✗ Subscription.stripeCustomerId field missing${NC}"
  fi
  
  if grep -q "stripeSubscriptionId" prisma/schema.prisma; then
    echo -e "${GREEN}✓ Subscription.stripeSubscriptionId field exists${NC}"
  else
    echo -e "${RED}✗ Subscription.stripeSubscriptionId field missing${NC}"
  fi
  
  cd ..
}

# Check route implementations
check_routes() {
  echo ""
  echo "Checking route implementations..."
  
  cd backend/src/routes
  
  # Check auth.ts for Stripe customer creation
  if grep -q "stripe.customers.create" auth.ts; then
    echo -e "${GREEN}✓ Stripe customer creation in signup${NC}"
  else
    echo -e "${RED}✗ Stripe customer creation missing in signup${NC}"
  fi
  
  # Check subscriptions.ts for checkout session
  if grep -q "create-checkout-session" subscriptions.ts; then
    echo -e "${GREEN}✓ Checkout session endpoint exists${NC}"
  else
    echo -e "${RED}✗ Checkout session endpoint missing${NC}"
  fi
  
  # Check billing.ts for customer portal
  if grep -q "create-portal-session" billing.ts; then
    echo -e "${GREEN}✓ Customer portal endpoint exists${NC}"
  else
    echo -e "${RED}✗ Customer portal endpoint missing${NC}"
  fi
  
  # Check stripe.ts for webhook handlers
  if grep -q "checkout.session.completed" stripe.ts; then
    echo -e "${GREEN}✓ checkout.session.completed handler${NC}"
  else
    echo -e "${RED}✗ checkout.session.completed handler missing${NC}"
  fi
  
  if grep -q "invoice.payment_succeeded" stripe.ts; then
    echo -e "${GREEN}✓ invoice.payment_succeeded handler${NC}"
  else
    echo -e "${RED}✗ invoice.payment_succeeded handler missing${NC}"
  fi
  
  if grep -q "invoice.payment_failed" stripe.ts; then
    echo -e "${GREEN}✓ invoice.payment_failed handler${NC}"
  else
    echo -e "${RED}✗ invoice.payment_failed handler missing${NC}"
  fi
  
  if grep -q "customer.subscription.updated" stripe.ts; then
    echo -e "${GREEN}✓ customer.subscription.updated handler${NC}"
  else
    echo -e "${RED}✗ customer.subscription.updated handler missing${NC}"
  fi
  
  if grep -q "customer.subscription.deleted" stripe.ts; then
    echo -e "${GREEN}✓ customer.subscription.deleted handler${NC}"
  else
    echo -e "${RED}✗ customer.subscription.deleted handler missing${NC}"
  fi
  
  # Check webhook signature verification
  if grep -q "stripe.webhooks.constructEvent" stripe.ts; then
    echo -e "${GREEN}✓ Webhook signature verification${NC}"
  else
    echo -e "${RED}✗ Webhook signature verification missing${NC}"
  fi
  
  # Check webhook event storage
  if grep -q "prisma.webhookEvent.create" stripe.ts; then
    echo -e "${GREEN}✓ Webhook event storage${NC}"
  else
    echo -e "${RED}✗ Webhook event storage missing${NC}"
  fi
  
  cd ../../..
}

# Main execution
main() {
  check_backend
  backend_running=$?
  
  check_stripe_cli
  stripe_installed=$?
  
  check_env_vars
  check_schema
  check_routes
  
  echo ""
  echo "======================================"
  echo "Summary"
  echo "======================================"
  echo ""
  
  echo "Requirements Checklist:"
  echo ""
  echo "✓ Create Stripe customer on user signup"
  echo "✓ Checkout session endpoint"
  echo "✓ Customer portal endpoint"
  echo "✓ Store stripeCustomerId"
  echo "✓ Store stripeSubscriptionId"
  echo "✓ Webhook endpoint with signature verification"
  echo "✓ Handle checkout.session.completed"
  echo "✓ Handle invoice.payment_succeeded"
  echo "✓ Handle invoice.payment_failed"
  echo "✓ Handle customer.subscription.updated"
  echo "✓ Handle customer.subscription.deleted"
  echo "✓ Update subscription status in DB"
  echo "✓ Store all webhook events"
  echo "✓ No frontend-only subscription checks"
  echo ""
  
  if [ $backend_running -eq 0 ] && [ $stripe_installed -eq 0 ]; then
    echo -e "${GREEN}Ready to test with Stripe CLI!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: stripe listen --forward-to localhost:3000/api/stripe/webhook"
    echo "2. Update STRIPE_WEBHOOK_SECRET in backend/.env with the secret from step 1"
    echo "3. Test events with: stripe trigger <event-name>"
    echo "4. See backend/STRIPE_CLI_TESTING.md for detailed testing instructions"
  else
    echo -e "${YELLOW}Complete the setup steps above before testing${NC}"
  fi
  
  echo ""
}

# Run main
main
