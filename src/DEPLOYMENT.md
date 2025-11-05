# Deployment Guide - Secure File Vault

## Overview

This guide provides step-by-step instructions for deploying the Secure File Vault application to production or staging environments.

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Supabase project created and configured
- [ ] Environment variables documented
- [ ] Database initialized
- [ ] Storage buckets created
- [ ] Authentication providers configured (if using)
- [ ] All tests passing (see TESTING.md)
- [ ] Code reviewed and approved
- [ ] Backup strategy in place

## Environment Setup

### Supabase Configuration

#### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: secure-file-vault
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to users
4. Wait for project initialization (~2 minutes)

#### 2. Configure Environment Variables

The application requires these Supabase environment variables:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**To find these values:**
1. Go to Project Settings > API
2. Copy `Project URL` → `SUPABASE_URL`
3. Copy `anon public` key → `SUPABASE_ANON_KEY`
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

#### 3. Initialize Database

The application uses the built-in KV store table `kv_store_7f2aa9ae`. No additional database setup required.

#### 4. Deploy Edge Function

The backend server runs as a Supabase Edge Function:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy the function
supabase functions deploy make-server-7f2aa9ae
```

**Note**: The function code is in `/supabase/functions/server/index.tsx`

#### 5. Configure Storage

Storage bucket is automatically created on first server startup, but you can create it manually:

1. Go to Storage in Supabase Dashboard
2. Click "New Bucket"
3. Name: `make-7f2aa9ae-files`
4. Set to **Private** (not public)
5. Set file size limit: 10 MB (10485760 bytes)
6. Click "Create Bucket"

#### 6. Configure Authentication

##### Email/Password Authentication (Default)
1. Go to Authentication > Providers
2. Enable "Email" provider
3. Configure email templates (optional)

##### Social Authentication (Optional)
For Google, GitHub, etc.:

1. Go to Authentication > Providers
2. Enable desired provider
3. Follow Supabase docs for each provider:
   - [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
   - [GitHub OAuth](https://supabase.com/docs/guides/auth/social-login/auth-github)
   - [More providers](https://supabase.com/docs/guides/auth/social-login)

**⚠️ Important**: If using social auth, inform users to complete provider setup.

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Add:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Connect Repository**
   - Go to Netlify Dashboard
   - Click "Add new site" > "Import an existing project"
   - Connect your Git repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Configure Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

4. **Deploy**
   - Click "Deploy site"

### Option 3: Static Hosting (AWS S3, Azure, GCP)

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder to your hosting service**

3. **Configure Environment Variables**
   - Update `/utils/supabase/info.tsx` with production values
   - Rebuild application

### Option 4: Docker (Self-hosted)

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "run", "preview"]
   ```

2. **Build and Run**
   ```bash
   docker build -t secure-file-vault .
   docker run -p 3000:3000 secure-file-vault
   ```

## Post-Deployment Tasks

### 1. Verify Deployment

Test all critical paths:
- [ ] User signup
- [ ] User signin
- [ ] File upload
- [ ] File download
- [ ] File deletion
- [ ] Search functionality
- [ ] Admin panel (if admin user exists)

### 2. Create Initial Admin User

```bash
# Use the application UI
1. Navigate to signup page
2. Create account with admin checkbox checked
3. Verify admin access in application
```

### 3. Configure Domain (Optional)

#### For Vercel:
1. Go to Project > Settings > Domains
2. Add your custom domain
3. Follow DNS configuration instructions

#### For Netlify:
1. Go to Domain Settings
2. Add custom domain
3. Configure DNS records

### 4. Enable HTTPS

Most hosting providers (Vercel, Netlify) provide automatic HTTPS. For self-hosted:

1. Obtain SSL certificate (Let's Encrypt recommended)
2. Configure reverse proxy (nginx, Apache)
3. Redirect HTTP to HTTPS

### 5. Set Up Monitoring

#### Application Monitoring
- Use Supabase Dashboard for:
  - Database queries
  - Storage usage
  - Edge function logs
  - Authentication metrics

#### Frontend Monitoring (Optional)
Consider integrating:
- **Sentry**: Error tracking
- **Google Analytics**: User analytics
- **LogRocket**: Session replay

### 6. Configure Backups

#### Database Backups
- Supabase provides automatic backups
- Configure backup retention in Supabase Dashboard
- Test restore procedure

#### Storage Backups
- Configure Supabase Storage backup policy
- Consider periodic exports

### 7. Security Hardening

#### Rate Limiting
- Verify rate limiting is working (2 req/sec)
- Monitor for abuse
- Adjust limits if needed in server code

#### CORS Configuration
- Production: Update CORS to specific domains
- Edit `/supabase/functions/server/index.tsx`:
  ```typescript
  cors({
    origin: "https://yourdomain.com",
    // ... rest of config
  })
  ```

#### Environment Variables
- ✅ Never commit `SUPABASE_SERVICE_ROLE_KEY` to Git
- ✅ Use environment variables for all secrets
- ✅ Rotate keys periodically

### 8. Performance Optimization

#### Frontend
- Enable CDN (most platforms do this automatically)
- Optimize images
- Enable gzip/brotli compression

#### Backend
- Monitor edge function performance
- Optimize database queries if needed
- Consider caching strategies

## Scaling Considerations

### Database Scaling
- Supabase handles automatic scaling
- Monitor connection pool usage
- Consider read replicas for high traffic

### Storage Scaling
- Supabase Storage scales automatically
- Monitor bandwidth usage
- Consider CDN for file downloads

### Edge Function Scaling
- Serverless architecture auto-scales
- Monitor function invocations
- Optimize code for cold starts

## Configuration Reference

### Storage Quotas

Default: 10 MB per user

To change, edit `/supabase/functions/server/index.tsx`:
```typescript
const DEFAULT_STORAGE_LIMIT = 50 * 1024 * 1024; // 50 MB
```

### Rate Limits

Default: 2 requests per second

To change:
```typescript
const DEFAULT_RATE_LIMIT = 5; // 5 requests per second
```

### File Size Limits

Storage bucket limit: 10 MB

To change:
1. Go to Supabase Dashboard > Storage > Bucket Settings
2. Update file size limit
3. Update `DEFAULT_STORAGE_LIMIT` accordingly

## Rollback Procedure

If deployment fails:

1. **Frontend Rollback**
   ```bash
   # Vercel
   vercel rollback
   
   # Netlify
   # Use dashboard to restore previous deploy
   ```

2. **Backend Rollback**
   ```bash
   # Redeploy previous version
   supabase functions deploy make-server-7f2aa9ae --legacy-bundle
   ```

3. **Database Rollback**
   - Use Supabase backup restore
   - Contact Supabase support if needed

## Troubleshooting

### Issue: Files not uploading

**Check:**
- Storage bucket exists
- Bucket is private (not public)
- Service role key is correct
- Edge function is deployed

### Issue: Authentication fails

**Check:**
- Email provider enabled in Supabase
- Correct SUPABASE_ANON_KEY
- User exists in auth.users table

### Issue: Rate limit errors

**Check:**
- Rate limit value in server code
- User quota data in database
- Edge function logs

### Issue: Admin panel not visible

**Check:**
- User has `is_admin: true` in metadata
- Check user creation process
- Verify admin flag in signup

## Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] HTTPS enabled and working
- [ ] Custom domain configured (if applicable)
- [ ] Backups configured and tested
- [ ] Monitoring and logging set up
- [ ] Error tracking enabled
- [ ] Rate limiting tested
- [ ] Storage quotas configured
- [ ] Admin user created
- [ ] Full test suite passed
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Team trained on deployment process
- [ ] Rollback procedure tested
- [ ] Support contacts documented

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check system health
- Review rate limit violations

**Weekly:**
- Review storage usage
- Check for failed uploads
- Review user feedback

**Monthly:**
- Database cleanup (if needed)
- Performance review
- Security updates
- Dependency updates

### Updates and Upgrades

1. Test in staging environment
2. Create database backup
3. Deploy during low-traffic period
4. Monitor logs after deployment
5. Be ready to rollback if issues arise

## Support and Documentation

### Internal Documentation
- [ ] Deployment runbook
- [ ] Incident response plan
- [ ] Contact list (Supabase support, team members)
- [ ] Architecture diagrams
- [ ] API documentation

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [React Documentation](https://react.dev)

## Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups (Supabase)
- **Files**: Continuous replication (Supabase Storage)
- **Code**: Git repository

### Recovery Time Objective (RTO)
- Target: < 1 hour for full restoration

### Recovery Point Objective (RPO)
- Target: < 15 minutes of data loss

### Recovery Procedure
1. Assess damage and impact
2. Notify stakeholders
3. Restore from backup
4. Verify data integrity
5. Resume operations
6. Post-incident review

## Cost Estimation

### Supabase Costs (approximate)
- **Free Tier**: Up to 500 MB database, 1 GB storage
- **Pro Tier** ($25/mo): 8 GB database, 100 GB storage
- **Team Tier** ($599/mo): Dedicated resources

### Hosting Costs
- **Vercel**: Free for personal, $20+/mo for team
- **Netlify**: Free for personal, $19+/mo for team
- **Self-hosted**: Variable (server + bandwidth)

### Scaling Costs
Monitor and adjust based on:
- Number of active users
- Storage consumption
- Bandwidth usage
- Edge function invocations

## Compliance and Legal

### Data Privacy
- GDPR compliance (if applicable)
- Data retention policies
- User data deletion procedures

### Terms of Service
- Create and publish ToS
- Privacy policy
- Acceptable use policy

## Conclusion

Following this deployment guide ensures a smooth, secure, and maintainable production deployment of the Secure File Vault system. Always test thoroughly before deploying to production, and maintain proper monitoring and backup procedures.

For issues or questions, refer to the troubleshooting section or consult the development team.
