# AI Interviewer - Route Verification

## Public Routes
- [x] `/` - Landing page
- [x] `/admin/login` - Platform admin login

## Platform Admin Routes (`/admin/*`)
- [x] `/admin` - Platform dashboard
- [x] `/admin/login` - Platform login
- [x] `/admin/organizations` - Organizations list
- [x] `/admin/organizations/new` - Create org
- [x] `/admin/organizations/[orgId]` - Org details
- [x] `/admin/audit-logs` - Audit logs

## Organization Routes (`/[orgSlug]/*`)

### Status: NEEDS VERIFICATION
These routes compile but may show "Organization Not Found" due to slug resolution issues.

- [ ] `/sist/login` - Org login
- [ ] `/sist/admin` - Org admin dashboard
- [ ] `/sist/admin/students` - Students list
- [ ] `/sist/admin/students/[id]` - Student detail
- [ ] `/sist/admin/register` - Register students
- [ ] `/sist/admin/settings` - Org settings
- [ ] `/sist/student` - Student dashboard
- [ ] `/sist/student/profile` - Student profile
- [ ] `/sist/student/new-interview` - New interview
- [ ] `/sist/student/room/[id]` - Interview room
- [ ] `/sist/student/report/[id]` - Interview report

## Known Issues

### 1. Organization Slug Resolution
**Problem:** `getOrganizationBySlug('sist')` may be returning null

**Root Cause:** 
- Firestore query looks for document in `orgSlugs` collection
- Document may not exist or rules may block access

**Debug Steps:**
1. Open browser console
2. Navigate to `/sist/login` or `/sist/admin`
3. Look for `[OrgLayout]` and `[Firestore]` log messages
4. Check what slug is being queried and if data is returned

**Possible Fixes:**
- Deploy Firestore rules (`firebase deploy --only firestore:rules`)
- Verify `orgSlugs/sist` document exists in Firestore
- Check if `organizations/[orgId]` document exists and has correct data

### 2. Session Management
**Status:** ✅ IMPLEMENTED
- Sessions persist until manual logout
- 48-hour inactivity auto-logout
- Activity tracking working
- Console logs with `[Session]` prefix

## Testing Checklist

### Platform Admin Flow
1. [ ] Go to `/admin/login`
2. [ ] Login with platform credentials
3. [ ] Access `/admin` dashboard
4. [ ] View organizations at `/admin/organizations`
5. [ ] Create org or view org details

### Organization Admin Flow  
1. [ ] Get org slug (e.g., `sist`)
2. [ ] Go to `/sist/login`
3. [ ] Login with org admin credentials
4. [ ] Access `/sist/admin` dashboard
5. [ ] Navigate to students, register, settings

### Student Flow
1. [ ] Go to `/sist/login`
2. [ ] Login with student credentials  
3. [ ] Access `/sist/student` dashboard
4. [ ] Start new interview
5. [ ] View reports

## Console Debug Commands

Check if org exists:
```javascript
// In browser console on any page
const slug = 'sist';
const slugDoc = await firebase.firestore().collection('orgSlugs').doc(slug).get();
console.log('Slug exists:', slugDoc.exists, 'Data:', slugDoc.data());
```

Check last activity:
```javascript
localStorage.getItem('lastActivityTime')
```
