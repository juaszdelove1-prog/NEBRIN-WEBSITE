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

VERSION 3 IMPROVEMENTS
----------------------
- Customers can attach up to 5 PDF/JPG/PNG documents.
- Maximum file size is 5 MB per document.
- Documents are stored in a private Supabase Storage bucket.
- Only the authorized admin can open documents through temporary signed links.
- Admin can add internal notes to applications.
- Admin can record a quoted fee in TZS.

REQUIRED STEP
-------------
Run v3-migration.sql in Supabase SQL Editor before testing uploads.
Then upload all Version 3 files to the GitHub repository.

VERSION 4 IMPROVEMENTS
----------------------
- Admin can add, edit, activate, deactivate and delete services.
- Admin can define required documents for every service.
- Required documents display automatically when a customer selects a service.
- Each required document has its own upload field.
- Optional documents are marked by adding ? at the end of the document name in Admin.
- Added NIDA Application, M-Pesa Registration, Lipa Number Registration and CRDB Account Opening.
- Service price, description and processing time display automatically to customers.

REQUIRED STEP
-------------
1. Run v4-migration.sql in Supabase SQL Editor.
2. Upload all Version 4 files to GitHub.
3. Wait for Vercel deployment to show Ready.
4. Log in to Admin Dashboard and open Service Management.
