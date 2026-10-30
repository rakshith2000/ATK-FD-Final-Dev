<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

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
          <h2 class="form-hd__title">
            <#if message?has_content && message.type = 'success'>Check your inbox
            <#else>Information</#if>
          </h2>
        </div>

        <div class="info-card">
          <div class="info-card__icon info-card__icon--<#if message?has_content && message.type = 'success'>success<#elseif message?has_content && message.type = 'warning'>warn<#else>info</#if>">
            <#if message?has_content && message.type = 'success'>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            <#elseif message?has_content && message.type = 'warning'>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            <#else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </#if>
          </div>

          <#if message?has_content>
          <p class="info-card__msg">${kcSanitize(message.summary)?no_esc}</p>
          </#if>

          <#if requiredActions??>
          <ul class="info-card__actions">
            <#list requiredActions as action>
            <li>${msg("requiredAction.${action}")}</li>
            </#list>
          </ul>
          </#if>
        </div>

        <#if skipLink??>
        <p class="f-register">
          <a href="${skipLink}" class="f-btn" style="display:inline-flex;text-decoration:none;">
            Continue
            <svg viewBox="0 0 20 20" fill="currentColor" style="width:17px;height:17px;">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </a>
        </p>
        <#else>
        <p class="f-register">
          <a href="${url.loginUrl}" class="f-link">Back to Sign In</a>
        </p>
        </#if>

      </div>
    </main>

  </div>
  </#if>
</@layout.registrationLayout>
