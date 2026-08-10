// =====================================================
// NEBRIN OVERTIME CONTROL
// CEO / Super Admin Department Overtime Authorization
// Duration: 2 Hours
// =====================================================

(() => {
  "use strict";

  const OVERTIME_HOURS = 2;

  const DEPARTMENTS = [
    "Manager",
    "Secretary",
    "Customer Care",
    "Human Resources",
    "Finance",
    "Business",
    "Legal",
    "Registration",
    "Sales Field",
    "Graphics",
    "IT",
    "Registry",
    "Security",
    "Publishing"
  ];

  let overtimeTimer = null;

  // ===================================================
  // HELPERS
  // ===================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(value) {
    if (!value) {
      return "—";
    }

    try {
      return new Intl.DateTimeFormat(
        "en-TZ",
        {
          timeZone:
            "Africa/Dar_es_Salaam",

          dateStyle:
            "medium",

          timeStyle:
            "short"
        }
      ).format(
        new Date(value)
      );
    } catch {
      return value;
    }
  }

  function getClient() {
    if (
      typeof supabaseClient !==
      "undefined"
    ) {
      return supabaseClient;
    }

    if (
      window.supabaseClient
    ) {
      return window.supabaseClient;
    }

    return null;
  }

  function showMessage(
    message,
    type = "info"
  ) {
    const box =
      document.getElementById(
        "overtimeMessage"
      );

    if (!box) {
      return;
    }

    box.textContent =
      message;

    box.style.marginTop =
      "14px";

    box.style.padding =
      "12px";

    box.style.borderRadius =
      "10px";

    box.style.fontWeight =
      "700";

    if (
      type === "success"
    ) {
      box.style.background =
        "#e8f7ed";

      box.style.color =
        "#176b35";

    } else if (
      type === "error"
    ) {

      box.style.background =
        "#fdeaea";

      box.style.color =
        "#b42318";

    } else {

      box.style.background =
        "#eef4ff";

      box.style.color =
        "#1d4ed8";
    }
  }

  // ===================================================
  // CREATE PANEL
  // ===================================================

  function createOvertimePanel() {

    if (
      document.getElementById(
        "nebrinOvertimeControl"
      )
    ) {
      return;
    }

    const workspace =
      document.getElementById(
        "ceoWorkspace"
      );

    if (!workspace) {
      console.warn(
        "NEBRIN Overtime: ceoWorkspace was not found."
      );
      return;
    }

    const panel =
      document.createElement(
        "article"
      );

    panel.id =
      "nebrinOvertimeControl";

    panel.className =
      "neb-card";

    const options =
      DEPARTMENTS
        .map(
          department =>
            `
            <option value="${escapeHtml(
              department
            )}">
              ${escapeHtml(
                department
              )}
            </option>
            `
        )
        .join("");

    panel.innerHTML = `
      <h2>
        Department Overtime Control
      </h2>

      <p>
        CEO may authorize a department
        to continue working after official
        office hours for exactly
        <strong>
          ${OVERTIME_HOURS} hours
        </strong>.
      </p>

      <div
        style="
          display:grid;
          gap:12px;
          margin-top:18px;
        "
      >

        <label
          for="overtimeDepartment"
        >
          <strong>
            Select Department
          </strong>
        </label>

        <select
          id="overtimeDepartment"
          style="
            width:100%;
            padding:13px;
            border-radius:10px;
            border:1px solid #ccd3df;
          "
        >

          <option value="">
            Choose department
          </option>

          ${options}

        </select>

        <button
          id="grantOvertimeButton"
          type="button"
          class="btn"
          style="
            padding:13px 18px;
            cursor:pointer;
          "
        >
          Grant 2 Hours Overtime
        </button>

        <button
          id="revokeOvertimeButton"
          type="button"
          class="btn"
          style="
            padding:13px 18px;
            cursor:pointer;
          "
        >
          Revoke Overtime
        </button>

      </div>

      <div
        id="overtimeMessage"
      ></div>

      <div
        id="overtimeActiveList"
        style="
          margin-top:20px;
        "
      >
        Loading overtime status...
      </div>
    `;

    workspace.appendChild(
      panel
    );

    document
      .getElementById(
        "grantOvertimeButton"
      )
      ?.addEventListener(
        "click",
        grantOvertime
      );

    document
      .getElementById(
        "revokeOvertimeButton"
      )
      ?.addEventListener(
        "click",
        revokeOvertime
      );
  }

  // ===================================================
  // GRANT OVERTIME
  // ===================================================

  async function grantOvertime() {

    const client =
      getClient();

    if (!client) {
      showMessage(
        "Supabase connection is unavailable.",
        "error"
      );
      return;
    }

    const department =
      document
        .getElementById(
          "overtimeDepartment"
        )
        ?.value;

    if (!department) {
      showMessage(
        "Please select a department first.",
        "error"
      );
      return;
    }

    showMessage(
      `Authorizing ${department}...`
    );

    try {

      const {
        data,
        error
      } =
        await client.rpc(
          "grant_department_overtime",
          {
            p_department:
              department
          }
        );

      if (error) {

        console.error(
          "Grant overtime error:",
          error
        );

        showMessage(
          `${error.message || "Unable to grant overtime."} ${
            error.code
              ? `(Code: ${error.code})`
              : ""
          }`,
          "error"
        );

        return;
      }

      showMessage(
        `${department} has been authorized to work for 2 additional hours.`,
        "success"
      );

      console.log(
        "Overtime granted:",
        data
      );

      await loadOvertimeStatus();

    } catch (error) {

      console.error(
        "Grant overtime exception:",
        error
      );

      showMessage(
        error?.message ||
          "Unable to grant overtime.",
        "error"
      );
    }
  }

  // ===================================================
  // REVOKE OVERTIME
  // ===================================================

  async function revokeOvertime() {

    const client =
      getClient();

    if (!client) {
      showMessage(
        "Supabase connection is unavailable.",
        "error"
      );
      return;
    }

    const department =
      document
        .getElementById(
          "overtimeDepartment"
        )
        ?.value;

    if (!department) {
      showMessage(
        "Please select a department first.",
        "error"
      );
      return;
    }

    showMessage(
      `Revoking ${department} overtime...`
    );

    try {

      const {
        data,
        error
      } =
        await client.rpc(
          "revoke_department_overtime",
          {
            p_department:
              department
          }
        );

      if (error) {

        console.error(
          "Revoke overtime error:",
          error
        );

        showMessage(
          `${error.message || "Unable to revoke overtime."} ${
            error.code
              ? `(Code: ${error.code})`
              : ""
          }`,
          "error"
        );

        return;
      }

      showMessage(
        `${department} overtime authorization has been revoked.`,
        "success"
      );

      console.log(
        "Overtime revoked:",
        data
      );

      await loadOvertimeStatus();

    } catch (error) {

      console.error(
        "Revoke overtime exception:",
        error
      );

      showMessage(
        error?.message ||
          "Unable to revoke overtime.",
        "error"
      );
    }
  }

  // ===================================================
  // LOAD ACTIVE OVERTIME
  // ===================================================

  async function loadOvertimeStatus() {

    const client =
      getClient();

    const container =
      document.getElementById(
        "overtimeActiveList"
      );

    if (
      !container
    ) {
      return;
    }

    if (
      !client
    ) {

      container.innerHTML = `
        <div
          style="
            padding:14px;
            border-radius:10px;
            background:#fdeaea;
            color:#b42318;
          "
        >

          <strong>
            Supabase Connection Error
          </strong>

          <p>
            The database client is unavailable.
          </p>

        </div>
      `;

      return;
    }

    container.innerHTML = `
      <p>
        Loading overtime status...
      </p>
    `;

    try {

      const {
        data,
        error
      } =
        await client
          .from(
            "department_overtime_authorizations"
          )
          .select(
            "department,is_active,granted_at,expires_at"
          )
          .eq(
            "is_active",
            true
          )
          .gt(
            "expires_at",
            new Date()
              .toISOString()
          )
          .order(
            "expires_at",
            {
              ascending:
                true
            }
          );

      // ===============================================
      // SHOW REAL DATABASE ERROR ON SCREEN
      // ===============================================

      if (error) {

        console.error(
          "Overtime status error:",
          error
        );

        container.innerHTML = `
          <div
            style="
              padding:14px;
              border-radius:10px;
              background:#fdeaea;
              color:#b42318;
            "
          >

            <strong>
              Overtime Database Error
            </strong>

            <p>
              ${escapeHtml(
                error.message ||
                "Unknown error"
              )}
            </p>

            <small>
              Code:
              ${escapeHtml(
                error.code ||
                "—"
              )}
            </small>

            ${
              error.details
                ? `
                  <p>
                    <small>
                      Details:
                      ${escapeHtml(
                        error.details
                      )}
                    </small>
                  </p>
                `
                : ""
            }

            ${
              error.hint
                ? `
                  <p>
                    <small>
                      Hint:
                      ${escapeHtml(
                        error.hint
                      )}
                    </small>
                  </p>
                `
                : ""
            }

          </div>
        `;

        return;
      }

      // ===============================================
      // NO ACTIVE OVERTIME
      // ===============================================

      if (
        !data ||
        data.length === 0
      ) {

        container.innerHTML = `
          <h3>
            Active Overtime
          </h3>

          <p>
            No department currently has
            overtime authorization.
          </p>
        `;

        return;
      }

      // ===============================================
      // ACTIVE OVERTIME LIST
      // ===============================================

      container.innerHTML = `
        <h3>
          Active Overtime
        </h3>

        ${data
          .map(
            item => `
              <div
                style="
                  padding:12px;
                  margin-top:10px;
                  border:1px solid #dde3ec;
                  border-radius:10px;
                "
              >

                <strong>
                  ${escapeHtml(
                    item.department
                  )}
                </strong>

                <br>

                <small>
                  Granted:
                  ${escapeHtml(
                    formatTime(
                      item.granted_at
                    )
                  )}
                </small>

                <br>

                <small>
                  Automatically closes:
                  ${escapeHtml(
                    formatTime(
                      item.expires_at
                    )
                  )}
                </small>

              </div>
            `
          )
          .join("")}
      `;

    } catch (error) {

      console.error(
        "Overtime status exception:",
        error
      );

      container.innerHTML = `
        <div
          style="
            padding:14px;
            border-radius:10px;
            background:#fdeaea;
            color:#b42318;
          "
        >

          <strong>
            Overtime System Error
          </strong>

          <p>
            ${escapeHtml(
              error?.message ||
              "Unexpected error occurred."
            )}
          </p>

        </div>
      `;
    }
  }

  // ===================================================
  // INITIALIZE
  // ===================================================

  async function initialize() {

    createOvertimePanel();

    await loadOvertimeStatus();

    if (
      overtimeTimer
    ) {
      clearInterval(
        overtimeTimer
      );
    }

    overtimeTimer =
      setInterval(
        loadOvertimeStatus,
        60000
      );
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();
  }

})();