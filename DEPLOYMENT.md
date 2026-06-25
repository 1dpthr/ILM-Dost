# Deployment Guide

This guide covers deploying Ilm Dost to production and creating releases.

## 🚀 Quick Deploy to Vercel (Recommended)

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/1dpthr/ILM-Dost.git)

Click the button above to deploy directly to Vercel.

### Option 2: Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Follow the prompts:**
   - Set up and deploy? Yes
   - Which scope? Your account
   - Link to existing project? No
   - Project name? ilm-dost
   - Directory? ./
   - Override settings? No

Your app will be live at `https://ilm-dost.vercel.app`

## 📦 Build for Production

### Local Build

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Preview the build locally
pnpm preview
```

The built files will be in the `dist/` directory.

### Build Output

- `dist/index.html` - Entry point
- `dist/assets/index-*.css` - Styles (105 KB)
- `dist/assets/index-*.js` - JavaScript bundle (806 KB)

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: Supabase Configuration (for cloud sync)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: AI Service Configuration
VITE_OLLAMA_URL=http://localhost:11434
VITE_AI_SERVICE_URL=your_ai_service_url
```

**Note:** The app works completely without these variables using localStorage.

## 🌐 Alternative Deployment Options

### Netlify

1. Build the project: `pnpm build`
2. Drag and drop the `dist/` folder to [Netlify Drop](https://app.netlify.com/drop)
3. Or use Netlify CLI:
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

### GitHub Pages

1. Install gh-pages: `pnpm add -D gh-pages`
2. Add to package.json scripts:
   ```json
   {
     "scripts": {
       "deploy": "vite build && gh-pages -d dist"
     }
   }
   ```
3. Deploy: `pnpm deploy`

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t ilm-dost .
docker run -p 80:80 ilm-dost
```

## 🏷️ Creating a GitHub Release

### Using GitHub Web Interface

1. Go to your repository: https://github.com/1dpthr/ILM-Dost
2. Click **Releases** → **Create a new release**
3. Fill in:
   - **Tag version**: `v1.0.0`
   - **Release title**: `Ilm Dost v1.0.0 - Initial Release`
   - **Description**: Copy from CHANGELOG.md
4. Click **Publish release**

### Using GitHub CLI (if installed)

```bash
# Create and push tag
git tag v1.0.0
git push origin v1.0.0

# Create release
gh release create v1.0.0 \
  --title "Ilm Dost v1.0.0 - Initial Release" \
  --notes-file CHANGELOG.md
```

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
```

## 📊 Post-Deployment Checklist

- [ ] Verify the site loads correctly
- [ ] Test demo account login
- [ ] Check all features work (dashboard, courses, AI chat, etc.)
- [ ] Test on mobile devices
- [ ] Verify localStorage is working
- [ ] Check browser console for errors
- [ ] Test offline functionality
- [ ] Verify responsive design
- [ ] Check page load performance
- [ ] Test voice assistant (if supported)
- [ ] Verify AI chat responses

## 🔍 Monitoring & Analytics

### Vercel Analytics

Enable in Vercel dashboard:
- Web Vitals
- Analytics
- Speed Insights

### Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics (optional, privacy-focused)

## 🔐 Security Considerations

- ✅ HTTPS enabled (automatic with Vercel)
- ✅ Security headers configured in vercel.json
- ✅ No sensitive data in client-side code
- ✅ Environment variables properly configured
- ✅ CORS settings reviewed
- ✅ Content Security Policy considered

## 📝 Version Management

Current version: **v1.0.0**

Follow semantic versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Update version in:
- `package.json` - version field
- `CHANGELOG.md` - add new section
- Git tags: `git tag v1.x.x`

## 🚨 Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
pnpm install
pnpm build
```

### Deployment Fails

- Check Vercel build logs
- Verify all dependencies are in package.json
- Ensure build command is correct: `pnpm build`
- Check output directory: `dist/`

### App Works Locally but Not in Production

- Check environment variables are set
- Verify all paths are relative
- Test with `pnpm preview` before deploying
- Check browser console for errors

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Deployment](https://create-react-app.dev/docs/deployment/)
- [Tailwind CSS Deployment](https://tailwindcss.com/docs/installation)

## 🎯 Next Steps After Deployment

1. **Custom Domain**: Add your domain in Vercel settings
2. **SSL Certificate**: Automatic with Vercel
3. **CDN**: Automatic with Vercel Edge Network
4. **Monitoring**: Set up uptime monitoring
5. **Backup**: Regular backups of data (if using Supabase)
6. **Updates**: Regular dependency updates
7. **Feedback**: Collect user feedback
8. **Analytics**: Monitor usage patterns

---

**Need Help?** Check the main README.md or open an issue on GitHub.