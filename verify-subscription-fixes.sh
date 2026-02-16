#!/bin/bash

echo "🔍 Verifying subscription fixes..."
echo ""

# Check for problematic patterns
echo "❌ Checking for old patterns (should return 0):"
echo "---"

echo -n "findUnique with userId on subscription: "
grep -r "subscription\.findUnique.*userId" backend/src/routes backend/src/middleware 2>/dev/null | wc -l

echo -n "include: { subscription: true } (singular): "
grep -r "include:.*{.*subscription:.*true" backend/src/routes backend/src/middleware 2>/dev/null | grep -v subscriptions | wc -l

echo -n "Direct subscription.plan access without .name: "
grep -r "subscription\.plan[^.]" backend/src/routes backend/src/middleware 2>/dev/null | grep -v "subscription.plan.name" | grep -v "subscription.plan:" | wc -l

echo ""
echo "✅ Checking for correct patterns (should be > 0):"
echo "---"

echo -n "findFirst with status filter: "
grep -r "findFirst.*status.*ACTIVE" backend/src/routes backend/src/middleware 2>/dev/null | grep subscription | wc -l

echo -n "include: { subscriptions: true } (plural): "
grep -r "include:.*{.*subscriptions:.*true" backend/src/routes backend/src/middleware 2>/dev/null | wc -l

echo -n "subscription.plan.name access: "
grep -r "subscription.*plan\.name" backend/src/routes backend/src/middleware 2>/dev/null | wc -l

echo ""
echo "📊 TypeScript compilation check:"
echo "---"
cd backend && npx tsc --noEmit 2>&1 | grep -i "subscription\|plan" | grep -v node_modules | wc -l
cd ..

echo ""
echo "✅ Verification complete!"
