-- AlterTable
-- Add planAccess and userOverrides fields to FeatureFlag table
ALTER TABLE "FeatureFlag" ADD COLUMN "planAccess" JSONB,
ADD COLUMN "userOverrides" JSONB;
