alert("CEO FINAL JS LOADED");

const e = (v = '') =>
  String(v ?? '').replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m])
  );

// =====================================================
// CEO ACCESS CHECK
// =====================================================

(async () => {

  const accessBox =
    document.getElementById('ceoAccess');

  const workspace =
    document.getElementById('ceoWorkspace');

  try {

    if (!accessBox || !workspace) {
      console.error(
        'CEO page elements are missing.'
      );
      return;
    }

    if (
      typeof supabaseClient ===
      'undefined'
    ) {

      accessBox.textContent =
        'System connection is unavailable. Please refresh the page.';

      console.error(
        'supabaseClient is not defined.'
      );

      return;
    }

    accessBox.textContent =
      'Checking CEO access...';

    // ---------------------------------------------
    // CHECK AUTH SESSION
    // ---------------------------------------------

    const {
      data: authData,
      error: authError
    } =
      await supabaseClient
        .auth
        .getUser();

    if (authError) {

      console.error(
        'CEO authentication error:',
        authError
      );

      accessBox.innerHTML =
        'Your session could not be verified. ' +
        '<a href="admin.html">Sign in again</a>.';

      return;
    }

    const user =
      authData?.user;

    if (!user) {

      accessBox.innerHTML =
        'Please <a href="admin.html">sign in</a> first.';

      return;
    }

    // ---------------------------------------------
    // LOAD CEO PROFILE
    // ---------------------------------------------

    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from('admin_users')
        .select(
          'user_id, full_name, email, role, is_active, approval_status'
        )
        .eq(
          'user_id',
          user.id
        )
        .maybeSingle();

    if (profileError) {

      console.error(
        'CEO profile error:',
        profileError
      );

      accessBox.textContent =
        'Unable to verify CEO profile. Please contact system administration.';

      return;
    }

    if (!profile) {

      accessBox.textContent =
        'Your staff profile could not be found.';

      return;
    }

    // ---------------------------------------------
    // ACCOUNT ACTIVE CHECK
    // ---------------------------------------------

    if (
      profile.is_active !== true
    ) {

      accessBox.textContent =
        'Your NEBRIN staff account is currently inactive.';

      return;
    }

    // ---------------------------------------------
    // APPROVAL CHECK
    // ---------------------------------------------

    if (
      profile.approval_status &&
      profile.approval_status !==
        'Approved'
    ) {

      accessBox.textContent =
        'Your account has not been approved for system access.';

      return;
    }

    // ---------------------------------------------
    // CEO ROLE CHECK
    // ---------------------------------------------

    if (
      ![
        'CEO',
        'Super Admin'
      ].includes(
        profile.role
      )
    ) {

      accessBox.textContent =
        'CEO access required.';

      return;
    }

    // ---------------------------------------------
    // ACCESS GRANTED
    // ---------------------------------------------

    accessBox.classList.add(
      'hidden'
    );

    workspace.classList.remove(
      'hidden'
    );

    await loadCEO();

  } catch (error) {

    console.error(
      'CEO access verification failed:',
      error
    );

    if (accessBox) {

      accessBox.textContent =
        'Unable to verify CEO access. Please refresh the page or sign in again.';
    }
  }

})();


// =====================================================
// LOAD CEO DASHBOARD
// =====================================================

async function loadCEO() {

  try {

    const [
      snap,
      att,
      sec,
      reps,
      onl,
      acts
    ] =
      await Promise.all([

        supabaseClient
          .from(
            'department_operations_snapshot'
          )
          .select('*')
          .order(
            'department_name'
          ),

        supabaseClient
          .rpc(
            'company_attendance_today'
          ),

        supabaseClient
          .from(
            'security_incidents'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false
            }
          )
          .limit(50),

        supabaseClient
          .from(
            'management_reports'
          )
          .select(
            '*,departments(name)'
          )
          .order(
            'created_at',
            {
              ascending:
                false
            }
          )
          .limit(50),

        supabaseClient
          .rpc(
            'ceo_online_staff'
          ),

        supabaseClient
          .from(
            'staff_activity_logs'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false
            }
          )
          .limit(30)
      ]);

    // =================================================
    // LOG QUERY ERRORS
    // =================================================

    if (snap.error) {
      console.error(
        'CEO departments error:',
        snap.error
      );
    }

    if (att.error) {
      console.error(
        'CEO attendance error:',
        att.error
      );
    }

    if (sec.error) {
      console.error(
        'CEO security error:',
        sec.error
      );
    }

    if (reps.error) {
      console.error(
        'CEO reports error:',
        reps.error
      );
    }

    if (onl.error) {
      console.error(
        'CEO online staff error:',
        onl.error
      );
    }

    if (acts.error) {
      console.error(
        'CEO activity error:',
        acts.error
      );
    }

    const d =
      snap.data || [];

    const a =
      att.data || [];

    const s =
      sec.data || [];

    const r =
      reps.data || [];

    const o =
      onl.data || [];

    const ac =
      acts.data || [];

    // =================================================
    // CEO STATS
    // =================================================

    const ceoStats =
      document.getElementById(
        'ceoStats'
      );

    if (ceoStats) {

      ceoStats.innerHTML =
        [
          [
            'Departments',
            d.length
          ],

          [
            'Present',
            a.filter(
              x =>
                [
                  'On Time',
                  'Late',
                  'Working'
                ].includes(
                  x.status
                )
            ).length
          ],

          [
            'On Break',
            a.filter(
              x =>
                x.work_status ===
                'On Break'
            ).length
          ],

          [
            'Field Duty',
            a.filter(
              x =>
                x.work_status ===
                'Field Duty'
            ).length
          ],

          [
            'Urgent Work',
            d.reduce(
              (
                n,
                x
              ) =>
                n +
                Number(
                  x.urgent_work ||
                  0
                ),
              0
            )
          ],

          [
            'Critical Security',
            s.filter(
              x =>
                x.severity ===
                  'Critical' &&
                x.status !==
                  'Closed'
            ).length
          ]
        ]
          .map(
            x =>
              `
              <div class="neb-stat">
                <span>${e(x[0])}</span>
                <strong>${e(x[1])}</strong>
              </div>
              `
          )
          .join('');
    }

    // =================================================
    // DEPARTMENT STATUS
    // =================================================

    const ceoDepartments =
      document.getElementById(
        'ceoDepartments'
      );

    if (ceoDepartments) {

      ceoDepartments.innerHTML =
        d.map(
          x =>
            `
            <div class="neb-row">
              <strong>
                ${e(x.department_name)}
              </strong>

              <p>
                HOD:
                ${e(
                  x.hod_name ||
                  'Not assigned'
                )}
                · Staff
                ${e(
                  x.active_staff ||
                  0
                )}
                · Open
                ${e(
                  x.open_work ||
                  0
                )}
                · Urgent
                ${e(
                  x.urgent_work ||
                  0
                )}
                · On Break
                ${e(
                  x.on_break ||
                  0
                )}
              </p>
            </div>
            `
        )
          .join('') ||
        '<p>No department data.</p>';
    }

    // =================================================
    // ATTENDANCE
    // =================================================

    const ceoAttendance =
      document.getElementById(
        'ceoAttendance'
      );

    if (ceoAttendance) {

      ceoAttendance.innerHTML =
        a.map(
          x =>
            `
            <div class="neb-row">
              <strong>
                ${e(x.full_name)}
              </strong>

              <p>
                ${e(x.department)}
                · Attendance:
                ${e(x.status)}
                · Current:
                ${e(
                  x.work_status ||
                  '—'
                )}
              </p>
            </div>
            `
        )
          .join('') ||
        '<p>No attendance records.</p>';
    }

    // =================================================
    // SECURITY
    // =================================================

    const ceoSecurity =
      document.getElementById(
        'ceoSecurity'
      );

    if (ceoSecurity) {

      ceoSecurity.innerHTML =
        s.map(
          x =>
            `
            <div class="neb-row">

              <div class="neb-row-head">

                <strong>
                  ${e(
                    x.incident_number
                  )}
                  —
                  ${e(
                    x.title
                  )}
                </strong>

                <span class="neb-tag ${
                  x.severity ===
                  'Critical'
                    ? 'red'
                    : 'orange'
                }">
                  ${e(
                    x.severity
                  )}
                </span>

              </div>

              <p>

                ${e(
                  x.summary ||
                  ''
                )}

                <br>

                <b>
                  System action:
                </b>

                ${e(
                  x.system_action ||
                  'Logged'
                )}

                <br>

                <b>
                  Recommended:
                </b>

                ${e(
                  x.recommended_action ||
                  'Review evidence and determine next action.'
                )}

              </p>

              <button
                onclick="securityAction('${e(
                  x.id
                )}')"
              >
                CEO Review
              </button>

            </div>
            `
        )
          .join('') ||
        '<p>No security incidents.</p>';
    }

    // =================================================
    // MANAGEMENT REPORTS
    // =================================================

    const ceoReports =
      document.getElementById(
        'ceoReports'
      );

    if (ceoReports) {

      ceoReports.innerHTML =
        r.map(
          x =>
            `
            <div class="neb-row">

              <strong>
                ${e(
                  x.title
                )}
              </strong>

              <p>

                ${e(
                  x.departments
                    ?.name ||
                  ''
                )}

                ·

                ${e(
                  x.report_type
                )}

                ·

                ${e(
                  x.status
                )}

                <br>

                ${e(
                  x.summary ||
                  ''
                )}

              </p>

            </div>
            `
        )
          .join('') ||
        '<p>No management reports.</p>';
    }

    // =================================================
    // ONLINE STAFF
    // =================================================

    const ceoOnline =
      document.getElementById(
        'ceoOnline'
      );

    if (ceoOnline) {

      ceoOnline.innerHTML =
        o.map(
          x =>
            `
            <div class="neb-row">

              <strong>
                ${e(
                  x.full_name
                )}
              </strong>

              <p>

                ${e(
                  x.role
                )}

                ·

                ${e(
                  x.current_page ||
                  'System'
                )}

                ·

                ${
                  x.last_seen_at
                    ? new Date(
                        x.last_seen_at
                      )
                        .toLocaleString()
                    : '—'
                }

              </p>

            </div>
            `
        )
          .join('') ||
        '<p>No staff currently online.</p>';
    }

    // =================================================
    // RECENT EMPLOYEE ACTIVITY
    // =================================================

    const ceoActivity =
      document.getElementById(
        'ceoActivity'
      );

    if (ceoActivity) {

      ceoActivity.innerHTML =
        ac.map(
          x =>
            `
            <div class="neb-row">

              <strong>
                ${e(
                  x.action
                )}
              </strong>

              <p>

                ${e(
                  x.page ||
                  ''
                )}

                ·

                ${
                  x.created_at
                    ? new Date(
                        x.created_at
                      )
                        .toLocaleString()
                    : '—'
                }

              </p>

            </div>
            `
        )
          .join('') ||
        '<p>No recent activity.</p>';
    }

  } catch (error) {

    console.error(
      'CEO dashboard loading failed:',
      error
    );

    const workspace =
      document.getElementById(
        'ceoWorkspace'
      );

    if (workspace) {

      const errorBox =
        document.createElement(
          'div'
        );

      errorBox.className =
        'neb-card';

      errorBox.innerHTML =
        `
        <h2>
          Dashboard loading issue
        </h2>

        <p>
          CEO access was verified, but some dashboard information could not be loaded.
        </p>
        `;

      workspace.prepend(
        errorBox
      );
    }
  }
}


// =====================================================
// CEO SECURITY ACTION
// =====================================================

window.securityAction =
  async function (id) {

    const action =
      prompt(
        'CEO action / decision:',
        'Review and investigate'
      );

    if (!action) {
      return;
    }

    try {

      const {
        error
      } =
        await supabaseClient
          .rpc(
            'ceo_record_security_action',
            {
              p_incident_id:
                id,

              p_action:
                action
            }
          );

      if (error) {

        console.error(
          'CEO security action error:',
          error
        );

        alert(
          error.message
        );

        return;
      }

      await loadCEO();

    } catch (error) {

      console.error(
        'CEO security action failed:',
        error
      );

      alert(
        'Unable to save CEO security action.'
      );
    }
  };