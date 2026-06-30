#!/bin/bash
# Security Script: Remove .env from Git History
# Run this locally in your repository

echo "🔒 Removing .env from Git history..."

# Remove .env from Git tracking (but keep local copy)
git rm --cached .env

# Commit the removal
git commit -m "chore: remove .env from Git history - SECURITY"

# (Optional) If you want to rewrite history to remove it from all commits:
# git filter-branch --tree-filter 'rm -f .env' --prune-empty HEAD

echo "✅ Done! Now push the changes:"
echo "   git push origin main"
echo ""
echo "🔐 IMPORTANT: You must regenerate your Supabase API keys!"
echo "   Visit: https://app.supabase.com/project/_/settings/api"
