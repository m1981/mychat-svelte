#!/bin/bash
# 🚀 DEPLOYMENT GUIDE - Better ChatGPT API Completion
# Run this script to deploy all missing API endpoints

set -e  # Exit on error

echo "╔════════════════════════════════════════════════╗"
echo "║   Better ChatGPT - API Deployment Script      ║"
echo "║   Deploying 6 missing endpoint implementations ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from your project root."
    exit 1
fi

echo "✓ Project root detected"
echo ""

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p src/lib/server/repositories
mkdir -p src/lib/server/services
mkdir -p src/routes/api/folders/[id]
mkdir -p src/routes/api/chats/[id]
mkdir -p src/routes/api/references/resolve
echo "✓ Directories created"
echo ""

# Deploy files
echo "📦 Deploying repository layer..."
if [ -f "/home/claude/folder.repository.ts" ]; then
    cp /home/claude/folder.repository.ts src/lib/server/repositories/folder.repository.ts
    echo "  ✓ folder.repository.ts"
fi

if [ -f "/home/claude/tag.repository.updated.ts" ]; then
    cp /home/claude/tag.repository.updated.ts src/lib/server/repositories/tag.repository.ts
    echo "  ✓ tag.repository.ts (updated)"
fi

echo ""
echo "📦 Deploying service layer..."
if [ -f "/home/claude/folder.service.ts" ]; then
    cp /home/claude/folder.service.ts src/lib/server/services/folder.service.ts
    echo "  ✓ folder.service.ts"
fi

echo ""
echo "📦 Deploying API endpoints..."
if [ -f "/home/claude/api-folders-index.ts" ]; then
    cp /home/claude/api-folders-index.ts src/routes/api/folders/+server.ts
    echo "  ✓ /api/folders"
fi

if [ -f "/home/claude/api-folders-id.ts" ]; then
    cp /home/claude/api-folders-id.ts src/routes/api/folders/[id]/+server.ts
    echo "  ✓ /api/folders/[id]"
fi

if [ -f "/home/claude/api-chats-index.ts" ]; then
    cp /home/claude/api-chats-index.ts src/routes/api/chats/+server.ts
    echo "  ✓ /api/chats"
fi

if [ -f "/home/claude/api-chats-id.ts" ]; then
    cp /home/claude/api-chats-id.ts src/routes/api/chats/[id]/+server.ts
    echo "  ✓ /api/chats/[id]"
fi

if [ -f "/home/claude/api-references-resolve.ts" ]; then
    cp /home/claude/api-references-resolve.ts src/routes/api/references/resolve/+server.ts
    echo "  ✓ /api/references/resolve"
fi

if [ -f "/home/claude/api-sidebar.ts" ]; then
    cp /home/claude/api-sidebar.ts src/routes/api/sidebar/+server.ts
    echo "  ✓ /api/sidebar"
fi

echo ""
echo "✅ All files deployed successfully!"
echo ""

# Verify files
echo "🔍 Verifying deployment..."
MISSING=0

check_file() {
    if [ ! -f "$1" ]; then
        echo "  ❌ Missing: $1"
        MISSING=$((MISSING + 1))
    else
        echo "  ✓ $1"
    fi
}

check_file "src/lib/server/repositories/folder.repository.ts"
check_file "src/lib/server/services/folder.service.ts"
check_file "src/routes/api/folders/+server.ts"
check_file "src/routes/api/folders/[id]/+server.ts"
check_file "src/routes/api/chats/+server.ts"
check_file "src/routes/api/chats/[id]/+server.ts"
check_file "src/routes/api/references/resolve/+server.ts"
check_file "src/routes/api/sidebar/+server.ts"

echo ""

if [ $MISSING -gt 0 ]; then
    echo "⚠️  Warning: $MISSING files are missing"
    echo "   Please manually copy them from /home/claude/"
    exit 1
fi

echo "═══════════════════════════════════════════════"
echo "  🎉 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start development server:"
echo "   npm run dev"
echo ""
echo "2. Test the new endpoints:"
echo ""
echo "   # List all folders"
echo "   curl http://localhost:5173/api/folders"
echo ""
echo "   # Get folder tree"
echo "   curl http://localhost:5173/api/folders?tree=true"
echo ""
echo "   # List all chats"
echo "   curl http://localhost:5173/api/chats"
echo ""
echo "   # Get sidebar data for a chat"
echo "   curl http://localhost:5173/api/sidebar?chatId=chat-1"
echo ""
echo "   # Resolve references"
echo "   curl -X POST http://localhost:5173/api/references/resolve \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"references\": []}'
echo ""
echo "3. Check the logs for any errors"
echo ""
echo "4. Review TODO comments in the code:"
echo "   grep -r 'TODO:' src/routes/api/"
echo ""
echo "═══════════════════════════════════════════════"
echo "  ⚠️  IMPORTANT REMINDERS"
echo "═══════════════════════════════════════════════"
echo ""
echo "1. Authentication: All endpoints currently use userId=1"
echo "   - Search for 'TODO: Get userId from session' and implement auth"
echo ""
echo "2. Database: Ensure your database is up to date"
echo "   - Run: npm run db:push"
echo ""
echo "3. Semantic Search: Not yet implemented"
echo "   - Text search works fine"
echo "   - See /home/claude/semantic-search-notes.ts for implementation guide"
echo ""
echo "4. Environment Variables: Ensure these are set:"
echo "   - DATABASE_URL"
echo "   - OPENAI_API_KEY (optional, for embeddings)"
echo "   - ANTHROPIC_API_KEY"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "Happy coding! 🚀"
echo ""
