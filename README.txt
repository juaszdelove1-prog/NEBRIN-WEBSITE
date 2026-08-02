NEBRIN SUPABASE + VERCEL WEBSITE
=================================

Already configured:
- Supabase URL: https://oguukuhflamwmgrbdqfk.supabase.co
- Publishable key: included in supabase-config.js
- Direct website application storage
- WhatsApp applications
- Email applications
- Staff login and admin dashboard
- Status management: New, Processing, Completed, Rejected

REQUIRED SUPABASE SETUP
1. Open your Supabase project.
2. Open SQL Editor.
3. Copy and run all content from supabase-setup.sql.
4. Open Authentication > Users > Add user.
5. Create a staff login using an email and strong password.
6. Copy the new user's UUID.
7. In SQL Editor run:
   insert into public.admin_users (user_id, full_name, role)
   values ('USER-UUID', 'Justine Asajile Mwalusako', 'CEO');

VERCEL DEPLOYMENT
1. Replace the files in your GitHub/Vercel project with these files.
2. Commit and push to the main branch.
3. Vercel will deploy automatically.
4. Open:
   https://www.nebrinonlineonesignal.com
5. Staff dashboard:
   https://www.nebrinonlineonesignal.com/admin

SECURITY
- The publishable key is safe to use in the browser when RLS policies are enabled.
- Never place the Supabase secret/service-role key in these files.
- Use strong staff passwords and enable HTTPS.

V2 IMPROVEMENTS
- CEO dashboard statistics
- Better mobile dashboard
- Customer tracking by reference + phone
- Forgot-password link

Run v2-migration.sql in Supabase SQL Editor before using tracking.
Supabase Authentication > URL Configuration:
Site URL: https://www.nebrinonlineonesignal.com
Redirect URL: https://www.nebrinonlineonesignal.com/admin.html
