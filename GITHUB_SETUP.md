# GitHub Repository Setup Guide

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click the **+** icon in the top right corner
3. Select **New repository**
4. Repository name: `ZipsMarket` (or any name you prefer)
5. Description: "University of Akron Student Marketplace"
6. Choose **Public** or **Private** (your choice)
7. **DO NOT** initialize with README, .gitignore, or license (we already have these)
8. Click **Create repository**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these in your terminal:

```bash
# Make sure you're in the ZipsMarket directory
cd /Users/sarmedmahmood/ZipsMarket

# Add all files to git
git add .

# Create initial commit
git commit -m "Initial commit: ZipsMarket setup with React, Supabase, and Stripe integration"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ZipsMarket.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Connect Supabase to GitHub (Optional but Recommended)

1. In your Supabase project dashboard
2. Go to **Settings** > **Integrations**
3. Find **GitHub** and click **Connect**
4. Authorize Supabase to access your GitHub
5. Select your `ZipsMarket` repository
6. This enables automatic deployments and database migrations

## Step 4: Future Commits

After making changes, use these commands:

```bash
# Check what files changed
git status

# Add specific files
git add filename.jsx

# Or add all changes
git add .

# Commit with a message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## Important Notes

- **Never commit your `.env` file** - it contains sensitive keys
- The `.gitignore` file is already set up to exclude `.env`
- Always test locally before pushing to GitHub
- Use meaningful commit messages
