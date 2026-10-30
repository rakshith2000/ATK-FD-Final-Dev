<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username'); section>

  <#if section = "header">
    <span style="display:none;">Autonomous ITOps Toolkit</span>

  <#elseif section = "form">
  <div class="aiot-page">

    <aside class="brand-panel">
      <div class="brand-bg-dots"></div>
      <div class="brand-glow brand-glow--1"></div>
      <div class="brand-glow brand-glow--2"></div>
      <div class="brand-inner">
        <div class="brand-logo">
          <img src="${url.resourcesPath}/img/logo.png" alt="Cognizant"
               onerror="this.src='${url.resourcesPath}/img/logo.svg'; this.onerror=null;" />
        </div>
        <div class="brand-hero">
          <p class="brand-eyebrow">Transform Your IT Operations with</p>
          <h1 class="brand-title">Autonomous <span class="brand-title--cyan">ITOps</span> Toolkit</h1>
          <p class="brand-desc">A unified, AI-powered toolkit to automate, optimize, and scale IT operations. Enable intelligent workflows, faster resolution, and resilient operations.</p>
        </div>
        <p class="brand-copy">© Cognizant. All rights reserved.</p>
      </div>
    </aside>

    <main class="form-panel">
      <div class="form-inner">

        <div class="form-hd">
          <div class="form-hd__bar"></div>
          <h2 class="form-hd__title">Update your profile</h2>
          <p class="form-hd__sub">Please review and complete your account details</p>
        </div>

        <#if messagesPerField.existsError('firstName','lastName','email','username')>
        <div class="f-alert">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span>${kcSanitize(messagesPerField.getFirstError('firstName','lastName','email','username'))?no_esc}</span>
        </div>
        </#if>

        <form id="kc-update-profile-form" class="f-form" action="${url.loginAction}" method="post">

          <!-- First Name + Last Name -->
          <#if user.editUsernameAllowed?? || true>
          <div class="f-row">
            <div class="f-field">
              <label class="f-label" for="firstName">First Name</label>
              <div class="f-wrap">
                <svg class="f-ico" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
                <input id="firstName"
                  class="f-input <#if messagesPerField.existsError('firstName')>f-input--err</#if>"
                  name="firstName" type="text"
                  value="${(user.firstName!'')}"
                  placeholder="First name" autofocus />
              </div>
              <#if messagesPerField.existsError('firstName')>
                <span class="f-field-err">${kcSanitize(messagesPerField.getFirstError('firstName'))?no_esc}</span>
              </#if>
            </div>

            <div class="f-field">
              <label class="f-label" for="lastName">Last Name</label>
              <div class="f-wrap">
                <svg class="f-ico" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
                <input id="lastName"
                  class="f-input <#if messagesPerField.existsError('lastName')>f-input--err</#if>"
                  name="lastName" type="text"
                  value="${(user.lastName!'')}"
                  placeholder="Last name" />
              </div>
              <#if messagesPerField.existsError('lastName')>
                <span class="f-field-err">${kcSanitize(messagesPerField.getFirstError('lastName'))?no_esc}</span>
              </#if>
            </div>
          </div>
          </#if>

          <!-- Username -->
          <#if realm.editUsernameAllowed>
          <div class="f-field">
            <label class="f-label" for="username">Username</label>
            <div class="f-wrap">
              <svg class="f-ico" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
              </svg>
              <input id="username"
                class="f-input <#if messagesPerField.existsError('username')>f-input--err</#if>"
                name="username" type="text"
                value="${(user.username!'')}"
                autocomplete="username"
                placeholder="Username" />
            </div>
            <#if messagesPerField.existsError('username')>
              <span class="f-field-err">${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}</span>
            </#if>
          </div>
          </#if>

          <!-- Email -->
          <div class="f-field">
            <label class="f-label" for="email">Email</label>
            <div class="f-wrap">
              <svg class="f-ico" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              <input id="email"
                class="f-input <#if messagesPerField.existsError('email')>f-input--err</#if>"
                name="email" type="email"
                value="${(user.email!'')}"
                autocomplete="email"
                placeholder="Email address" />
            </div>
            <#if messagesPerField.existsError('email')>
              <span class="f-field-err">${kcSanitize(messagesPerField.getFirstError('email'))?no_esc}</span>
            </#if>
          </div>

          <button type="submit" id="kc-update-profile" class="f-btn">
            Save Changes
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>

        </form>

      </div>
    </main>

  </div>
  </#if>
</@layout.registrationLayout>
