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
          <div class="form-hd__bar" style="background:linear-gradient(90deg,var(--error),#f97316);"></div>
          <h2 class="form-hd__title">Something went wrong</h2>
          <p class="form-hd__sub">An error occurred during your request</p>
        </div>

        <div class="info-card">
          <div class="info-card__icon info-card__icon--error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <#if message?has_content>
          <p class="info-card__msg">${kcSanitize(message.summary)?no_esc}</p>
          </#if>
          <#if client?? && client.baseUrl?has_content>
          <p class="info-card__hint">
            You may <a href="${client.baseUrl}" class="f-link">return to the application</a> and try again.
          </p>
          </#if>
        </div>

        <p class="f-register">
          <a href="${url.loginUrl}" class="f-link">Back to Sign In</a>
        </p>

      </div>
    </main>

  </div>
  </#if>
</@layout.registrationLayout>
