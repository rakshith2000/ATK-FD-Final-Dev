<#import "field.ftl" as field>
<#import "footer.ftl" as loginFooter>
<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <@field.group name="username" label=label>
    <div class="${properties.kcInputGroup}">
      <div class="${properties.kcInputGroupItemClass} ${properties.kcFill}">
        <span class="${properties.kcInputClass} ${properties.kcFormReadOnlyClass}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button"
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </div>
  </@field.group>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${title!}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        <#outputformat "JavaScript">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";
        startSessionPolling(${url.ssoLoginInOtherTabsUrl?c});
        </#outputformat>
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");
            if (!link) return;
            if (link.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
            const { disabledClass } = link.dataset;
            if (disabledClass) link.classList.add(...disabledClass.trim().split(/\s+/));
            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
             <#outputformat "JavaScript">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";
            checkAuthSession(${authenticationSession.authSessionIdHash?c});
            </#outputformat>
        </script>
    </#if>
    <script>
      const isFirefox = true;
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!}" data-page-id="login-${pageId}">

<div class="atk-login-page">

  <!-- ══ LEFT BRANDING PANEL ══════════════════════════════ -->
  <div class="atk-left-panel">
    <div class="atk-left-top">
      <div class="atk-logo">
        <img src="${url.resourcesPath}/img/logo.png" alt="ATK Logo" height="44" style="height:5rem;" />
      </div>
    </div>

    <div class="atk-left-body">
      <p class="atk-tagline">Transform your IT operations with</p>
      <h1 class="atk-title">Autonomous <span class="atk-title-highlight">ITOps</span> Toolkit</h1>
      <p class="atk-bullets">• Automate &nbsp;• Optimize &nbsp;• Scale</p>
      <p class="atk-description">Your intelligent AI assistant for unified, intelligent IT operations — resolving faster, running smarter, built for what's next.</p>
    </div>

    <div class="atk-left-footer">
      <p>© Cognizant. All rights reserved.</p>
    </div>
  </div>

  <!-- ══ RIGHT FORM PANEL ═════════════════════════════════ -->
  <div class="atk-right-panel">
    <div class="atk-form-box">

      <div class="atk-accent-bar"></div>
      <h2 class="atk-welcome-title"><#nested "header"></h2>

      <!-- Alerts / messages -->
      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
          <div class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)}">
              <div class="${properties.kcAlertIconClass!}">
                  <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                  <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                  <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                  <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
              </div>
              <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${message.summary}</span>
          </div>
      </#if>

      <!-- Username (when shown in subsequent step) -->
      <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
        <#if displayRequiredFields>
          <div class="${properties.kcContentWrapperClass!}">
            <div class="${properties.kcLabelWrapperClass!} subtitle">
              <span class="${properties.kcInputHelperTextItemTextClass!}">
                <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
              </span>
            </div>
            <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
              <#nested "show-username">
              <@username />
            </div>
          </div>
        <#else>
          <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
            <#nested "show-username">
            <@username />
          </div>
        </#if>
      <#else>
        <#if displayRequiredFields>
          <div class="${properties.kcContentWrapperClass!}">
            <div class="${properties.kcLabelWrapperClass!} subtitle">
              <span class="${properties.kcInputHelperTextItemTextClass!}">
                <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
              </span>
            </div>
          </div>
        </#if>
      </#if>

      <!-- Main form -->
      <#nested "form">

      <!-- Try another way link -->
      <#if auth?has_content && auth.showTryAnotherWayLink()>
        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="tryAnotherWay" value="on"/>
          <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
              class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                ${msg("doTryAnotherWay")}
          </a>
        </form>
      </#if>

      <#if switchOrganizationEnabled?? && switchOrganizationEnabled>
        <form id="kc-switch-organization-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="switchOrganization" value="true"/>
          <a id="switch-organization" href="javascript:document.forms['kc-switch-organization-form'].requestSubmit()"
              class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                ${msg("doSwitchOrganization")}
          </a>
        </form>
      </#if>

      <!-- Social providers (SSO) — with "or" divider -->
      <#nested "socialProviders">

      <!-- Registration / info band -->
      <#if displayInfo>
        <div id="kc-info">
          <div id="kc-info-wrapper">
            <#nested "info">
          </div>
        </div>
      </#if>

      <@loginFooter.content/>

    </div><!-- /.atk-form-box -->
  </div><!-- /.atk-right-panel -->

</div><!-- /.atk-login-page -->

</body>
</html>
</#macro>